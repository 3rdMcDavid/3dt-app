'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function RunScoutButton() {
  const [running, setRunning] = useState(false);
  const router = useRouter();
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => { cleanupRef.current?.(); };
  }, []);

  async function handleRun() {
    if (running) return;
    setRunning(true);

    let runId: string | null = null;
    try {
      const res = await fetch('/api/scout/run', { method: 'POST' });
      if (!res.ok) { setRunning(false); return; }
      runId = (await res.json()).runId ?? null;
    } catch {
      setRunning(false);
      return;
    }

    if (!runId) { setRunning(false); return; }

    const supabase = createClient();
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
            setRunning(false);
            router.refresh();
          }
        }
      )
      .subscribe();

    cleanupRef.current = () => supabase.removeChannel(channel);
  }

  return (
    <button
      type="button"
      className="btn btn-primary btn-full"
      onClick={handleRun}
      disabled={running}
      style={{ marginBottom: 4 }}
    >
      {running ? '⏳ Scouting…' : 'Run Scout ▶'}
    </button>
  );
}
