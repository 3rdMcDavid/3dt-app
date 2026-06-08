export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import PendingReviewSection from './components/PendingReviewSection';
import ApprovedLeadsSection from './components/ApprovedLeadsSection';
import RunScoutButton from './components/RunScoutButton';

export default async function ScoutPage() {
  const supabase = await createClient();

  const [{ data: pending }, { data: approved }] = await Promise.all([
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
  ]);

  return (
    <>
      <div className="admin-topbar">
        <span className="topbar-title">Scout</span>
        {/* Live status dot — wired to pipeline_runs in step 9 */}
        <span style={{
          display:'flex', alignItems:'center', gap:5,
          fontSize:11, fontWeight:700, letterSpacing:'0.8px',
          textTransform:'uppercase', color:'var(--muted)',
        }}>
          <span style={{ width:7, height:7, borderRadius:'50%', background:'var(--border)', display:'inline-block' }} />
          IDLE
        </span>
      </div>

      <div className="admin-content">
        <RunScoutButton />

        <PendingReviewSection initialLeads={pending ?? []} />

        <ApprovedLeadsSection initialLeads={approved ?? []} />
      </div>
    </>
  );
}
