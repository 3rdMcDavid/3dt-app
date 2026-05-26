import Link from 'next/link';

export default async function PaymentSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <div style={{
      minHeight: '100vh',
      background: '#F7F7F2',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px 16px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      <div style={{
        background: '#fff',
        border: '1px solid #E0E0D8',
        borderRadius: 16,
        padding: '40px 32px',
        maxWidth: 400,
        width: '100%',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1A1A1A', marginBottom: 12 }}>
          Payment Received!
        </h1>
        <p style={{ color: '#6B6B60', lineHeight: 1.7, marginBottom: 28, fontSize: 14 }}>
          Your payment has been received. You'll get a confirmation email shortly with your next steps.
        </p>
        {token && (
          <Link
            href={`/portal/${token}`}
            style={{
              display: 'block',
              background: '#1B4D2E',
              color: '#fff',
              padding: '14px 28px',
              borderRadius: 10,
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: 15,
              marginBottom: 20,
            }}
          >
            Go to Your Portal →
          </Link>
        )}
        <p style={{ fontSize: 12, color: '#9B9B8E' }}>
          Questions? Email{' '}
          <a href="mailto:3rddavidstechnology@gmail.com" style={{ color: '#1B4D2E' }}>
            3rddavidstechnology@gmail.com
          </a>
        </p>
      </div>
    </div>
  );
}
