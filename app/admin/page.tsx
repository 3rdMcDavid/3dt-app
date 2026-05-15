export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function DashboardPage() {
  const supabase = await createClient();

  const [{ count: clientCount }, { count: projectCount }, { count: unpaidCount }] =
    await Promise.all([
      supabase.from('clients').select('*', { count: 'exact', head: true }),
      supabase.from('projects').select('*', { count: 'exact', head: true }),
      supabase.from('invoices').select('*', { count: 'exact', head: true }).eq('status', 'unpaid'),
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

        <div className="empty-state card">
          <div className="card-body" style={{ textAlign: 'center', padding: '48px' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🚀</div>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>You&apos;re all set up</div>
            <p style={{ color: 'var(--muted)' }}>Add your first client to get started.</p>
          </div>
        </div>
      </div>
    </>
  );
}
