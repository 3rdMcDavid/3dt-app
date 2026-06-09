'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type Run = {
  id: string;
  status: 'running' | 'complete' | 'error';
  started_at: string;
  leads_found: number | null;
  leads_qualified: number | null;
};

const COUNT_OPTIONS = [5, 10, 25, 50];

function fmtRunDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const today     = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const runDay    = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  if (runDay.getTime() === today.getTime())     return `Today ${time}`;
  if (runDay.getTime() === yesterday.getTime()) return `Yesterday ${time}`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ` ${time}`;
}

export default function DashboardAgentActivity({ initialRun }: { initialRun: Run | null }) {
  const [run, setRun]         = useState<Run | null>(initialRun);
  const [running, setRunning] = useState(initialRun?.status === 'running');
  const [count, setCount]     = useState(10);
  const [errMsg, setErrMsg]   = useState<string | null>(null);
  const router = useRouter();
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const supabase = createClient();
    // Keep run info fresh via Realtime
    const channel = supabase
      .channel('dashboard-pipeline-runs')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pipeline_runs' },
        (payload) => {
          const updated = payload.new as Run;
          setRun(prev => {
            if (!prev || updated.started_at >= prev.started_at) return updated;
            return prev;
          });
          if (updated.status === 'complete' || updated.status === 'error') {
            setRunning(false);
            router.refresh();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      cleanupRef.current?.();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    const channel = supabase
      .channel(`dash-run-${runId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'pipeline_runs', filter: `id=eq.${runId}` },
        (payload) => {
          const { status } = payload.new as { status: string };
          if (status === 'complete' || status === 'error') {
            supabase.removeChannel(channel);
            cleanupRef.current = null;
            if (status === 'error') {
              setErrMsg('Pipeline run failed. Run Scout only works when the Next.js server is running locally.');
            }
            setRunning(false);
            router.refresh();
          }
        }
      )
      .subscribe(async () => {
        const { data } = await supabase
          .from('pipeline_runs')
          .select('status')
          .eq('id', runId!)
          .single();
        if (data && (data.status === 'complete' || data.status === 'error')) {
          supabase.removeChannel(channel);
          cleanupRef.current = null;
          if (data.status === 'error') {
            setErrMsg('Pipeline run failed. Run Scout only works when the Next.js server is running locally.');
          }
          setRunning(false);
          router.refresh();
        }
      });

    cleanupRef.current = () => supabase.removeChannel(channel);
  }

  const isLive = running || run?.status === 'running';

  return (
    <div className="card">
      {/* Header */}
      <div className="card-header" style={{ justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: 'var(--muted)' }}>
          Agent Activity
        </span>
        <span style={{
          display: 'flex', alignItems: 'center', gap: 5,
          fontSize: 11, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase',
          color: isLive ? 'var(--green)' : 'var(--muted)',
        }}>
          <span style={{
            width: 7, height: 7, borderRadius: '50%', display: 'inline-block',
            background: isLive ? 'var(--green)' : 'var(--border)',
            boxShadow: isLive ? '0 0 0 3px rgba(34,197,94,0.2)' : 'none',
          }} />
          {isLive ? 'LIVE' : 'IDLE'}
        </span>
      </div>

      <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Last run info */}
        <div style={{ fontSize: 13, color: 'var(--muted)' }}>
          {run ? (
            <span>
              Last run: <span style={{ color: 'var(--text)' }}>{fmtRunDate(run.started_at)}</span>
              {run.leads_found     != null && <span> · {run.leads_found} found</span>}
              {run.leads_qualified != null && <span> · {run.leads_qualified} qualified</span>}
            </span>
          ) : (
            'No pipeline runs yet.'
          )}
        </div>

        {/* Count picker */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--muted)' }}>
            Results
          </span>
          {COUNT_OPTIONS.map(n => (
            <button
              key={n}
              type="button"
              onClick={() => setCount(n)}
              disabled={running}
              style={{
                fontSize: 12, fontWeight: 600,
                padding: '4px 10px', borderRadius: 6,
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

        {/* Run button */}
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
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 8, padding: '8px 12px',
            fontSize: 12, color: 'var(--red)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8,
          }}>
            <span>{errMsg}</span>
            <button type="button" onClick={() => setErrMsg(null)}
              style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', padding: '0 2px', fontSize: 14, lineHeight: 1, flexShrink: 0 }}>✕</button>
          </div>
        )}
      </div>
    </div>
  );
}
