'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const COUNT_OPTIONS = [5, 10, 25, 50];

export default function RunScoutButton() {
  const [running, setRunning]   = useState(false);
  const [count, setCount]       = useState(10);
  const [errMsg, setErrMsg]     = useState<string | null>(null);
  const router = useRouter();
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => { cleanupRef.current?.(); };
  }, []);

  async function handleRun() {
    if (running) return;
    setRunning(true);
    setErrMsg(null);

    let runId: string | null = null;
    try {
      const res = await fetch('/api/scout/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      runId = (await res.json()).runId ?? null;
    } catch (e) {
      setErrMsg(`Failed to start: ${(e as Error).message}`);
      setRunning(false);
      return;
    }

    if (!runId) { setRunning(false); return; }

    const supabase = createClient();

    // Subscribe to Realtime first, then do an initial status check to avoid
    // missing events that fired before the subscription was established.
    const channel = supabase
      .channel(`scout-run-${runId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'pipeline_runs',
          filter: `id=eq.${runId}`,
        },
        (payload) => {
          const { status } = payload.new as { status: string };
          if (status === 'complete' || status === 'error') {
            supabase.removeChannel(channel);
            cleanupRef.current = null;
            if (status === 'error') {
              setErrMsg('Pipeline run failed. Check the watcher logs on the WSL machine (3dt-agents/scout/watcher.log).');
            }
            setRunning(false);
            router.refresh();
          }
        }
      )
      .subscribe(async () => {
        // After subscription is live, check current status in case the run
        // already finished before we subscribed (race condition on fast failures).
        const { data } = await supabase
          .from('pipeline_runs')
          .select('status')
          .eq('id', runId!)
          .single();
        if (data && (data.status === 'complete' || data.status === 'error')) {
          supabase.removeChannel(channel);
          cleanupRef.current = null;
          if (data.status === 'error') {
            setErrMsg('Pipeline run failed. Check the watcher logs on the WSL machine (3dt-agents/scout/watcher.log).');
          }
          setRunning(false);
          router.refresh();
        }
      });

    cleanupRef.current = () => supabase.removeChannel(channel);
  }

  return (
    <div style={{ marginBottom: 4 }}>
      {/* Count picker */}
      <div style={{ display:'flex', gap:6, marginBottom:8, alignItems:'center' }}>
        <span style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.8px', color:'var(--muted)' }}>
          Results
        </span>
        {COUNT_OPTIONS.map(n => (
          <button
            key={n}
            type="button"
            onClick={() => setCount(n)}
            disabled={running}
            style={{
              fontSize:12, fontWeight:600,
              padding:'4px 12px', borderRadius:6,
              background: count === n ? 'var(--accent)' : 'var(--surface)',
              color: count === n ? '#fff' : 'var(--muted)',
              border: `1px solid ${count === n ? 'var(--accent)' : 'var(--border)'}`,
              cursor: running ? 'default' : 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {n}
          </button>
        ))}
      </div>

      <button
        type="button"
        className="btn btn-primary btn-full"
        onClick={handleRun}
        disabled={running}
      >
        {running ? `⏳ Scouting ${count} leads…` : 'Run Scout ▶'}
      </button>

      {errMsg && (
        <div style={{
          marginTop:8,
          background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)',
          borderRadius:8, padding:'8px 12px',
          fontSize:12, color:'var(--red)', display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8,
        }}>
          <span>{errMsg}</span>
          <button type="button" onClick={() => setErrMsg(null)}
            style={{ background:'none', border:'none', color:'var(--red)', cursor:'pointer', padding:'0 2px', fontSize:14, lineHeight:1, flexShrink:0 }}>✕</button>
        </div>
      )}
    </div>
  );
}
