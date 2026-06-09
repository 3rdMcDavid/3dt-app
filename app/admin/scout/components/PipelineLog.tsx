'use client';

import { useState } from 'react';

type Run = {
  id: string;
  status: 'running' | 'complete' | 'error';
  started_at: string;
  leads_found: number | null;
  leads_qualified: number | null;
};

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

const STATUS: Record<string, { icon: string; color: string }> = {
  complete: { icon: '✓', color: 'var(--green)' },
  error:    { icon: '✗', color: 'var(--red)' },
  running:  { icon: '⏳', color: 'var(--orange)' },
};

export default function PipelineLog({ initialRuns }: { initialRuns: Run[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 8 }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: 0, marginBottom: open ? 12 : 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--muted)' }}>
            Pipeline Log
          </span>
          {initialRuns.length > 0 && (
            <span style={{
              fontSize: 11, fontWeight: 700, background: 'var(--border)', color: 'var(--muted)',
              borderRadius: 10, padding: '1px 7px',
            }}>
              {initialRuns.length}
            </span>
          )}
        </div>
        <span style={{ color: 'var(--muted)', fontSize: 11 }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        initialRuns.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', padding: '12px 0' }}>
            No runs yet.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {initialRuns.map(run => {
              const s = STATUS[run.status] ?? STATUS.running;
              return (
                <div key={run.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '9px 12px',
                  background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8,
                  gap: 8,
                }}>
                  <span style={{ fontSize: 12, color: 'var(--muted)', flexShrink: 0 }}>
                    {fmtRunDate(run.started_at)}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--text)', flex: 1, textAlign: 'right' }}>
                    {[
                      run.leads_found     != null ? `${run.leads_found} found`     : null,
                      run.leads_qualified != null ? `${run.leads_qualified} qualified` : null,
                    ].filter(Boolean).join(' · ')}
                  </span>
                  <span style={{ color: s.color, fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                    {s.icon}
                  </span>
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}
