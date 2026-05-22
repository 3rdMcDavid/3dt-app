'use client';

import { useFormStatus } from 'react-dom';
import { onboardClientAction } from '@/app/admin/clients/actions';

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
          Creates a project, generates the contract, sets up the deposit invoice with a Stripe
          payment link, marks the client active, and sends their portal link — all in one step.
        </p>
        <form action={onboardClientAction}>
          <input type="hidden" name="client_id" value={clientId} />
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Project Title</label>
              <input
                name="title"
                type="text"
                required
                defaultValue={`${firstName}'s Website`}
                placeholder="e.g. Johnson's Landscaping Website"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Deposit Amount ($)</label>
              <input
                name="deposit_amount"
                type="number"
                step="0.01"
                min="1"
                required
                defaultValue="250"
                placeholder="250.00"
                style={{ maxWidth: 160 }}
              />
            </div>
          </div>
          <div className="form-actions">
            <SubmitButton />
          </div>
        </form>
      </div>
    </div>
  );
}
