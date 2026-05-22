'use client';

import { useFormStatus } from 'react-dom';
import { useState } from 'react';
import { onboardClientAction } from '@/app/admin/clients/actions';
import ScopeSelector from './ScopeSelector';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary" disabled={pending} style={{ minWidth: 180 }}>
      {pending ? 'Onboarding…' : 'Onboard Client →'}
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
}: {
  clientId: string;
  clientName: string;
}) {
  const firstName = clientName.split(' ')[0];
  const [projectType, setProjectType] = useState<'website' | 'tool' | 'website_tool'>('website');

  const defaultTitle =
    projectType === 'tool'         ? `${firstName}'s Custom Tool` :
    projectType === 'website_tool' ? `${firstName}'s Website + Tool` :
                                     `${firstName}'s Website`;

  return (
    <div className="card section">
      <div className="card-header">
        <span className="card-title" style={{ color: 'var(--green)' }}>🚀 Onboard This Client</span>
      </div>
      <div className="card-body">
        <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20, lineHeight: 1.6 }}>
          Select the project type, agreed scope, and adjust prices if needed, then hit Onboard.
          Creates the project, contract, both invoices, a live Stripe deposit link, and sends the
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

          <ScopeSelector />

          <div className="form-actions" style={{ marginTop: 20 }}>
            <SubmitButton />
          </div>
        </form>
      </div>
    </div>
  );
}
