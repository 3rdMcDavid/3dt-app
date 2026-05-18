import { createServiceClient } from '@/lib/supabase/service';
import { notFound } from 'next/navigation';
import Link from 'next/link';

const ACTION_CTA: Partial<Record<string, { label: string; href: string; urgent: boolean }>> = {
  awaiting_intake:    { label: 'Complete your intake form →', href: 'intake', urgent: true },
  revision_1_open:    { label: 'Review Draft 1 →',            href: 'intake', urgent: true },
  revision_2_open:    { label: 'Review Draft 2 →',            href: 'intake', urgent: true },
  post_final_open:    { label: 'Review & approve final →',    href: 'intake', urgent: true },
};

const PROGRESS_LABEL: Record<string, string> = {
  awaiting_intake:    'Complete your intake form to get started',
  intake_received:    'Intake received — first draft in progress',
  revision_1_open:    'Draft 1 is ready for your review',
  revision_1_received:'Feedback received — updates in progress',
  revision_2_open:    'Draft 2 is ready for your review',
  revision_2_received:'Feedback received — final version in progress',
  post_final_open:    'Final version is ready for your approval',
  complete:           'Project complete — thank you!',
};

export default async function PortalHomePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = createServiceClient();

  const { data: session } = await supabase
    .from('portal_sessions')
    .select('project_id')
    .eq('token', token)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (!session) notFound();

  const projectId = session.project_id;

  const [{ data: project }, { data: contract }, { data: invoices }] = await Promise.all([
    supabase.from('projects').select('*, clients(*)').eq('id', projectId).single(),
    supabase.from('contracts').select('signed_at').eq('project_id', projectId).maybeSingle(),
    supabase.from('invoices').select('amount, status, type').eq('project_id', projectId),
  ]);

  if (!project) notFound();

  const client = (project as any).clients;
  const revisionStage = (project as any).revision_stage as string;
  const cta = ACTION_CTA[revisionStage];

  const totalOwed = (invoices || [])
    .filter((i: any) => i.status === 'unpaid')
    .reduce((sum: number, i: any) => sum + Number(i.amount), 0);
  const allPaid = (invoices || []).length > 0 && (invoices || []).every((i: any) => i.status === 'paid');

  return (
    <>
      <div className="portal-header">
        <p className="portal-subtitle">Your Client Portal</p>
        <h1 className="portal-welcome">Welcome, {client?.name?.split(' ')[0] ?? 'there'}</h1>
      </div>

      {/* Next action CTA — shown when it's the client's turn */}
      {cta && revisionStage !== 'complete' && (
        <Link
          href={`/portal/${token}/${cta.href}`}
          style={{
            display: 'block',
            background: 'var(--p-green)',
            color: '#fff',
            borderRadius: 12,
            padding: '18px 20px',
            marginBottom: 16,
            textDecoration: 'none',
          }}
        >
          <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.8, marginBottom: 4 }}>
            Action Required
          </p>
          <p style={{ fontSize: 16, fontWeight: 700 }}>{cta.label}</p>
        </Link>
      )}

      {/* Final approved but payment still due */}
      {revisionStage === 'complete' && !allPaid && (
        <Link
          href={`/portal/${token}/invoice`}
          style={{
            display: 'block',
            background: 'var(--p-green)',
            color: '#fff',
            borderRadius: 12,
            padding: '18px 20px',
            marginBottom: 16,
            textDecoration: 'none',
          }}
        >
          <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.8, marginBottom: 4 }}>
            Action Required
          </p>
          <p style={{ fontSize: 16, fontWeight: 700 }}>Pay your final invoice →</p>
        </Link>
      )}

      {/* Complete state — only show when everything is truly done */}
      {revisionStage === 'complete' && allPaid && (
        <div className="portal-card" style={{ textAlign: 'center', padding: '24px 20px', marginBottom: 16 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🎉</div>
          <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Project Complete!</p>
          <p style={{ fontSize: 13, color: 'var(--p-muted)' }}>Thank you for working with 3rd Davids Technology!</p>
        </div>
      )}

      {/* Project status */}
      <div className="portal-card">
        <p className="portal-section-title">Project</p>
        <div className="portal-status-row">
          <span className="portal-status-label">Name</span>
          <span className="portal-status-value">{(project as any).title}</span>
        </div>
        <div className="portal-status-row">
          <span className="portal-status-label">Status</span>
          <span className="portal-status-value" style={{ fontSize: 13 }}>
            {revisionStage === 'complete' && !allPaid
              ? 'Final approved — final payment due'
              : PROGRESS_LABEL[revisionStage] ?? 'In progress'}
          </span>
        </div>
      </div>

      {/* Contract */}
      <div className="portal-card">
        <p className="portal-section-title">Contract</p>
        <div className="portal-status-row">
          <span className="portal-status-label">Status</span>
          {contract?.signed_at ? (
            <span className="portal-badge portal-badge-green">Signed</span>
          ) : (
            <span className="portal-badge portal-badge-amber">Needs Signature</span>
          )}
        </div>
      </div>

      {/* Invoices */}
      <div className="portal-card">
        <p className="portal-section-title">Invoices</p>
        {(invoices || []).length === 0 ? (
          <p style={{ color: 'var(--p-muted)', fontSize: 13 }}>No invoices yet.</p>
        ) : (
          <div className="portal-status-row">
            <span className="portal-status-label">Balance Due</span>
            {allPaid ? (
              <span className="portal-badge portal-badge-green">All Paid</span>
            ) : (
              <span className="portal-status-value" style={{ color: '#92400E' }}>
                ${totalOwed.toFixed(2)}
              </span>
            )}
          </div>
        )}
      </div>

      <p style={{ fontSize: 12, color: 'var(--p-muted)', textAlign: 'center', marginTop: 8 }}>
        Questions? Email{' '}
        <a href="mailto:3rddavidstechnology@gmail.com" style={{ color: 'var(--p-green)' }}>
          3rddavidstechnology@gmail.com
        </a>
      </p>
    </>
  );
}
