export const dynamic = 'force-dynamic';

import { createServiceClient } from '@/lib/supabase/service';
import { notFound } from 'next/navigation';
import { signContractAction } from './actions';

export default async function SignContractPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = createServiceClient();

  const { data: contract } = await supabase
    .from('contracts')
    .select('id, content, signed_at, signature_name, project_id')
    .eq('sign_token', token)
    .single();

  if (!contract) notFound();

  const [{ data: project }, { data: depositInvoice }] = await Promise.all([
    supabase
      .from('projects')
      .select('title, clients(name)')
      .eq('id', contract.project_id)
      .single(),
    supabase
      .from('invoices')
      .select('id')
      .eq('project_id', contract.project_id)
      .eq('type', 'deposit')
      .maybeSingle(),
  ]);

  const clientName = (project as any)?.clients?.name ?? '';
  const projectTitle = (project as any)?.title ?? '';

  return (
    <div className="sign-root">
      <div className="sign-shell">
        <div className="sign-header">
          <div className="sign-brand">3rd David's Technology</div>
          <h1 className="sign-title">Service Agreement</h1>
          <p className="sign-meta">{projectTitle}{clientName ? ` · ${clientName}` : ''}</p>
        </div>

        <div className="sign-card">
          <div className="sign-contract-body">
            {contract.content
              ? contract.content.split('\n').map((line: string, i: number) =>
                  line.trim() ? <p key={i}>{line}</p> : <br key={i} />
                )
              : <p style={{ color: '#6B6B60' }}>Contract content is being prepared. Please check back shortly.</p>
            }
          </div>
        </div>

        {contract.signed_at ? (
          <div className="sign-card sign-success">
            <div style={{ fontSize: 36, marginBottom: 12 }}>✓</div>
            <h2>Contract Signed</h2>
            <p>
              Signed by <strong>{contract.signature_name}</strong> on{' '}
              {new Date(contract.signed_at).toLocaleDateString('en-US', {
                year: 'numeric', month: 'long', day: 'numeric',
              })}
            </p>
            {depositInvoice && (
              <p style={{ marginTop: 12, fontSize: 13 }}>
                Check your email for your deposit payment link.
              </p>
            )}
          </div>
        ) : (
          <div className="sign-card">
            <h2 className="sign-section-title">Sign Agreement</h2>
            <p className="sign-agree-text">
              By typing your full legal name and clicking Sign, you confirm that you have read
              and agree to the terms of this agreement.
            </p>
            <form action={signContractAction}>
              <input type="hidden" name="sign_token" value={token} />
              <div style={{ marginBottom: 16 }}>
                <label className="sign-label">Full Legal Name</label>
                <input
                  type="text"
                  name="signature_name"
                  className="sign-input"
                  placeholder="Your full name"
                  required
                  autoComplete="name"
                />
              </div>
              <label className="sign-checkbox-label">
                <input type="checkbox" required />
                I have read and agree to the terms above
              </label>
              <button type="submit" className="sign-btn">
                Sign Agreement →
              </button>
            </form>
          </div>
        )}

        <p className="sign-footer">
          3rd David's Technology &nbsp;·&nbsp; Questions? Contact us at 3rddavidstechnology@gmail.com
        </p>
      </div>
    </div>
  );
}
