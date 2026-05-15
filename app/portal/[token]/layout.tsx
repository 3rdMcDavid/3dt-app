import { createServiceClient } from '@/lib/supabase/service';
import PortalNav from './components/PortalNav';

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
    .select('id')
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
            <p>This portal link has expired or is invalid. Please contact 3rd Davids Technology for a new link.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="portal-root">
      <div className="portal-shell">
        <main className="portal-main">{children}</main>
        <PortalNav token={token} />
      </div>
    </div>
  );
}
