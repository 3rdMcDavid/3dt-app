type Props = {
  projectTitle: string;
  stripeUrl: string | null;
  signatureName: string;
  depositAmount: number | null;
  finalAmount: number | null;
  projectType?: string;
};

export default function PortalPayStep({ projectTitle, stripeUrl, signatureName, depositAmount, finalAmount, projectType }: Props) {
  const fmt = (n: number) => `$${n % 1 === 0 ? n.toLocaleString('en-US') : n.toFixed(2)}`;

  const isBoth    = projectType === 'website_tool';
  const isToolOnly = projectType === 'tool';
  const transferWord = isBoth
    ? 'website and tool ownership transfer'
    : isToolOnly
    ? 'tool delivery'
    : 'website ownership transfer';

  return (
    <div style={{ padding: '24px 16px 80px' }}>
      <div className="portal-header">
        <p className="portal-subtitle">Step 2 of 2</p>
        <h1 className="portal-welcome">Pay Your Deposit</h1>
        <p style={{ fontSize: 13, color: 'var(--p-muted)', marginTop: 4 }}>
          Contract signed{signatureName ? ` by ${signatureName}` : ''}. Pay your deposit to kick off your project.
        </p>
      </div>

      {/* Progress indicator */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <div style={{ flex: 1, height: 4, borderRadius: 4, background: 'var(--p-green)' }} />
        <div style={{ flex: 1, height: 4, borderRadius: 4, background: 'var(--p-green)' }} />
      </div>

      {/* Payment breakdown card */}
      <div className="portal-card" style={{ marginBottom: 16 }}>
        <p className="portal-section-title" style={{ marginBottom: 16 }}>Payment Schedule</p>

        <div className="portal-status-row">
          <span className="portal-status-label">Project</span>
          <span className="portal-status-value">{projectTitle}</span>
        </div>

        {/* Deposit row — highlighted */}
        {depositAmount != null && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 0',
            borderTop: '1px solid var(--p-border)',
            borderBottom: '1px solid var(--p-border)',
            margin: '8px 0',
          }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--p-text)', marginBottom: 2 }}>
                Deposit — Due Now
              </p>
              <p style={{ fontSize: 11, color: 'var(--p-muted)' }}>
                50% of project total · paid to begin work
              </p>
            </div>
            <span style={{ fontSize: 18, fontWeight: 800, color: '#92400E' }}>
              {fmt(depositAmount)}
            </span>
          </div>
        )}

        {/* Final row — grayed out / upcoming */}
        {finalAmount != null && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '10px 0',
            opacity: 0.55,
          }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--p-text)', marginBottom: 2 }}>
                Final Payment — Due Before {isBoth ? 'Launch & Delivery' : isToolOnly ? 'Delivery' : 'Launch'}
              </p>
              <p style={{ fontSize: 11, color: 'var(--p-muted)' }}>
                50% remaining · due before {transferWord}
              </p>
            </div>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--p-text)' }}>
              {fmt(finalAmount)}
            </span>
          </div>
        )}
      </div>

      {/* Info note */}
      <div style={{
        background: 'rgba(27,77,46,0.06)',
        border: '1px solid rgba(27,77,46,0.15)',
        borderRadius: 10,
        padding: '12px 14px',
        marginBottom: 20,
        fontSize: 12,
        color: 'var(--p-muted)',
        lineHeight: 1.6,
      }}>
        💡 <strong style={{ color: 'var(--p-text)' }}>How payments work:</strong> Your deposit today starts the project.
        The final payment of {finalAmount != null ? fmt(finalAmount) : '50%'} is only due once you have
        approved the final version — and {transferWord} happens only after the final is received.
      </div>

      {stripeUrl ? (
        <a
          href={stripeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="portal-btn"
          style={{ display: 'block', textAlign: 'center' }}
        >
          {depositAmount != null ? `Pay ${fmt(depositAmount)} Deposit →` : 'Pay Deposit →'}
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
