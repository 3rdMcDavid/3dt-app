'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type Run = {
  id: string;
  status: 'requested' | 'running' | 'complete' | 'error';
  started_at: string;
  leads_found: number;
  leads_qualified: number;
};

export default function ScoutStatus({ initialRun }: { initialRun: Run | null }) {
  const [run, setRun] = useState<Run | null>(initialRun);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('scout-pipeline-status')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pipeline_runs' },
        (payload) => {
          const updated = payload.new as Run;
          setRun(prev => {
            if (!prev || updated.started_at >= prev.started_at) return updated;
            return prev;
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const isLive   = run?.status === 'running';
  const isQueued = run?.status === 'requested';
  const color = isLive ? 'var(--green)' : isQueued ? 'var(--orange)' : 'var(--muted)';

  return (
    <span style={{
      display:'flex', alignItems:'center', gap:5,
      fontSize:11, fontWeight:700, letterSpacing:'0.8px',
      textTransform:'uppercase',
      color,
    }}>
      <span style={{
        width:7, height:7, borderRadius:'50%', display:'inline-block',
        background: (isLive || isQueued) ? color : 'var(--border)',
        boxShadow: isLive ? '0 0 0 3px rgba(34,197,94,0.2)'
                 : isQueued ? '0 0 0 3px rgba(240,165,0,0.2)' : 'none',
      }} />
      {isLive ? 'LIVE' : isQueued ? 'QUEUED' : 'IDLE'}
    </span>
  );
}
