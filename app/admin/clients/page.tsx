export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import type { Client } from '@/lib/types';

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
        <div className="card">
          {!clients?.length ? (
            <div className="empty-state card-body">
              <p>No clients yet.</p>
              <p><Link href="/admin/clients/new" className="btn btn-primary btn-sm" style={{ marginTop: 12 }}>Add your first client</Link></p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Status</th>
                    <th>Added</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((c: Client) => (
                    <tr key={c.id}>
                      <td><Link href={`/admin/clients/${c.id}`} style={{ fontWeight: 600 }}>{c.name}</Link></td>
                      <td style={{ color: 'var(--muted)' }}>{c.email}</td>
                      <td style={{ color: 'var(--muted)' }}>{c.phone || '—'}</td>
                      <td><span className={`badge badge-${c.status}`}>{c.status}</span></td>
                      <td style={{ color: 'var(--muted)' }}>{new Date(c.created_at).toLocaleDateString()}</td>
                      <td>
                        <Link href={`/admin/clients/${c.id}`} className="btn btn-ghost btn-sm">View</Link>
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
