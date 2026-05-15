export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import DocumentUpload from './components/DocumentUpload';
import DeleteProjectButton from './components/DeleteProjectButton';
import DeleteInvoiceButton from './components/DeleteInvoiceButton';
import DeleteDocumentButton from './components/DeleteDocumentButton';
import {
  upsertProposalAction,
  upsertContractAction,
  createInvoiceAction,
  markInvoicePaidAction,
  generateStripePaymentLinkAction,
  generatePortalLinkAction,
  sendPortalEmailAction,
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
    proposalResult,
    contractResult,
    { data: invoices },
    { data: documents },
    { data: portalSessions },
  ] = await Promise.all([
    supabase.from('projects').select('*, clients(*)').eq('id', id).single(),
    supabase.from('proposals').select('*').eq('project_id', id).maybeSingle(),
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
  ]);

  const project = projectResult.data as any;
  const proposal = proposalResult.data as any;
  const contract = contractResult.data as any;

  if (!project) notFound();

  const client = (project as any).clients;
  const activeSession = portalSessions?.[0] ?? null;
  const portalUrl = activeSession
    ? `${process.env.NEXT_PUBLIC_APP_URL}/portal/${activeSession.token}`
    : null;

  // Generate signed URLs for documents
  const service = createServiceClient();
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>{project.title}</h1>
          <span className={`badge badge-${project.stage}`}>{project.stage}</span>
        </div>

        {/* ── Proposal ─────────────────────────────────────────────────────── */}
        <div className="hub-section">
          <div className="hub-section-header">
            <span className="section-title">Proposal</span>
            {proposal && <span className={`badge badge-${proposal.status}`}>{proposal.status}</span>}
          </div>
          <div className="hub-section-body">
            <form action={upsertProposalAction}>
              <input type="hidden" name="project_id" value={id} />
              {proposal && <input type="hidden" name="proposal_id" value={proposal.id} />}
              <div className="form-grid">
                <div className="form-group form-full">
                  <label className="form-label">Deliverables</label>
                  <textarea name="deliverables" required placeholder="List what's included…" defaultValue={proposal?.deliverables || ''} style={{ minHeight: 80 }} />
                </div>
                <div className="form-group">
                  <label className="form-label">Price ($)</label>
                  <input name="price" type="number" step="0.01" min="0" required placeholder="0.00" defaultValue={proposal?.price ?? ''} />
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select name="status" defaultValue={proposal?.status || 'draft'}>
                    <option value="draft">Draft</option>
                    <option value="sent">Sent</option>
                    <option value="accepted">Accepted</option>
                    <option value="declined">Declined</option>
                  </select>
                </div>
              </div>
              <div className="form-actions">
                <button type="submit" className="btn btn-primary btn-sm">
                  {proposal ? 'Save Proposal' : 'Create Proposal'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* ── Contract ─────────────────────────────────────────────────────── */}
        <div className="hub-section">
          <div className="hub-section-header">
            <span className="section-title">Contract</span>
            {contract?.signed_at ? (
              <span className="badge badge-accepted">Signed {new Date(contract.signed_at).toLocaleDateString()}</span>
            ) : contract ? (
              <span className="badge badge-sent">Unsigned</span>
            ) : null}
          </div>
          <div className="hub-section-body">
            <form action={upsertContractAction}>
              <input type="hidden" name="project_id" value={id} />
              {contract && <input type="hidden" name="contract_id" value={contract.id} />}
              <div className="form-group">
                <label className="form-label">Contract Content</label>
                <textarea
                  name="content"
                  required
                  placeholder="Paste or write the full contract text…"
                  defaultValue={contract?.content || ''}
                  style={{ minHeight: 180 }}
                />
              </div>
              {contract?.signed_at && (
                <div style={{ marginBottom: 12, fontSize: 13, color: 'var(--muted)' }}>
                  Signed by <strong>{contract.signature_name}</strong> on {new Date(contract.signed_at).toLocaleString()}
                </div>
              )}
              <div className="form-actions">
                <button type="submit" className="btn btn-primary btn-sm">
                  {contract ? 'Save Contract' : 'Create Contract'}
                </button>
              </div>
            </form>
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
                          {inv.due_date ? new Date(inv.due_date).toLocaleDateString() : '—'}
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
                        <td style={{ color: 'var(--muted)' }}>{new Date(doc.created_at).toLocaleDateString()}</td>
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
                Expires {new Date(activeSession.expires_at).toLocaleDateString()}
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
                      Email sent {new Date(activeSession.sent_at).toLocaleString()}
                    </p>
                  )}
                </div>

                <form action={sendPortalEmailAction}>
                  <input type="hidden" name="project_id" value={id} />
                  <input type="hidden" name="token" value={activeSession.token} />
                  <input type="hidden" name="client_email" value={client?.email || ''} />
                  <input type="hidden" name="client_name" value={client?.name || ''} />
                  <input type="hidden" name="project_title" value={project.title} />
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button type="submit" className="btn btn-primary btn-sm">
                      {activeSession?.sent_at ? 'Resend Email' : 'Send Email to Client'}
                    </button>
                    <form action={generatePortalLinkAction} style={{ display: 'inline' }}>
                      <input type="hidden" name="project_id" value={id} />
                      <button type="submit" className="btn btn-ghost btn-sm">Generate New Link</button>
                    </form>
                  </div>
                </form>
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
      </div>
    </>
  );
}
