'use client';

import { useFormStatus } from 'react-dom';
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

export default function OnboardForm({
  clientId,
  clientName,
}: {
  clientId: string;
  clientName: string;
}) {
  const firstName = clientName.split(' ')[0];

  return (
    <div className="card section">
      <div className="card-header">
        <span className="card-title" style={{ color: 'var(--green)' }}>🚀 Onboard This Client</span>
      </div>
      <div className="card-body">
        <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20, lineHeight: 1.6 }}>
          Select the agreed scope, adjust prices if needed, then hit Onboard. Creates the project,
          contract with deliverables, both invoices, a live Stripe deposit link, and sends the
          client their portal — one click.
        </p>
        <form action={onboardClientAction}>
          <input type="hidden" name="client_id" value={clientId} />
          <div className="form-group" style={{ marginBottom: 24 }}>
            <label className="form-label">Project Title</label>
            <input
              name="title"
              type="text"
              required
              defaultValue={`${firstName}'s Website`}
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
