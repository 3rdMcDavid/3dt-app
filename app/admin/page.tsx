export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

function fmtMoney(n: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0,
  }).format(n);
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const [
    { count: totalLeads },
    { count: qualifiedLeads },
    { count: approvedLeads },
    { count: interestedLeads },
    { count: activeClients },
    { data: unpaidInvoices },
  ] = await Promise.all([
    supabase.from('leads').select('*', { count: 'exact', head: true }),
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('state', 'qualified'),
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('state', 'approved'),
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('state', 'interested'),
    supabase.from('clients').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('invoices').select('amount').eq('status', 'unpaid'),
  ]);

  const openCount = unpaidInvoices?.length ?? 0;
  const openTotal = unpaidInvoices?.reduce((s, i) => s + Number(i.amount), 0) ?? 0;

  return (
    <>
      <div className="admin-topbar">
        <span className="topbar-title">Dashboard</span>
      </div>
      <div className="admin-content">

        {/* 6 stat cards — forced 2-col; drill-downs wired in Step 3 */}
        <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
          <div className="stat-card">
            <div className="stat-label">Total Leads</div>
            <div className="stat-value">{totalLeads ?? 0}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Qualified</div>
            <div className="stat-value">{qualifiedLeads ?? 0}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Approved</div>
            <div className="stat-value">{approvedLeads ?? 0}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Interested</div>
            <div className="stat-value">{interestedLeads ?? 0}</div>
          </div>
          <Link href="/admin/clients" className="stat-card stat-card-link">
            <div className="stat-label">Active Clients</div>
            <div className="stat-value">{activeClients ?? 0}</div>
          </Link>
          <Link href="/admin/invoices" className="stat-card stat-card-link">
            <div className="stat-label">Open Invoices</div>
            <div className="stat-value">{openCount}</div>
            {openTotal > 0 && (
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                {fmtMoney(openTotal)}
              </div>
            )}
          </Link>
        </div>

        {/* Agent Activity shell — wired to pipeline_runs in Step 11 */}
        <div className="card">
          <div className="card-header" style={{ justifyContent: 'space-between' }}>
            <span style={{
              fontSize: 11, fontWeight: 700, letterSpacing: '0.8px',
              textTransform: 'uppercase', color: 'var(--muted)',
            }}>
              Agent Activity
            </span>
            <Link href="/admin/scout" className="btn btn-primary btn-sm">
              Run Scout ▶
            </Link>
          </div>
          <div className="card-body">
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>No pipeline runs yet.</span>
          </div>
        </div>

      </div>
    </>
  );
}
