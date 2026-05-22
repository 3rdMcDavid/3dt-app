export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Suspense } from 'react';
import type { Client } from '@/lib/types';
import ClientCard from '@/app/admin/clients/components/ClientCard';
import ClientsFilterTabs from '@/app/admin/clients/components/ClientsFilterTabs';

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const supabase = await createClient();

  let clientsQuery = supabase
    .from('clients')
    .select('*')
    .order('created_at', { ascending: false });

  if (status) clientsQuery = clientsQuery.eq('status', status) as typeof clientsQuery;

  const [{ data: clients }, { data: all }] = await Promise.all([
    clientsQuery,
    supabase.from('clients').select('id, status'),
  ]);

  const counts: Record<string, number> = { '': all?.length ?? 0 };
  for (const c of all ?? []) {
    counts[c.status] = (counts[c.status] ?? 0) + 1;
  }

  return (
    <>
      <div className="admin-topbar">
        <span className="topbar-title">Clients</span>
        <div className="topbar-actions">
          <Link href="/admin/clients/new" className="btn btn-primary btn-sm">+ New Client</Link>
        </div>
      </div>
      <div className="admin-content">
        <Suspense>
          <ClientsFilterTabs counts={counts} />
        </Suspense>

        {!clients?.length ? (
          <div className="card" style={{ marginTop: 16 }}>
            <div className="card-body" style={{ textAlign: 'center', padding: 40 }}>
              <p style={{ color: 'var(--muted)', marginBottom: 16 }}>
                {status ? `No ${status} clients.` : 'No clients yet.'}
              </p>
              {!status && (
                <Link href="/admin/clients/new" className="btn btn-primary btn-sm">Add your first client</Link>
              )}
            </div>
          </div>
        ) : (
          <div className="client-grid" style={{ marginTop: 16 }}>
            {(clients as Client[]).map((c) => (
              <ClientCard key={c.id} c={c} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
