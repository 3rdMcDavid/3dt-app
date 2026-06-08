import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

export async function GET(req: NextRequest) {
  const runId = req.nextUrl.searchParams.get('runId');
  if (!runId) return NextResponse.json({ error: 'runId required' }, { status: 400 });

  const supabase = createServiceClient();
  const { data } = await supabase
    .from('pipeline_runs')
    .select('status,leads_found,leads_qualified')
    .eq('id', runId)
    .single();

  return NextResponse.json(data ?? { status: 'error' });
}
