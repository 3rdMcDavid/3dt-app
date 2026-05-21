export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Client } from '@/lib/types';
import DeleteClientButton from './components/DeleteClientButton';
import { updateClientStatusAction } from '@/app/admin/clients/actions';

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
          <DeleteClientButton id={id} />
        </div>
      </div>
      <div className="admin-content">
        <Link href="/admin/clients" className="back-link">← Clients</Link>

        {/* Info card */}
        <div className="card section">
          <div className="card-header">
            <span className="card-title">Client Info</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className={`badge badge-${client.status}`}>{client.status}</span>
              {client.status === 'lead' && (
                <form action={updateClientStatusAction} style={{ display: 'inline' }}>
                  <input type="hidden" name="id" value={id} />
                  <input type="hidden" name="status" value="active" />
                  <button type="submit" className="btn btn-primary btn-sm">
                    Convert to Active Client →
                  </button>
                </form>
              )}
            </div>
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
                <span>{new Date(client.created_at).toLocaleDateString('en-US', { timeZone: 'America/Chicago' })}</span>
              </div>
            </div>
            {client.notes && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                <div className="form-label" style={{ marginBottom: 6 }}>Inquiry Notes</div>
                <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>{client.notes}</p>
              </div>
            )}
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
                        <td style={{ color: 'var(--muted)' }}>{new Date(p.created_at).toLocaleDateString('en-US', { timeZone: 'America/Chicago' })}</td>
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
