import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { createProjectAction } from '@/app/admin/projects/actions';

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ client_id?: string }>;
}) {
  const { client_id } = await searchParams;
  const supabase = await createClient();
  const { data: clients } = await supabase
    .from('clients')
    .select('id, name')
    .order('name');

  return (
    <>
      <div className="admin-topbar">
        <span className="topbar-title">New Project</span>
      </div>
      <div className="admin-content">
        <Link href={client_id ? `/admin/clients/${client_id}` : '/admin/projects'} className="back-link">
          ← {client_id ? 'Client' : 'Projects'}
        </Link>
        <div className="card" style={{ maxWidth: 560 }}>
          <div className="card-header"><span className="card-title">Project Details</span></div>
          <div className="card-body">
            <form action={createProjectAction}>
              <div className="form-grid">
                <div className="form-group form-full">
                  <label className="form-label" htmlFor="title">Project Title *</label>
                  <input id="title" name="title" type="text" required placeholder="Website Redesign" />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="client_id">Client *</label>
                  <select id="client_id" name="client_id" required defaultValue={client_id || ''}>
                    <option value="" disabled>Select client…</option>
                    {clients?.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="project_type">Project Type</label>
                  <select id="project_type" name="project_type">
                    <option value="website">Website</option>
                    <option value="tool">Custom Tool / Automation</option>
                    <option value="website_tool">Website + Tool</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="stage">Stage</label>
                  <select id="stage" name="stage">
                    <option value="discovery">Discovery</option>
                    <option value="contract">Contract</option>
                    <option value="build">Build</option>
                    <option value="review">Review</option>
                    <option value="handoff_pending">Handoff Pending</option>
                    <option value="launched">Launched</option>
                  </select>
                </div>
                <div className="form-group form-full">
                  <label className="form-label" htmlFor="notes">Notes</label>
                  <textarea id="notes" name="notes" placeholder="Internal notes about this project…" />
                </div>
              </div>
              <div className="form-actions">
                <button type="submit" className="btn btn-primary">Create Project</button>
                <Link href={client_id ? `/admin/clients/${client_id}` : '/admin/projects'} className="btn btn-ghost">Cancel</Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
