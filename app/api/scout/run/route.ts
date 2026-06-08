import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { createServiceClient } from '@/lib/supabase/service';

export async function POST() {
  const supabase = createServiceClient();

  const { data: run, error } = await supabase
    .from('pipeline_runs')
    .insert({ status: 'running', triggered_by: 'manual' })
    .select()
    .single();

  if (error || !run) {
    return NextResponse.json({ error: 'Failed to start pipeline run' }, { status: 500 });
  }

  const runId = run.id;

  // Paths come from env so Turbopack can't statically resolve them as modules
  const scoutDir = process.env.SCOUT_DIR ?? '/home/kentaru/3dt-agents/scout';
  const scoutScript = process.env.SCOUT_SCRIPT ?? 'pipeline.js';

  const child = spawn('node', [scoutScript, '10'], {
    cwd: scoutDir,
    stdio: 'ignore',
  });

  async function finish(code: number | null) {
    const status: 'complete' | 'error' = code === 0 ? 'complete' : 'error';
    await supabase
      .from('pipeline_runs')
      .update({ status, completed_at: new Date().toISOString() })
      .eq('id', runId);
  }

  child.on('close', finish);
  child.on('error', () => finish(1));

  return NextResponse.json({ runId });
}
