export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import type { Client } from '@/lib/types';
import ClientCard from '@/app/admin/clients/components/ClientCard';

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
              <ClientCard key={c.id} c={c} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
