'use client';

import { useFormStatus } from 'react-dom';
import { useState } from 'react';
import { onboardClientAction } from '@/app/admin/clients/actions';
import ScopeSelector from './ScopeSelector';

function SubmitButton({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary" disabled={pending || disabled} style={{ minWidth: 180 }}>
      {pending ? 'Setting up…' : 'Create Project →'}
    </button>
  );
}

const TYPE_OPTIONS = [
  { value: 'website',      label: 'Website',                   desc: 'New site build or redesign' },
  { value: 'tool',         label: 'Custom Tool / Automation',  desc: 'Business tool, workflow, or custom build' },
  { value: 'website_tool', label: 'Website + Tool',            desc: 'Both a site and a custom build' },
];

export default function OnboardForm({
  clientId,
  clientName,
  defaultOpen = true,
}: {
  clientId: string;
  clientName: string;
  /** true = first project for a new lead (form shown immediately).
   *  false = returning client (form hidden behind a button). */
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [projectType, setProjectType] = useState<'website' | 'tool' | 'website_tool'>('website');
  const [scopeTotal, setScopeTotal] = useState(0);

  const firstName = clientName.split(' ')[0];

  const defaultTitle =
    projectType === 'tool'         ? `${firstName}'s Custom Tool` :
    projectType === 'website_tool' ? `${firstName}'s Website + Tool` :
                                     `${firstName}'s Website`;

  // Collapsed state — returning client
  if (!open) {
    return (
      <div className="card section" style={{ borderStyle: 'dashed' }}>
        <div className="card-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>Add Another Project</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>
              Scope, contract, invoices, Stripe link, and portal email — all in one click.
            </div>
          </div>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => setOpen(true)}
            style={{ flexShrink: 0 }}
          >
            + New Project
          </button>
        </div>
      </div>
    );
  }

  // Expanded form
  return (
    <div className="card section">
      <div className="card-header">
        <span className="card-title" style={{ color: 'var(--green)' }}>
          {defaultOpen ? '🚀 Onboard This Client' : '+ New Project'}
        </span>
        {!defaultOpen && (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setOpen(false)}
          >
            Cancel
          </button>
        )}
      </div>
      <div className="card-body">
        <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20, lineHeight: 1.6 }}>
          Select the project type, agreed scope, and adjust prices if needed, then hit Create Project.
          This creates the project, contract, both invoices, a live Stripe deposit link, and sends the
          client their portal — one click.
        </p>
        <form action={onboardClientAction}>
          <input type="hidden" name="client_id" value={clientId} />
          <input type="hidden" name="project_type" value={projectType} />

          {/* Project Type */}
          <div className="form-group" style={{ marginBottom: 24 }}>
            <label className="form-label">Project Type</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 6 }}>
              {TYPE_OPTIONS.map(opt => (
                <label
                  key={opt.value}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 14px',
                    borderRadius: 8,
                    border: `1px solid ${projectType === opt.value ? 'var(--green)' : 'var(--border)'}`,
                    background: projectType === opt.value ? 'rgba(27,77,46,0.06)' : 'var(--surface)',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="radio"
                    name="_project_type_radio"
                    value={opt.value}
                    checked={projectType === opt.value}
                    onChange={() => setProjectType(opt.value as typeof projectType)}
                    style={{ width: 'auto', accentColor: 'var(--green)', flexShrink: 0 }}
                  />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{opt.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>{opt.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Project Title */}
          <div className="form-group" style={{ marginBottom: 24 }}>
            <label className="form-label">Project Title</label>
            <input
              name="title"
              type="text"
              required
              key={defaultTitle}
              defaultValue={defaultTitle}
              placeholder="e.g. Johnson's Landscaping Website"
              style={{ maxWidth: 400 }}
            />
          </div>

          <ScopeSelector projectType={projectType} onTotalChange={setScopeTotal} />

          <div className="form-actions" style={{ marginTop: 20 }}>
            <SubmitButton disabled={scopeTotal === 0} />
          </div>
        </form>
      </div>
    </div>
  );
}
