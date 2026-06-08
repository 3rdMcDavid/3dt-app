'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type Run = {
  id: string;
  status: 'running' | 'complete' | 'error';
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

  const isLive = run?.status === 'running';

  return (
    <span style={{
      display:'flex', alignItems:'center', gap:5,
      fontSize:11, fontWeight:700, letterSpacing:'0.8px',
      textTransform:'uppercase',
      color: isLive ? 'var(--green)' : 'var(--muted)',
    }}>
      <span style={{
        width:7, height:7, borderRadius:'50%', display:'inline-block',
        background: isLive ? 'var(--green)' : 'var(--border)',
        boxShadow: isLive ? '0 0 0 3px rgba(34,197,94,0.2)' : 'none',
      }} />
      {isLive ? 'LIVE' : 'IDLE'}
    </span>
  );
}
