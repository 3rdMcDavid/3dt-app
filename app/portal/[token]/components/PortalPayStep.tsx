type Props = {
  token: string;
  projectTitle: string;
  stripeUrl: string | null;
  signatureName: string;
};

export default function PortalPayStep({ projectTitle, stripeUrl, signatureName }: Props) {
  return (
    <div style={{ padding: '24px 16px 80px' }}>
      <div className="portal-header">
        <p className="portal-subtitle">Step 2 of 2</p>
        <h1 className="portal-welcome">Pay Your Deposit</h1>
        <p style={{ fontSize: 13, color: 'var(--p-muted)', marginTop: 4 }}>
          Contract signed{signatureName ? ` by ${signatureName}` : ''}. Pay your deposit to unlock your project portal.
        </p>
      </div>

      {/* Progress indicator */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <div style={{ flex: 1, height: 4, borderRadius: 4, background: 'var(--p-green)' }} />
        <div style={{ flex: 1, height: 4, borderRadius: 4, background: 'var(--p-green)' }} />
      </div>

      {/* Deposit card */}
      <div className="portal-card" style={{ marginBottom: 16 }}>
        <p className="portal-section-title" style={{ marginBottom: 16 }}>Deposit Due</p>
        <div className="portal-status-row">
          <span className="portal-status-label">Project</span>
          <span className="portal-status-value">{projectTitle}</span>
        </div>
        <div className="portal-status-row">
          <span className="portal-status-label">Total</span>
          <span className="portal-status-value">$500.00</span>
        </div>
        <div className="portal-status-row">
          <span className="portal-status-label">Due Now</span>
          <span className="portal-status-value" style={{ color: '#92400E', fontWeight: 700 }}>$250.00 deposit</span>
        </div>
        <div className="portal-status-row">
          <span className="portal-status-label">Final</span>
          <span className="portal-status-value">$250.00 (due on completion)</span>
        </div>
      </div>

      {stripeUrl ? (
        <a
          href={stripeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="portal-btn"
          style={{ display: 'block', textAlign: 'center' }}
        >
          Pay $250 Deposit →
        </a>
      ) : (
        <div className="portal-card" style={{ textAlign: 'center', padding: 20 }}>
          <p style={{ fontSize: 13, color: 'var(--p-muted)' }}>
            Your payment link is being generated. Please check back in a moment or contact us directly.
          </p>
        </div>
      )}

      <p style={{ fontSize: 12, color: 'var(--p-muted)', textAlign: 'center', marginTop: 20 }}>
        Secure payment via Stripe. Questions? Email{' '}
        <a href="mailto:3rddavidstechnology@gmail.com" style={{ color: 'var(--p-green)' }}>
          3rddavidstechnology@gmail.com
        </a>
      </p>
    </div>
  );
}
