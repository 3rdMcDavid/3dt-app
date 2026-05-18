'use client';

import { useState } from 'react';
import { useFormStatus } from 'react-dom';
import { signContractFromPortalAction } from '../actions';

function SubmitButton({ agreed }: { agreed: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className="btn-portal-primary"
      style={{ width: '100%' }}
      disabled={!agreed || pending}
    >
      {pending ? 'Signing…' : 'Sign Agreement →'}
    </button>
  );
}

type Props = {
  token: string;
  clientName: string;
  projectTitle: string;
  contractContent: string;
};

export default function PortalSignStep({ token, clientName, projectTitle, contractContent }: Props) {
  const [agreed, setAgreed] = useState(false);

  return (
    <div style={{ padding: '24px 16px 80px' }}>
      <div className="portal-header">
        <p className="portal-subtitle">Step 1 of 2</p>
        <h1 className="portal-welcome">Sign Your Contract</h1>
        <p style={{ fontSize: 13, color: 'var(--p-muted)', marginTop: 4 }}>
          Welcome, {clientName}. Review and sign your agreement for{' '}
          <strong style={{ color: 'var(--p-text)' }}>{projectTitle}</strong> to get started.
        </p>
      </div>

      {/* Progress indicator */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <div style={{ flex: 1, height: 4, borderRadius: 4, background: 'var(--p-green)' }} />
        <div style={{ flex: 1, height: 4, borderRadius: 4, background: 'var(--p-border)' }} />
      </div>

      {/* Contract body */}
      {contractContent ? (
        <div className="portal-card" style={{ marginBottom: 20, maxHeight: 360, overflowY: 'auto', padding: '20px 18px' }}>
          <p className="portal-section-title" style={{ marginBottom: 12 }}>Service Agreement</p>
          {contractContent.split('\n').map((line: string, i: number) =>
            line.trim()
              ? <p key={i} style={{ fontSize: 13, color: 'var(--p-muted)', lineHeight: 1.7, marginBottom: 8 }}>{line}</p>
              : <br key={i} />
          )}
        </div>
      ) : (
        <div className="portal-card" style={{ marginBottom: 20 }}>
          <p style={{ color: 'var(--p-muted)', fontSize: 13 }}>Contract is being prepared. Check back shortly.</p>
        </div>
      )}

      {/* Signing form */}
      <div className="portal-card">
        <p className="portal-section-title" style={{ marginBottom: 16 }}>Sign Agreement</p>
        <form action={signContractFromPortalAction}>
          <input type="hidden" name="token" value={token} />
          <div style={{ marginBottom: 16 }}>
            <label className="portal-label">Full Legal Name</label>
            <input
              type="text"
              name="signature_name"
              placeholder="Type your full name"
              required
              autoComplete="name"
            />
          </div>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 20, cursor: 'pointer' }}>
            <input
              type="checkbox"
              style={{ width: 'auto', marginTop: 2, accentColor: 'var(--p-green)' }}
              checked={agreed}
              onChange={e => setAgreed(e.target.checked)}
            />
            <span style={{ fontSize: 13, color: 'var(--p-muted)', lineHeight: 1.6 }}>
              I have read and agree to the terms of this agreement
            </span>
          </label>
          <SubmitButton agreed={agreed} />
        </form>
      </div>

      <p style={{ fontSize: 12, color: 'var(--p-muted)', textAlign: 'center', marginTop: 16 }}>
        Questions? Email{' '}
        <a href="mailto:3rddavidstechnology@gmail.com" style={{ color: 'var(--p-green)' }}>
          3rddavidstechnology@gmail.com
        </a>
      </p>
    </div>
  );
}
