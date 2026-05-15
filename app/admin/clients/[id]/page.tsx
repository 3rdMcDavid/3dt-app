export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { deleteClientAction } from '@/app/admin/clients/actions';
import type { Client } from '@/lib/types';

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [clientResult, { data: projects }] = await Promise.all([
    supabase.from('clients').select('*').eq('id', id).single(),
    supabase.from('projects').select('*').eq('client_id', id).order('created_at', { ascending: false }),
  ]);
  const client = clientResult.data as Client | null;

  if (!client) notFound();

  return (
    <>
      <div className="admin-topbar">
        <span className="topbar-title">{client.name}</span>
        <div className="topbar-actions">
          <Link href={`/admin/clients/${id}/edit`} className="btn btn-ghost btn-sm">Edit</Link>
          <form action={deleteClientAction} style={{ display: 'inline' }}>
            <input type="hidden" name="id" value={id} />
            <button
              type="submit"
              className="btn btn-danger btn-sm"
              onClick={e => { if (!confirm('Delete this client and all their data?')) e.preventDefault(); }}
            >
              Delete
            </button>
          </form>
        </div>
      </div>
      <div className="admin-content">
        <Link href="/admin/clients" className="back-link">← Clients</Link>

        {/* Info card */}
        <div className="card section">
          <div className="card-header">
            <span className="card-title">Client Info</span>
            <span className={`badge badge-${client.status}`}>{client.status}</span>
          </div>
          <div className="card-body">
            <div className="detail-grid">
              <div className="detail-item">
                <label>Email</label>
                <span>{client.email}</span>
              </div>
              <div className="detail-item">
                <label>Phone</label>
                <span>{client.phone || '—'}</span>
              </div>
              <div className="detail-item">
                <label>Status</label>
                <span><span className={`badge badge-${client.status}`}>{client.status}</span></span>
              </div>
              <div className="detail-item">
                <label>Added</label>
                <span>{new Date(client.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Projects */}
        <div className="section">
          <div className="section-header">
            <span className="section-title">Projects ({projects?.length ?? 0})</span>
            <Link href={`/admin/projects/new?client_id=${id}`} className="btn btn-primary btn-sm">+ New Project</Link>
          </div>
          <div className="card">
            {!projects?.length ? (
              <div className="hub-section-empty">No projects yet. <Link href={`/admin/projects/new?client_id=${id}`}>Create one →</Link></div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Stage</th>
                      <th>Created</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.map((p: any) => (
                      <tr key={p.id}>
                        <td><Link href={`/admin/projects/${p.id}`} style={{ fontWeight: 600 }}>{p.title}</Link></td>
                        <td><span className={`badge badge-${p.stage}`}>{p.stage}</span></td>
                        <td style={{ color: 'var(--muted)' }}>{new Date(p.created_at).toLocaleDateString()}</td>
                        <td><Link href={`/admin/projects/${p.id}`} className="btn btn-ghost btn-sm">Open</Link></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
