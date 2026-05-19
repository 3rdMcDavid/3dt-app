import Link from 'next/link';

export default async function PaymentSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <div className="auth-wrap">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 20 }}>✅</div>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>Payment Received!</h1>
        <p style={{ color: 'var(--muted)', lineHeight: 1.7, marginBottom: 24 }}>
          Your payment has been received. You'll get a confirmation email shortly with
          your next steps.
        </p>
        {token && (
          <Link
            href={`/portal/${token}`}
            style={{
              display: 'inline-block',
              background: '#1B4D2E',
              color: '#fff',
              padding: '13px 28px',
              borderRadius: 8,
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: 15,
              marginBottom: 20,
            }}
          >
            Go to Your Portal →
          </Link>
        )}
        <p style={{ fontSize: 13, color: 'var(--muted)' }}>
          Questions? Email{' '}
          <a href="mailto:3rddavidstechnology@gmail.com" style={{ color: 'var(--green)' }}>
            3rddavidstechnology@gmail.com
          </a>
        </p>
      </div>
    </div>
  );
}
