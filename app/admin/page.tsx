export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

function getActionLabel(stage: string, projectType: string): string {
  const pt = projectType ?? 'website';
  const isToolOnly = pt === 'tool';
  const isBoth = pt === 'website_tool';
  const word = isBoth ? 'Build & Draft' : isToolOnly ? 'Build' : 'Draft';
  switch (stage) {
    case 'intake_received':          return `Intake received — build ${word} 1`;
    case 'revision_1_received':      return `${word} 1 feedback — build ${word} 2`;
    case 'revision_2_received':      return `${word} 2 feedback — build Final`;
    case 'extra_revision_requested': return 'Extra revision requested — re-send Final';
    default: return stage;
  }
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const ACTION_STAGES = [
    'intake_received',
    'revision_1_received',
    'revision_2_received',
    'extra_revision_requested',
  ];

  const [
    { count: clientCount },
    { count: projectCount },
    { count: unpaidCount },
    { data: actionProjects },
    { data: newLeads },
  ] = await Promise.all([
    supabase.from('clients').select('*', { count: 'exact', head: true }),
    supabase.from('projects').select('*', { count: 'exact', head: true }).neq('stage', 'launched'),
    supabase.from('invoices').select('*', { count: 'exact', head: true }).eq('status', 'unpaid'),
    supabase
      .from('projects')
      .select('id, title, revision_stage, project_type, clients(name)')
      .in('revision_stage', ACTION_STAGES)
      .order('created_at', { ascending: true }),
    supabase
      .from('clients')
      .select('id, name, email, created_at, notes')
      .eq('status', 'lead')
      .order('created_at', { ascending: false }),
  ]);

  return (
    <>
      <div className="admin-topbar">
        <span className="topbar-title">Dashboard</span>
      </div>
      <div className="admin-content">
        <div className="stat-grid">
          <Link href="/admin/clients" className="stat-card stat-card-link">
            <div className="stat-label">Total Clients</div>
            <div className="stat-value">{clientCount ?? 0}</div>
          </Link>
          <Link href="/admin/projects" className="stat-card stat-card-link">
            <div className="stat-label">Active Projects</div>
            <div className="stat-value">{projectCount ?? 0}</div>
          </Link>
          <Link href="/admin/projects" className="stat-card stat-card-link">
            <div className="stat-label">Unpaid Invoices</div>
            <div className="stat-value" style={{ color: unpaidCount ? 'var(--red)' : 'inherit' }}>
              {unpaidCount ?? 0}
            </div>
          </Link>
        </div>

        {newLeads && newLeads.length > 0 && (
          <div className="card" style={{ marginTop: 8 }}>
            <div className="card-header" style={{ borderBottom: '1px solid var(--border)', padding: '14px 20px' }}>
              <span className="card-title" style={{ color: 'var(--green)' }}>
                🆕 New Leads ({newLeads.length})
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {newLeads.map((lead: any, i: number) => (
                <Link
                  key={lead.id}
                  href={`/admin/clients/${lead.id}`}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '14px 20px',
                    borderTop: i === 0 ? 'none' : '1px solid var(--border)',
                    transition: 'background 0.12s',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: 2 }}>{lead.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                      {lead.email}&nbsp;·&nbsp;
                      {new Date(lead.created_at).toLocaleDateString('en-US', { timeZone: 'America/Chicago' })}
                    </div>
                    {lead.notes && (
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                        {lead.notes.length > 80 ? lead.notes.slice(0, 80) + '…' : lead.notes}
                      </div>
                    )}
                  </div>
                  <span style={{ fontSize: 13, color: 'var(--accent-lt)' }}>View →</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {actionProjects && actionProjects.length > 0 ? (
          <div className="card" style={{ marginTop: 8 }}>
            <div className="card-header" style={{ borderBottom: '1px solid var(--border)', padding: '14px 20px' }}>
              <span className="card-title" style={{ color: 'var(--orange)' }}>
                ⚡ Needs Your Attention ({actionProjects.length})
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {actionProjects.map((p: any, i: number) => (
                <Link
                  key={p.id}
                  href={`/admin/projects/${p.id}`}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '14px 20px',
                    borderTop: i === 0 ? 'none' : '1px solid var(--border)',
                    transition: 'background 0.12s',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: 2 }}>{p.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                      {(p as any).clients?.name} &nbsp;·&nbsp; {getActionLabel(p.revision_stage, (p as any).project_type)}
                    </div>
                  </div>
                  <span style={{ fontSize: 13, color: 'var(--accent-lt)' }}>Open →</span>
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <div className="card" style={{ marginTop: 8 }}>
            <div className="card-body" style={{ textAlign: 'center', padding: '40px 48px' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>✅</div>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>All caught up</div>
              <p style={{ color: 'var(--muted)' }}>No projects waiting on you right now.</p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
