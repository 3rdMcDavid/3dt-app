'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RunScoutButton() {
  const [running, setRunning] = useState(false);
  const router = useRouter();

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

    // Poll every 5s until complete — replaced by Realtime in step 9
    const poll = setInterval(async () => {
      try {
        const res = await fetch(`/api/scout/status?runId=${runId}`);
        if (!res.ok) return;
        const { status } = await res.json();
        if (status === 'complete' || status === 'error') {
          clearInterval(poll);
          setRunning(false);
          router.refresh();
        }
      } catch {
        // keep polling
      }
    }, 5000);
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
