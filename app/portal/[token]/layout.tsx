import { createServiceClient } from '@/lib/supabase/service';
import PortalNav from './components/PortalNav';
import PortalSignStep from './components/PortalSignStep';
import PortalPayStep from './components/PortalPayStep';

export default async function PortalLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = createServiceClient();

  const { data: session } = await supabase
    .from('portal_sessions')
    .select('id, project_id')
    .eq('token', token)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (!session) {
    return (
      <div className="portal-root">
        <div className="portal-expired">
          <div className="portal-expired-inner">
            <div style={{ fontSize: 40, marginBottom: 16 }}>🔒</div>
            <h2>Link Expired</h2>
            <p>This portal link has expired or is invalid. Please contact 3rd David's Technology for a new link.</p>
          </div>
        </div>
      </div>
    );
  }

  const [{ data: contract }, { data: depositInvoice }, { data: project }] = await Promise.all([
    supabase
      .from('contracts')
      .select('id, signed_at, content, signature_name')
      .eq('project_id', session.project_id)
      .maybeSingle(),
    supabase
      .from('invoices')
      .select('id, status, stripe_payment_url, amount')
      .eq('project_id', session.project_id)
      .eq('type', 'deposit')
      .maybeSingle(),
    supabase
      .from('projects')
      .select('title, clients(name)')
      .eq('id', session.project_id)
      .single(),
  ]);

  const clientName = (project as any)?.clients?.name?.split(' ')[0] ?? 'there';
  const projectTitle = (project as any)?.title ?? '';

  // Step 1: contract not yet signed
  if (!contract?.signed_at) {
    return (
      <div className="portal-root">
        <div className="portal-shell">
          <main className="portal-main">
            <PortalSignStep
              token={token}
              clientName={clientName}
              projectTitle={projectTitle}
              contractContent={contract?.content ?? ''}
            />
          </main>
        </div>
      </div>
    );
  }

  // Step 2: signed but deposit not paid
  if (!depositInvoice || depositInvoice.status !== 'paid') {
    return (
      <div className="portal-root">
        <div className="portal-shell">
          <main className="portal-main">
            <PortalPayStep
              token={token}
              projectTitle={projectTitle}
              stripeUrl={depositInvoice?.stripe_payment_url ?? null}
              signatureName={contract.signature_name ?? ''}
              depositAmount={depositInvoice?.amount ?? null}
            />
          </main>
        </div>
      </div>
    );
  }

  // Fully unlocked portal
  return (
    <div className="portal-root">
      <div className="portal-shell">
        <main className="portal-main">{children}</main>
        <PortalNav token={token} />
      </div>
    </div>
  );
}
