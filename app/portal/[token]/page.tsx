import { createServiceClient } from '@/lib/supabase/service';
import { notFound } from 'next/navigation';

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

  const [
    { data: project },
    { data: contract },
    { data: invoices },
  ] = await Promise.all([
    supabase.from('projects').select('*, clients(*)').eq('id', projectId).single(),
    supabase.from('contracts').select('signed_at').eq('project_id', projectId).maybeSingle(),
    supabase.from('invoices').select('amount, status, type').eq('project_id', projectId),
  ]);

  if (!project) notFound();

  const client = (project as any).clients;
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

      {/* Project */}
      <div className="portal-card">
        <p className="portal-section-title">Project</p>
        <div className="portal-status-row">
          <span className="portal-status-label">Name</span>
          <span className="portal-status-value">{(project as any).title}</span>
        </div>
        <div className="portal-status-row">
          <span className="portal-status-label">Stage</span>
          <span className="portal-badge portal-badge-stage" style={{ textTransform: 'capitalize' }}>
            {(project as any).stage}
          </span>
        </div>
      </div>

      {/* Contract status */}
      <div className="portal-card">
        <p className="portal-section-title">Contract</p>
        <div className="portal-status-row">
          <span className="portal-status-label">Status</span>
          {contract?.signed_at ? (
            <span className="portal-badge portal-badge-green">Signed</span>
          ) : contract ? (
            <span className="portal-badge portal-badge-amber">Needs Signature</span>
          ) : (
            <span style={{ color: 'var(--p-muted)', fontSize: 13 }}>Not yet available</span>
          )}
        </div>
      </div>

      {/* Invoice status */}
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
