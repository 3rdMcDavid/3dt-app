export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function ProjectsPage() {
  const supabase = await createClient();
  const { data: projects } = await supabase
    .from('projects')
    .select('*, clients(name)')
    .order('created_at', { ascending: false });

  return (
    <>
      <div className="admin-topbar">
        <span className="topbar-title">Projects</span>
        <div className="topbar-actions">
          <Link href="/admin/projects/new" className="btn btn-primary btn-sm">+ New Project</Link>
        </div>
      </div>
      <div className="admin-content">
        <div className="card">
          {!projects?.length ? (
            <div className="empty-state card-body">
              <p>No projects yet.</p>
              <p><Link href="/admin/projects/new" className="btn btn-primary btn-sm" style={{ marginTop: 12 }}>Add your first project</Link></p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Client</th>
                    <th>Stage</th>
                    <th>Created</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((p: any) => (
                    <tr key={p.id}>
                      <td><Link href={`/admin/projects/${p.id}`} style={{ fontWeight: 600 }}>{p.title}</Link></td>
                      <td style={{ color: 'var(--muted)' }}>
                        <Link href={`/admin/clients/${p.client_id}`} style={{ color: 'var(--muted)' }}>{p.clients?.name}</Link>
                      </td>
                      <td><span className={`badge badge-${p.stage}`}>{p.stage}</span></td>
                      <td style={{ color: 'var(--muted)' }}>{new Date(p.created_at).toLocaleDateString()}</td>
                      <td>
                        <Link href={`/admin/projects/${p.id}`} className="btn btn-ghost btn-sm">Open</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
