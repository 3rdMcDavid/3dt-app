import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { updateClientAction } from '@/app/admin/clients/actions';
import type { Client } from '@/lib/types';

export default async function EditClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const result = await supabase.from('clients').select('*').eq('id', id).single();
  const client = result.data as Client | null;
  if (!client) notFound();

  return (
    <>
      <div className="admin-topbar">
        <span className="topbar-title">Edit Client</span>
      </div>
      <div className="admin-content">
        <Link href={`/admin/clients/${id}`} className="back-link">← {client.name}</Link>
        <div className="card" style={{ maxWidth: 560 }}>
          <div className="card-header"><span className="card-title">Client Details</span></div>
          <div className="card-body">
            <form action={updateClientAction}>
              <input type="hidden" name="id" value={id} />
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label" htmlFor="name">Name *</label>
                  <input id="name" name="name" type="text" required defaultValue={client.name} />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="email">Email *</label>
                  <input id="email" name="email" type="email" required defaultValue={client.email} />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="phone">Phone</label>
                  <input id="phone" name="phone" type="tel" defaultValue={client.phone || ''} />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="company">Company <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(optional)</span></label>
                  <input id="company" name="company" type="text" defaultValue={client.company || ''} placeholder="Business or organization name" />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="status">Status</label>
                  <select id="status" name="status" defaultValue={client.status}>
                    <option value="lead">Lead</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>
              <div className="form-actions">
                <button type="submit" className="btn btn-primary">Save Changes</button>
                <Link href={`/admin/clients/${id}`} className="btn btn-ghost">Cancel</Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
