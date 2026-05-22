export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import DocumentUpload from './components/DocumentUpload';
import DeleteProjectButton from './components/DeleteProjectButton';
import DeleteInvoiceButton from './components/DeleteInvoiceButton';
import DeleteDocumentButton from './components/DeleteDocumentButton';
import SigningLink from './components/SigningLink';
import {
  createInvoiceAction,
  markInvoicePaidAction,
  generateStripePaymentLinkAction,
  generatePortalLinkAction,
  sendPortalEmailAction,
  advanceRevisionStageAction,
  markAsLaunchedAction,
} from '@/app/admin/projects/actions';

export default async function ProjectHubPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [
    projectResult,
    contractResult,
    { data: invoices },
    { data: documents },
    { data: portalSessions },
    { data: intakeSubmissions },
  ] = await Promise.all([
    supabase.from('projects').select('*, clients(*)').eq('id', id).single(),
    supabase.from('contracts').select('*').eq('project_id', id).maybeSingle(),
    supabase.from('invoices').select('*').eq('project_id', id).order('created_at'),
    supabase.from('documents').select('*').eq('project_id', id).order('created_at'),
    supabase
      .from('portal_sessions')
      .select('*')
      .eq('project_id', id)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1),
    supabase
      .from('intake_submissions')
      .select('*, intake_files(*)')
      .eq('project_id', id)
      .order('created_at', { ascending: false }),
  ]);

  const project = projectResult.data as any;
  const contract = contractResult.data as any;

  if (!project) notFound();

  const client = (project as any).clients;
  const activeSession = portalSessions?.[0] ?? null;
  const portalUrl = activeSession
    ? `${process.env.NEXT_PUBLIC_APP_URL}/portal/${activeSession.token}`
    : null;

  const revisionStage = project?.revision_stage ?? 'awaiting_intake';
  const projectType = project?.project_type ?? 'website';
  const isTool = projectType === 'tool' || projectType === 'website_tool';

  const draftWord = projectType === 'website_tool' ? 'Build & Draft' : isTool ? 'Build' : 'Draft';
  const REVISION_STAGE_LABEL: Record<string, string> = {
    awaiting_intake:          'Awaiting Intake',
    intake_received:          `Intake Received — Ready for ${draftWord} 1`,
    revision_1_open:          `${draftWord} 1 Sent — Awaiting Client Review`,
    revision_1_received:      `${draftWord} 1 Feedback Received — Ready for ${draftWord} 2`,
    revision_2_open:          `${draftWord} 2 Sent — Awaiting Client Review`,
    revision_2_received:      `${draftWord} 2 Feedback Received — Ready for Final`,
    post_final_open:          'Final Sent — Awaiting Client Approval',
    extra_revision_requested: 'Extra Revision Requested — Ready to Re-send Final',
    complete:                 'Complete',
  };

  const CAN_SEND_DRAFT: Record<string, string> = {
    intake_received: `Send ${draftWord} 1`,
    revision_1_received: `Send ${draftWord} 2`,
    revision_2_received: 'Send Final',
    extra_revision_requested: 'Re-send Final',
  };

  // Generate signed URLs for intake files
  const service = createServiceClient();
  const intakeWithUrls = await Promise.all(
    (intakeSubmissions ?? []).map(async (sub: any) => ({
      ...sub,
      intake_files: await Promise.all(
        (sub.intake_files ?? []).map(async (f: any) => {
          const { data } = await service.storage
            .from('intake')
            .createSignedUrl(f.file_url, 3600);
          return { ...f, signedUrl: data?.signedUrl ?? null };
        })
      ),
    }))
  );

  // Generate signed URLs for documents
  const docsWithUrls = await Promise.all(
    (documents || []).map(async (doc: any) => {
      const { data } = await service.storage
        .from('documents')
        .createSignedUrl(doc.file_url, 3600);
      return { ...doc, signedUrl: data?.signedUrl ?? null };
    })
  );

  return (
    <>
      <div className="admin-topbar">
        <span className="topbar-title">{project.title}</span>
        <div className="topbar-actions">
          <Link href={`/admin/projects/${id}/edit`} className="btn btn-ghost btn-sm">Edit</Link>
          <DeleteProjectButton id={id} />
        </div>
      </div>

      <div className="admin-content">
        <Link href={`/admin/clients/${project.client_id}`} className="back-link">← {client?.name}</Link>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>{project.title}</h1>
          <span className={`badge badge-${project.stage}`}>{project.stage}</span>
          <span className="badge badge-draft" style={{ fontSize: 11, opacity: 0.8 }}>
            {projectType === 'website' ? 'Website' : projectType === 'tool' ? 'Custom Tool' : 'Website + Tool'}
          </span>
        </div>

        {/* ── Contract ─────────────────────────────────────────────────────── */}
        <div className="hub-section">
          <div className="hub-section-header">
            <span className="section-title">Contract</span>
            {contract?.signed_at ? (
              <span className="badge badge-accepted">Signed</span>
            ) : contract ? (
              <span className="badge badge-sent">Awaiting Signature</span>
            ) : (
              <span className="badge badge-draft">Not Sent</span>
            )}
          </div>
          <div className="hub-section-body">
            {!contract ? (
              <p style={{ fontSize: 13, color: 'var(--muted)' }}>
                Contract is auto-created when a project is saved. If missing, check the{' '}
                <a href="/admin/settings/contract" style={{ color: 'var(--accent-lt)' }}>contract template</a>.
              </p>
            ) : contract.signed_at ? (
              <div className="detail-grid">
                <div className="detail-item"><label>Signed By</label><span>{contract.signature_name}</span></div>
                <div className="detail-item"><label>Signed On</label><span>{new Date(contract.signed_at).toLocaleString('en-US', { timeZone: 'America/Chicago' })}</span></div>
                {contract.sign_email_sent_at && (
                  <div className="detail-item"><label>Sent</label><span>{new Date(contract.sign_email_sent_at).toLocaleDateString('en-US', { timeZone: 'America/Chicago' })}</span></div>
                )}
              </div>
            ) : (
              <div>
                <div className="detail-grid" style={{ marginBottom: 14 }}>
                  {contract.sign_email_sent_at && (
                    <div className="detail-item"><label>Email Sent</label><span>{new Date(contract.sign_email_sent_at).toLocaleDateString('en-US', { timeZone: 'America/Chicago' })}</span></div>
                  )}
                </div>
                <div>
                  <label className="form-label" style={{ marginBottom: 8 }}>Signing Link</label>
                  <SigningLink url={`${process.env.NEXT_PUBLIC_APP_URL}/sign/${contract.sign_token}`} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Invoices ─────────────────────────────────────────────────────── */}
        <div className="hub-section">
          <div className="hub-section-header">
            <span className="section-title">Invoices ({invoices?.length ?? 0})</span>
          </div>
          <div className="hub-section-body">
            {/* Existing invoices */}
            {(invoices || []).length > 0 && (
              <div className="table-wrap" style={{ marginBottom: 20 }}>
                <table>
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Amount</th>
                      <th>Due</th>
                      <th>Status</th>
                      <th>Payment Link</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(invoices || []).map((inv: any) => (
                      <tr key={inv.id}>
                        <td style={{ textTransform: 'capitalize' }}>{inv.type}</td>
                        <td>${Number(inv.amount).toFixed(2)}</td>
                        <td style={{ color: 'var(--muted)' }}>
                          {inv.due_date ? new Date(inv.due_date).toLocaleDateString('en-US', { timeZone: 'America/Chicago' }) : '—'}
                        </td>
                        <td><span className={`badge badge-${inv.status}`}>{inv.status}</span></td>
                        <td>
                          {inv.stripe_payment_url ? (
                            <a href={inv.stripe_payment_url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">
                              Stripe ↗
                            </a>
                          ) : (
                            <form action={generateStripePaymentLinkAction} style={{ display: 'inline' }}>
                              <input type="hidden" name="invoice_id" value={inv.id} />
                              <input type="hidden" name="project_id" value={id} />
                              <button type="submit" className="btn btn-ghost btn-sm">Generate Link</button>
                            </form>
                          )}
                        </td>
                        <td style={{ display: 'flex', gap: 6 }}>
                          {inv.status === 'unpaid' && (
                            <form action={markInvoicePaidAction} style={{ display: 'inline' }}>
                              <input type="hidden" name="invoice_id" value={inv.id} />
                              <input type="hidden" name="project_id" value={id} />
                              <button type="submit" className="btn btn-ghost btn-sm" style={{ color: 'var(--green)' }}>Mark Paid</button>
                            </form>
                          )}
                          <DeleteInvoiceButton invoiceId={inv.id} projectId={id} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Add invoice form */}
            <div style={{ borderTop: invoices?.length ? '1px solid var(--border)' : 'none', paddingTop: invoices?.length ? 16 : 0 }}>
              <p className="section-title" style={{ marginBottom: 12 }}>Add Invoice</p>
              <form action={createInvoiceAction}>
                <input type="hidden" name="project_id" value={id} />
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Amount ($)</label>
                    <input name="amount" type="number" step="0.01" min="0" required placeholder="0.00" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Type</label>
                    <select name="type">
                      <option value="deposit">Deposit</option>
                      <option value="final">Final</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Due Date</label>
                    <input name="due_date" type="date" />
                  </div>
                </div>
                <div className="form-actions">
                  <button type="submit" className="btn btn-primary btn-sm">Add Invoice</button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* ── Intake ───────────────────────────────────────────────────────── */}
        <div className="hub-section">
          <div className="hub-section-header">
            <span className="section-title">Intake ({intakeWithUrls.length})</span>
            <span className={`badge badge-${revisionStage === 'complete' ? 'accepted' : revisionStage.includes('received') ? 'sent' : 'draft'}`}>
              {REVISION_STAGE_LABEL[revisionStage]}
            </span>
          </div>
          <div className="hub-section-body">
            {/* Draft URL display when not in send-draft state */}
            {!CAN_SEND_DRAFT[revisionStage] && (project.draft_url || project.tool_draft_url) && (
              <div style={{ marginBottom: 16, fontSize: 13, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {project.draft_url && (
                  <div>
                    <label className="form-label" style={{ marginBottom: 4 }}>
                      {projectType === 'website_tool' ? 'Website URL' : 'Draft URL'}
                    </label>
                    <a href={project.draft_url} target="_blank" rel="noopener noreferrer"
                      style={{ color: 'var(--accent-lt)', wordBreak: 'break-all' }}>
                      {project.draft_url} ↗
                    </a>
                  </div>
                )}
                {projectType === 'website_tool' && project.tool_draft_url && (
                  <div>
                    <label className="form-label" style={{ marginBottom: 4 }}>Tool Build URL</label>
                    <a href={project.tool_draft_url} target="_blank" rel="noopener noreferrer"
                      style={{ color: 'var(--accent-lt)', wordBreak: 'break-all' }}>
                      {project.tool_draft_url} ↗
                    </a>
                  </div>
                )}
              </div>
            )}

            {CAN_SEND_DRAFT[revisionStage] && (
              <form action={advanceRevisionStageAction} style={{ marginBottom: 20 }}>
                <input type="hidden" name="project_id" value={id} />
                <input type="hidden" name="current_stage" value={revisionStage} />
                <div className="form-group" style={{ marginBottom: 12 }}>
                  <label className="form-label">
                    {projectType === 'website_tool' ? 'Website Preview URL' : 'Draft Preview URL'}{' '}
                    <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(optional — included in client email)</span>
                  </label>
                  <input
                    name="draft_url"
                    type="url"
                    placeholder="https://your-project.vercel.app"
                    defaultValue={project.draft_url ?? ''}
                    style={{ maxWidth: 420 }}
                  />
                </div>
                {projectType === 'website_tool' && (
                  <div className="form-group" style={{ marginBottom: 12 }}>
                    <label className="form-label">
                      Tool Build URL{' '}
                      <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(optional)</span>
                    </label>
                    <input
                      name="tool_draft_url"
                      type="url"
                      placeholder="https://your-tool.vercel.app"
                      defaultValue={project.tool_draft_url ?? ''}
                      style={{ maxWidth: 420 }}
                    />
                  </div>
                )}
                <button type="submit" className="btn btn-primary btn-sm">
                  {CAN_SEND_DRAFT[revisionStage]} →
                </button>
              </form>
            )}

            {intakeWithUrls.length === 0 ? (
              <p style={{ color: 'var(--muted)', fontSize: 13 }}>No intake submissions yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {intakeWithUrls.map((sub: any, i: number) => (
                  <div key={sub.id} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                      <strong style={{ textTransform: 'capitalize', fontSize: 13 }}>
                        {sub.type.replace('_', ' ')}
                        {sub.approved && ' · ✓ Approved'}
                      </strong>
                      <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                        {new Date(sub.created_at).toLocaleString('en-US', { timeZone: 'America/Chicago' })}
                      </span>
                    </div>
                    <div className="detail-grid" style={{ marginBottom: 10 }}>
                      {sub.business_name && <div className="detail-item"><label>Business</label><span>{sub.business_name}</span></div>}
                      {sub.tagline && <div className="detail-item"><label>Tagline</label><span>{sub.tagline}</span></div>}
                      {sub.pages_type && <div className="detail-item"><label>Pages</label><span>{sub.pages_type === 'single' ? '1-Page with tabs' : sub.pages_list?.join(', ') || 'Multi-page'}</span></div>}
                      {sub.target_audience && <div className="detail-item"><label>Audience</label><span>{sub.target_audience}</span></div>}
                      {sub.primary_cta && <div className="detail-item"><label>Goal / CTA</label><span>{sub.primary_cta}</span></div>}
                      {sub.phone && <div className="detail-item"><label>Phone</label><span>{sub.phone}</span></div>}
                      {sub.business_email && <div className="detail-item"><label>Business Email</label><span>{sub.business_email}</span></div>}
                      {sub.business_address && <div className="detail-item"><label>Address</label><span>{sub.business_address}</span></div>}
                      {sub.existing_domain && <div className="detail-item"><label>Domain</label><span>{sub.existing_domain}</span></div>}
                      {sub.existing_website && <div className="detail-item"><label>Existing Site</label><span><a href={sub.existing_website} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-lt)' }}>{sub.existing_website} ↗</a></span></div>}
                      {sub.brand_colors && <div className="detail-item"><label>Brand Colors</label><span>{sub.brand_colors}</span></div>}
                      {sub.content_ready && <div className="detail-item"><label>Content Ready</label><span style={{ textTransform: 'capitalize' }}>{sub.content_ready === 'yes' ? 'Yes' : sub.content_ready === 'partial' ? 'Partial' : 'No'}</span></div>}
                      {sub.special_features?.length > 0 && <div className="detail-item" style={{ gridColumn: '1 / -1' }}><label>Special Features</label><span>{sub.special_features.join(', ')}</span></div>}
                    </div>
                    {/* Tool fields */}
                    {sub.tool_problem && <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}><strong>Problem:</strong> {sub.tool_problem}</p>}
                    {sub.tool_current_workflow && <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}><strong>Current workflow:</strong> {sub.tool_current_workflow}</p>}
                    {sub.tool_desired_output && <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}><strong>Desired output:</strong> {sub.tool_desired_output}</p>}
                    {sub.tool_systems && <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}><strong>Systems to connect:</strong> {sub.tool_systems}</p>}
                    {sub.tool_success_criteria && <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}><strong>Success criteria:</strong> {sub.tool_success_criteria}</p>}
                    {/* Website fields */}
                    {sub.services_offered && <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}><strong>Services:</strong> {sub.services_offered}</p>}
                    {sub.style_notes && <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}><strong>Style:</strong> {sub.style_notes}</p>}
                    {sub.bio && <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}><strong>Bio:</strong> {sub.bio.length > 150 ? sub.bio.slice(0, 150) + '…' : sub.bio}</p>}
                    {sub.testimonials && <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}><strong>Testimonials:</strong> {sub.testimonials.length > 150 ? sub.testimonials.slice(0, 150) + '…' : sub.testimonials}</p>}
                    {sub.additional_notes && <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}><strong>Notes:</strong> {sub.additional_notes}</p>}
                    {sub.intake_files?.length > 0 && (
                      <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {sub.intake_files.map((f: any) => (
                          <a key={f.id} href={f.signedUrl} target="_blank" rel="noopener noreferrer"
                            className="btn btn-ghost btn-sm" style={{ fontSize: 11 }}>
                            ↓ {f.file_name}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Documents ────────────────────────────────────────────────────── */}
        <div className="hub-section">
          <div className="hub-section-header">
            <span className="section-title">Documents ({docsWithUrls.length})</span>
          </div>
          <div className="hub-section-body">
            {docsWithUrls.length > 0 && (
              <div className="table-wrap" style={{ marginBottom: 20 }}>
                <table>
                  <thead>
                    <tr>
                      <th>File</th>
                      <th>Type</th>
                      <th>Uploaded</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {docsWithUrls.map((doc: any) => (
                      <tr key={doc.id}>
                        <td>
                          {doc.signedUrl ? (
                            <a href={doc.signedUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-lt)' }}>
                              {doc.file_name}
                            </a>
                          ) : (
                            <span>{doc.file_name}</span>
                          )}
                        </td>
                        <td style={{ color: 'var(--muted)', textTransform: 'capitalize' }}>{doc.type}</td>
                        <td style={{ color: 'var(--muted)' }}>{new Date(doc.created_at).toLocaleDateString('en-US', { timeZone: 'America/Chicago' })}</td>
                        <td>
                          <DeleteDocumentButton documentId={doc.id} projectId={id} fileUrl={doc.file_url} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <DocumentUpload projectId={id} />
          </div>
        </div>

        {/* ── Portal ───────────────────────────────────────────────────────── */}
        <div className="hub-section">
          <div className="hub-section-header">
            <span className="section-title">Client Portal</span>
            {activeSession && (
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                Expires {new Date(activeSession.expires_at).toLocaleDateString('en-US', { timeZone: 'America/Chicago' })}
              </span>
            )}
          </div>
          <div className="hub-section-body">
            {portalUrl ? (
              <>
                <div style={{ marginBottom: 16 }}>
                  <label className="form-label" style={{ marginBottom: 6, display: 'block' }}>Portal URL</label>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <input
                      type="text"
                      readOnly
                      value={portalUrl}
                      style={{ flex: 1, background: 'var(--bg)', cursor: 'text' }}
                    />
                    <a href={portalUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">
                      Preview ↗
                    </a>
                  </div>
                  {activeSession?.sent_at && (
                    <p style={{ marginTop: 6, fontSize: 12, color: 'var(--muted)' }}>
                      Email sent {new Date(activeSession.sent_at).toLocaleString('en-US', { timeZone: 'America/Chicago' })}
                    </p>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <form action={sendPortalEmailAction} style={{ display: 'inline' }}>
                    <input type="hidden" name="project_id" value={id} />
                    <input type="hidden" name="token" value={activeSession.token} />
                    <input type="hidden" name="client_email" value={client?.email || ''} />
                    <input type="hidden" name="client_name" value={client?.name || ''} />
                    <input type="hidden" name="project_title" value={project.title} />
                    <button type="submit" className="btn btn-primary btn-sm">
                      {activeSession?.sent_at ? 'Resend Email' : 'Send Email to Client'}
                    </button>
                  </form>
                  <form action={generatePortalLinkAction} style={{ display: 'inline' }}>
                    <input type="hidden" name="project_id" value={id} />
                    <button type="submit" className="btn btn-ghost btn-sm">Generate New Link</button>
                  </form>
                </div>
              </>
            ) : (
              <form action={generatePortalLinkAction}>
                <input type="hidden" name="project_id" value={id} />
                <p style={{ color: 'var(--muted)', marginBottom: 14, fontSize: 13 }}>
                  Generate a magic link to give {client?.name} access to their portal.
                </p>
                <button type="submit" className="btn btn-primary btn-sm">Generate Portal Link</button>
              </form>
            )}
          </div>
        </div>

        {/* ── Launch / Delivery ────────────────────────────────────────────── */}
        <div className="hub-section">
          <div className="hub-section-header">
            <span className="section-title">{isTool ? 'Delivery' : 'Launch'}</span>
            {project.launch_submitted_at ? (
              <span className="badge badge-accepted">{isTool ? 'Ready to Deliver' : 'Info Received'}</span>
            ) : (
              <span className="badge badge-draft">Pending</span>
            )}
          </div>
          <div className="hub-section-body">
            {project.launch_submitted_at ? (
              <>
                <div className="detail-grid" style={{ marginBottom: 16 }}>
                  {!isTool && (
                    <div className="detail-item">
                      <label>Vercel Email</label>
                      <span>{project.client_vercel_email || '—'}</span>
                    </div>
                  )}
                  {project.client_github_username && (
                    <div className="detail-item">
                      <label>GitHub</label>
                      <span>{project.client_github_username}</span>
                    </div>
                  )}
                  <div className="detail-item">
                    <label>Submitted</label>
                    <span>{new Date(project.launch_submitted_at).toLocaleString('en-US', { timeZone: 'America/Chicago' })}</span>
                  </div>
                  {project.launch_notes && (
                    <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
                      <label>Notes</label>
                      <span>{project.launch_notes}</span>
                    </div>
                  )}
                </div>
                {project.launch_confirmed_at ? (
                  <p style={{ fontSize: 13, color: 'var(--green)' }}>
                    ✓ {isTool ? 'Delivered' : 'Launched'} on {new Date(project.launch_confirmed_at).toLocaleDateString('en-US', { timeZone: 'America/Chicago' })}
                  </p>
                ) : (
                  <form action={markAsLaunchedAction}>
                    <input type="hidden" name="project_id" value={id} />
                    <button type="submit" className="btn btn-primary btn-sm">
                      {isTool ? 'Mark as Delivered ✓' : 'Mark as Launched ✓'}
                    </button>
                  </form>
                )}
              </>
            ) : (
              <p style={{ fontSize: 13, color: 'var(--muted)' }}>
                {isTool
                  ? `Waiting for final payment. Once paid, you can deliver the tool to ${client?.name} and mark as delivered.`
                  : `Waiting for ${client?.name} to submit their Vercel account info via the portal Launch tab.`}
              </p>
            )}
          </div>
        </div>

      </div>
    </>
  );
}
