import { createServiceClient } from '@/lib/supabase/service';
import { resend } from '@/lib/resend';
import { followUpTouch } from '@/lib/followUpEmails';
import { NextRequest, NextResponse } from 'next/server';

const ELIGIBLE_STATES = ['approved', 'contacted', 'follow_up'] as const;
const DAY_MS = 86_400_000;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();
  const { data: leads, error } = await supabase
    .from('leads')
    .select('id, owner_name, email, created_at, follow_up_touches_sent')
    .eq('source', 'inquiry')
    .eq('auto_follow_up', true)
    .in('pipeline_state', ELIGIBLE_STATES)
    .not('email', 'is', null)
    .lt('follow_up_touches_sent', 2);

  if (error) {
    console.error('Follow-up cron: leads query failed:', error);
    return NextResponse.json({ error: 'Query failed' }, { status: 500 });
  }

  let sent = 0;
  let failed = 0;
  const now = Date.now();

  for (const lead of leads ?? []) {
    const ageDays = (now - new Date(lead.created_at as string).getTime()) / DAY_MS;
    const touches = lead.follow_up_touches_sent;
    let touch: 1 | 2 | null = null;
    if (touches === 0 && ageDays >= 3) touch = 1;
    else if (touches === 1 && ageDays >= 7) touch = 2;
    if (!touch) continue;

    try {
      const { subject, html } = followUpTouch(touch, lead.owner_name);
      const result = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL!,
        to: lead.email as string,
        replyTo: '3rddavidstechnology@gmail.com',
        subject,
        html,
      });
      if (result.error) {
        console.error(`Follow-up touch ${touch} failed for lead ${lead.id}:`, result.error);
        failed++;
        continue;
      }
      const { error: updateError } = await supabase
        .from('leads')
        .update({ follow_up_touches_sent: touches + 1, last_follow_up_at: new Date().toISOString() })
        .eq('id', lead.id);
      if (updateError) {
        // Email went out but the counter didn't advance — surface loudly, a
        // rerun would double-send to this lead.
        console.error(`Follow-up counter update failed for lead ${lead.id}:`, updateError);
      }
      sent++;
    } catch (e) {
      console.error(`Follow-up touch ${touch} threw for lead ${lead.id}:`, e);
      failed++;
    }
  }

  return NextResponse.json({ checked: leads?.length ?? 0, sent, failed });
}
