import { createServiceClient } from '@/lib/supabase/service';
import { notFound } from 'next/navigation';
import { signContractAction } from '../actions';

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

  const projectId = session.project_id;

  const [{ data: project }, { data: contract }] = await Promise.all([
    supabase.from('projects').select('title, clients(name, email)').eq('id', projectId).single(),
    supabase.from('contracts').select('*').eq('project_id', projectId).maybeSingle(),
  ]);

  if (!project) notFound();

  const client = (project as any).clients;

  if (!contract) {
    return (
      <>
        <div className="portal-header">
          <p className="portal-subtitle">{(project as any).title}</p>
          <h1 className="portal-welcome">Contract</h1>
        </div>
        <div className="portal-card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <p style={{ color: 'var(--p-muted)', fontSize: 14 }}>
            Your contract isn&apos;t ready yet. We&apos;ll notify you once it&apos;s available.
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="portal-header">
        <p className="portal-subtitle">{(project as any).title}</p>
        <h1 className="portal-welcome">Contract</h1>
      </div>

      {/* Parties */}
      <div className="portal-card">
        <p className="portal-section-title">Parties</p>
        <div className="portal-status-row">
          <span className="portal-status-label">Service Provider</span>
          <span className="portal-status-value">3rd Davids Technology</span>
        </div>
        <div className="portal-status-row">
          <span className="portal-status-label">Client</span>
          <span className="portal-status-value">{client?.name}</span>
        </div>
      </div>

      {/* Contract body */}
      <div className="portal-card">
        <p className="portal-section-title">Agreement</p>
        <div className="portal-contract-body">{contract.content}</div>

        {contract.signed_at ? (
          <div className="portal-signed-banner">
            <h3>✓ Contract Signed</h3>
            <p>
              Signed by <strong>{contract.signature_name}</strong> on{' '}
              {new Date(contract.signed_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
        ) : (
          <form action={signContractAction}>
            <input type="hidden" name="token" value={token} />
            <input type="hidden" name="contract_id" value={contract.id} />
            <p style={{ fontSize: 13, color: 'var(--p-muted)', marginBottom: 14 }}>
              By typing your full name below and clicking Sign, you agree to the terms above.
            </p>
            <input
              type="text"
              name="signature_name"
              className="portal-input"
              placeholder="Full legal name"
              required
            />
            <button type="submit" className="portal-btn">
              Sign Contract
            </button>
          </form>
        )}
      </div>
    </>
  );
}
