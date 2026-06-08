export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import DashboardStatCards from '@/app/admin/components/DashboardStatCards';

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

        <DashboardStatCards
          totalLeads={totalLeads ?? 0}
          qualifiedLeads={qualifiedLeads ?? 0}
          approvedLeads={approvedLeads ?? 0}
          interestedLeads={interestedLeads ?? 0}
          activeClients={activeClients ?? 0}
          openInvoiceCount={openCount}
          openInvoiceTotal={openTotal}
        />

        {/* Agent Activity shell — wired to pipeline_runs in Step 11 */}
        <div className="card">
          <div className="card-header" style={{ justifyContent:'space-between' }}>
            <span style={{ fontSize:11, fontWeight:700, letterSpacing:'0.8px', textTransform:'uppercase', color:'var(--muted)' }}>
              Agent Activity
            </span>
            <Link href="/admin/scout" className="btn btn-primary btn-sm">
              Run Scout ▶
            </Link>
          </div>
          <div className="card-body">
            <span style={{ fontSize:13, color:'var(--muted)' }}>No pipeline runs yet.</span>
          </div>
        </div>

      </div>
    </>
  );
}
