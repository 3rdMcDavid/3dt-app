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

  const child = spawn('node', ['pipeline.js', '10'], {
    cwd: '/home/kentaru/3dt-agents/scout',
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
