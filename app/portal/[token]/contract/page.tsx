import { createServiceClient } from '@/lib/supabase/service';
import { notFound } from 'next/navigation';

export default async function PortalContractPage({
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

  const [{ data: project }, { data: contract }] = await Promise.all([
    supabase.from('projects').select('title, clients(name)').eq('id', session.project_id).single(),
    supabase.from('contracts').select('*').eq('project_id', session.project_id).maybeSingle(),
  ]);

  if (!project) notFound();

  return (
    <>
      <div className="portal-header">
        <p className="portal-subtitle">{(project as any).title}</p>
        <h1 className="portal-welcome">Contract</h1>
      </div>

      {!contract ? (
        <div className="portal-card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <p style={{ color: 'var(--p-muted)', fontSize: 14 }}>
            Your contract isn&apos;t ready yet. We&apos;ll notify you once it&apos;s available.
          </p>
        </div>
      ) : (
        <>
          <div className="portal-card">
            <p className="portal-section-title">Parties</p>
            <div className="portal-status-row">
              <span className="portal-status-label">Service Provider</span>
              <span className="portal-status-value">3rd Davids Technology</span>
            </div>
            <div className="portal-status-row">
              <span className="portal-status-label">Client</span>
              <span className="portal-status-value">{(project as any).clients?.name}</span>
            </div>
          </div>

          <div className="portal-card">
            <p className="portal-section-title">Agreement</p>
            <div className="portal-contract-body">
              {contract.content.split('\n').map((line: string, i: number) =>
                line.trim() ? <p key={i}>{line}</p> : <br key={i} />
              )}
            </div>
          </div>

          {contract.signed_at && (
            <div className="portal-signed-banner">
              <h3>✓ Contract Signed</h3>
              <p>
                Signed by <strong>{contract.signature_name}</strong> on{' '}
                {new Date(contract.signed_at).toLocaleDateString('en-US', {
                  year: 'numeric', month: 'long', day: 'numeric',
                })}
              </p>
            </div>
          )}
        </>
      )}
    </>
  );
}
