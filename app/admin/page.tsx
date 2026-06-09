export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import DashboardStatCards from '@/app/admin/components/DashboardStatCards';
import DashboardAgentActivity from '@/app/admin/components/DashboardAgentActivity';
import DashboardNewLeads from '@/app/admin/components/DashboardNewLeads';

export default async function DashboardPage() {
  const supabase = await createClient();

  const [
    { count: totalLeads },
    { count: qualifiedLeads },
    { count: approvedLeads },
    { count: interestedLeads },
    { count: activeClients },
    { data: unpaidInvoices },
    { data: latestRun },
    { data: newLeads },
  ] = await Promise.all([
    supabase.from('leads').select('*', { count: 'exact', head: true }),
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('state', 'qualified'),
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('state', 'approved'),
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('state', 'interested'),
    supabase.from('clients').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('invoices').select('amount').eq('status', 'unpaid'),
    supabase
      .from('pipeline_runs')
      .select('id,status,started_at,leads_found,leads_qualified')
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('leads')
      .select('id,business_name,business_type,city,fit_score,state,created_at')
      .eq('state', 'qualified')
      .eq('outreach_approved', false)
      .order('created_at', { ascending: false })
      .limit(5),
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

        <DashboardNewLeads initialLeads={newLeads ?? []} />

        <DashboardAgentActivity initialRun={latestRun ?? null} />

      </div>
    </>
  );
}
