export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import PendingReviewSection from './components/PendingReviewSection';
import ApprovedLeadsSection from './components/ApprovedLeadsSection';
import RunScoutButton from './components/RunScoutButton';
import ScoutStatus from './components/ScoutStatus';
import PipelineLog from './components/PipelineLog';

export default async function ScoutPage() {
  const supabase = await createClient();

  const [{ data: pending }, { data: approved }, { data: recentRuns }] = await Promise.all([
    supabase
      .from('leads')
      .select('id,business_name,business_type,city,state,fit_score,phone,address,website,rating,review_count,outreach_draft')
      .eq('state', 'qualified')
      .or('outreach_approved.is.null,outreach_approved.eq.false')
      .order('fit_score', { ascending: false }),
    supabase
      .from('leads')
      .select('id,business_name,business_type,city,state,fit_score,phone,address,call_notes,follow_up_date,call_attempted_at,interested_at,created_at')
      .eq('outreach_approved', true)
      .order('created_at', { ascending: false }),
    supabase
      .from('pipeline_runs')
      .select('id,status,started_at,leads_found,leads_qualified')
      .order('started_at', { ascending: false })
      .limit(10),
  ]);

  const latestRun = recentRuns?.[0] ?? null;

  return (
    <>
      <div className="admin-topbar">
        <span className="topbar-title">Scout</span>
        <ScoutStatus initialRun={latestRun} />
      </div>

      <div className="admin-content">
        <RunScoutButton />

        <PendingReviewSection initialLeads={pending ?? []} />

        <ApprovedLeadsSection initialLeads={approved ?? []} />

        <PipelineLog initialRuns={recentRuns ?? []} />
      </div>
    </>
  );
}
