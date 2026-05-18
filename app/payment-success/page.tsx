import Link from 'next/link';

export default function PaymentSuccessPage() {
  return (
    <div className="auth-wrap">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 20 }}>✅</div>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>Payment Received!</h1>
        <p style={{ color: 'var(--muted)', lineHeight: 1.7, marginBottom: 24 }}>
          Your payment has been received. You'll get a confirmation email shortly with
          your next steps.
        </p>
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
