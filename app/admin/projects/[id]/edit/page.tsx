import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { updateProjectAction } from '@/app/admin/projects/actions';
import type { Project } from '@/lib/types';

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [projectResult, { data: clients }] = await Promise.all([
    supabase.from('projects').select('*').eq('id', id).single(),
    supabase.from('clients').select('id, name').order('name'),
  ]);
  const project = projectResult.data as Project | null;

  if (!project) notFound();

  return (
    <>
      <div className="admin-topbar">
        <span className="topbar-title">Edit Project</span>
      </div>
      <div className="admin-content">
        <Link href={`/admin/projects/${id}`} className="back-link">← {project.title}</Link>
        <div className="card" style={{ maxWidth: 560 }}>
          <div className="card-header"><span className="card-title">Project Details</span></div>
          <div className="card-body">
            <form action={updateProjectAction}>
              <input type="hidden" name="id" value={id} />
              <div className="form-grid">
                <div className="form-group form-full">
                  <label className="form-label" htmlFor="title">Project Title *</label>
                  <input id="title" name="title" type="text" required defaultValue={project.title} />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="client_id">Client *</label>
                  <select id="client_id" name="client_id" required defaultValue={project.client_id}>
                    {clients?.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="stage">Stage</label>
                  <select id="stage" name="stage" defaultValue={project.stage}>
                    <option value="discovery">Discovery</option>
                    <option value="contract">Contract</option>
                    <option value="build">Build</option>
                    <option value="review">Review</option>
                    <option value="handoff_pending">Handoff Pending</option>
                    <option value="launched">Launched</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="project_type">Project Type</label>
                  <select id="project_type" name="project_type" defaultValue={project.project_type}>
                    <option value="website">Website</option>
                    <option value="tool">Custom Tool / Automation</option>
                    <option value="website_tool">Website + Tool</option>
                  </select>
                </div>
                <div className="form-group form-full">
                  <label className="form-label" htmlFor="notes">Notes</label>
                  <textarea id="notes" name="notes" defaultValue={project.notes || ''} />
                </div>
              </div>
              <div className="form-actions">
                <button type="submit" className="btn btn-primary">Save Changes</button>
                <Link href={`/admin/projects/${id}`} className="btn btn-ghost">Cancel</Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
