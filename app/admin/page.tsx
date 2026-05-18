export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function DashboardPage() {
  const supabase = await createClient();

  const ACTION_STAGES = ['intake_received', 'revision_1_received', 'revision_2_received'];

  const ACTION_LABELS: Record<string, string> = {
    intake_received:    'Intake received — build Draft 1',
    revision_1_received:'Revision 1 feedback — build Draft 2',
    revision_2_received:'Revision 2 feedback — build Final',
  };

  const [
    { count: clientCount },
    { count: projectCount },
    { count: unpaidCount },
    { data: actionProjects },
  ] = await Promise.all([
    supabase.from('clients').select('*', { count: 'exact', head: true }),
    supabase.from('projects').select('*', { count: 'exact', head: true }).neq('stage', 'launched'),
    supabase.from('invoices').select('*', { count: 'exact', head: true }).eq('status', 'unpaid'),
    supabase
      .from('projects')
      .select('id, title, revision_stage, clients(name)')
      .in('revision_stage', ACTION_STAGES)
      .order('created_at', { ascending: true }),
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
                      {(p as any).clients?.name} &nbsp;·&nbsp; {ACTION_LABELS[p.revision_stage]}
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
