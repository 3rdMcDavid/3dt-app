export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import type { Client } from '@/lib/types';
import { updateClientStatusAction, deleteClientAction } from '@/app/admin/clients/actions';

export default async function ClientsPage() {
  const supabase = await createClient();
  const { data: clients } = await supabase
    .from('clients')
    .select('*')
    .order('created_at', { ascending: false });

  return (
    <>
      <div className="admin-topbar">
        <span className="topbar-title">Clients</span>
        <div className="topbar-actions">
          <Link href="/admin/clients/new" className="btn btn-primary btn-sm">+ New Client</Link>
        </div>
      </div>
      <div className="admin-content">
        {!clients?.length ? (
          <div className="card">
            <div className="card-body" style={{ textAlign: 'center', padding: 40 }}>
              <p style={{ color: 'var(--muted)', marginBottom: 16 }}>No clients yet.</p>
              <Link href="/admin/clients/new" className="btn btn-primary btn-sm">Add your first client</Link>
            </div>
          </div>
        ) : (
          <div className="client-grid">
            {clients.map((c: Client) => (
              <div key={c.id} className="client-card">
                <div className="client-card-top">
                  <div>
                    <div className="client-card-name">{c.name}</div>
                    <div className="client-card-meta">{c.email}{c.phone ? ` · ${c.phone}` : ''}</div>
                  </div>
                  <span className={`badge badge-${c.status}`}>{c.status}</span>
                </div>

                {c.notes && (
                  <div className="client-card-notes">
                    {c.notes.length > 100 ? c.notes.slice(0, 100) + '…' : c.notes}
                  </div>
                )}

                <div className="client-card-actions">
                  <Link href={`/admin/clients/${c.id}`} className="btn btn-ghost btn-sm">
                    View
                  </Link>

                  {c.status === 'lead' && (
                    <form action={updateClientStatusAction} style={{ flex: 1 }}>
                      <input type="hidden" name="id" value={c.id} />
                      <input type="hidden" name="status" value="active" />
                      <button type="submit" className="btn btn-primary btn-sm" style={{ width: '100%' }}>
                        → Activate
                      </button>
                    </form>
                  )}

                  {c.status === 'active' && (
                    <form action={updateClientStatusAction} style={{ flex: 1 }}>
                      <input type="hidden" name="id" value={c.id} />
                      <input type="hidden" name="status" value="completed" />
                      <button type="submit" className="btn btn-ghost btn-sm" style={{ width: '100%' }}>
                        → Complete
                      </button>
                    </form>
                  )}

                  <form action={deleteClientAction}>
                    <input type="hidden" name="id" value={c.id} />
                    <button
                      type="submit"
                      className="btn btn-ghost btn-sm"
                      style={{ color: 'var(--red)' }}
                      onClick={e => { if (!confirm('Delete this client?')) e.preventDefault(); }}
                    >
                      Delete
                    </button>
                  </form>
                </div>

                <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                  Added {new Date(c.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
