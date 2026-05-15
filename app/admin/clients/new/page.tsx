import Link from 'next/link';
import { createClientAction } from '@/app/admin/clients/actions';

export default function NewClientPage() {
  return (
    <>
      <div className="admin-topbar">
        <span className="topbar-title">New Client</span>
      </div>
      <div className="admin-content">
        <Link href="/admin/clients" className="back-link">← Clients</Link>
        <div className="card" style={{ maxWidth: 560 }}>
          <div className="card-header"><span className="card-title">Client Details</span></div>
          <div className="card-body">
            <form action={createClientAction}>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label" htmlFor="name">Name *</label>
                  <input id="name" name="name" type="text" required placeholder="Jane Smith" />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="email">Email *</label>
                  <input id="email" name="email" type="email" required placeholder="jane@example.com" />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="phone">Phone</label>
                  <input id="phone" name="phone" type="tel" placeholder="(555) 000-0000" />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="status">Status</label>
                  <select id="status" name="status">
                    <option value="lead">Lead</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>
              <div className="form-actions">
                <button type="submit" className="btn btn-primary">Create Client</button>
                <Link href="/admin/clients" className="btn btn-ghost">Cancel</Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
