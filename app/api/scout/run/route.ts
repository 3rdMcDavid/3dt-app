import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

// The pipeline lives on the WSL2 box, so Vercel can't spawn it. This route
// only enqueues a run; the watcher script in 3dt-agents/scout claims it
// (status → 'running'), runs the pipeline, and marks 'complete' / 'error'.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const count: number = Number(body.count) || 10;
  const supabase = createServiceClient();

  const { data: run, error } = await supabase
    .from('pipeline_runs')
    .insert({ status: 'requested', requested_count: count, triggered_by: 'manual' })
    .select()
    .single();

  if (error || !run) {
    return NextResponse.json({ error: 'Failed to queue pipeline run' }, { status: 500 });
  }

  return NextResponse.json({ runId: run.id });
}
