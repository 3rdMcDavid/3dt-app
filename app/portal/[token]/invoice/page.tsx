import { createServiceClient } from '@/lib/supabase/service';
import { notFound } from 'next/navigation';

export default async function PortalInvoicePage({
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

  const [{ data: project }, { data: invoices }] = await Promise.all([
    supabase.from('projects').select('title').eq('id', projectId).single(),
    supabase
      .from('invoices')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at'),
  ]);

  if (!project) notFound();

  const firstUnpaid = (invoices || []).find((i: any) => i.status === 'unpaid' && i.stripe_payment_url);
  const allPaid = (invoices || []).length > 0 && (invoices || []).every((i: any) => i.status === 'paid');
  const grandTotal = (invoices || []).reduce((sum: number, i: any) => sum + Number(i.amount), 0);

  return (
    <>
      <div className="portal-header">
        <p className="portal-subtitle">{(project as any).title}</p>
        <h1 className="portal-welcome">Invoice</h1>
      </div>

      {(invoices || []).length === 0 ? (
        <div className="portal-card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <p style={{ color: 'var(--p-muted)', fontSize: 14 }}>No invoices yet.</p>
        </div>
      ) : (
        <>
          {/* Payment breakdown */}
          <div className="portal-card">
            <p className="portal-section-title">Payment Summary</p>
            <table className="portal-table">
              <tbody>
                {(invoices || []).map((inv: any) => (
                  <tr key={inv.id}>
                    <td style={{ textTransform: 'capitalize' }}>
                      {inv.type === 'deposit' ? 'Deposit' : 'Final Payment'}
                      {inv.due_date && (
                        <span style={{ display: 'block', fontSize: 11, color: 'var(--p-muted)', marginTop: 2 }}>
                          Due {new Date(inv.due_date).toLocaleDateString('en-US', { timeZone: 'America/Chicago' })}
                        </span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                        <span>${Number(inv.amount).toFixed(2)}</span>
                        <span className={`portal-badge ${inv.status === 'paid' ? 'portal-badge-green' : 'portal-badge-amber'}`}>
                          {inv.status}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
                <tr className="total-row">
                  <td>Total</td>
                  <td>${grandTotal.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Payment CTA */}
          {firstUnpaid ? (
            <a
              href={firstUnpaid.stripe_payment_url}
              target="_blank"
              rel="noopener noreferrer"
              className="portal-btn"
            >
              Make a Payment →
            </a>
          ) : allPaid ? (
            <div className="portal-card" style={{ textAlign: 'center', padding: '20px' }}>
              <span className="portal-badge portal-badge-green" style={{ fontSize: 13, padding: '6px 16px' }}>
                ✓ All Payments Complete
              </span>
            </div>
          ) : (
            <div className="portal-card" style={{ padding: '20px' }}>
              <p style={{ color: 'var(--p-muted)', fontSize: 14 }}>
                Your final payment will be due upon project completion. David will send a payment link when ready.
              </p>
            </div>
          )}
        </>
      )}
    </>
  );
}
