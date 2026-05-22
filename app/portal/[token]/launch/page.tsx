import { createServiceClient } from '@/lib/supabase/service';
import { notFound } from 'next/navigation';
import { saveLaunchInfoAction } from '../actions';

export default async function PortalLaunchPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = createServiceClient();

  const { data: session } = await supabase
    .from('portal_sessions')
    .select('project_id')
    .eq('token', token)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (!session) notFound();

  const { data: project } = await supabase
    .from('projects')
    .select('title, project_type, client_vercel_email, client_github_username, launch_notes, launch_submitted_at, launch_confirmed_at')
    .eq('id', session.project_id)
    .single();

  if (!project) notFound();

  const submitted = !!(project as any).launch_submitted_at;
  const confirmed = !!(project as any).launch_confirmed_at;
  const isTool = (project as any).project_type === 'tool';

  // ── Tool delivery page ─────────────────────────────────────────────────────
  if (isTool) {
    return (
      <>
        <div className="portal-header">
          <p className="portal-subtitle">{(project as any).title}</p>
          <h1 className="portal-welcome">Delivery</h1>
        </div>

        {confirmed ? (
          <div className="portal-card" style={{ textAlign: 'center', padding: '28px 20px' }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>✅</div>
            <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>Delivered!</p>
            <p style={{ fontSize: 13, color: 'var(--p-muted)', lineHeight: 1.6 }}>
              Your tool has been delivered. Check your email for access details and instructions.
              Questions? Email us at 3rddavidstechnology@gmail.com
            </p>
          </div>
        ) : (
          <>
            <div className="portal-card">
              <p style={{ fontSize: 14, color: 'var(--p-muted)', lineHeight: 1.65 }}>
                Your tool is complete! David is preparing everything for delivery — files, access credentials, and instructions will be sent to your email shortly.
                No action is needed on your end right now.
              </p>
            </div>

            {!submitted ? (
              <form action={saveLaunchInfoAction}>
                <input type="hidden" name="token" value={token} />
                <input type="hidden" name="project_id" value={session.project_id} />
                <div className="portal-card" style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--p-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Questions or notes for David <span style={{ fontWeight: 400 }}>(optional)</span>
                    </label>
                    <textarea
                      name="notes"
                      rows={3}
                      placeholder="Any questions about how to use your tool, preferred format for files, or anything else..."
                      style={{ fontSize: 14, resize: 'vertical' }}
                    />
                  </div>
                </div>
                <button type="submit" className="portal-btn">
                  Submit →
                </button>
              </form>
            ) : (
              <div className="portal-card">
                <span className="portal-badge portal-badge-green" style={{ fontSize: 13, padding: '5px 14px' }}>
                  ✓ Notes received
                </span>
                {(project as any).launch_notes && (
                  <p style={{ fontSize: 13, color: 'var(--p-muted)', marginTop: 12, lineHeight: 1.6 }}>
                    {(project as any).launch_notes}
                  </p>
                )}
                <p style={{ marginTop: 16, fontSize: 12, color: 'var(--p-muted)' }}>
                  Need to add anything? Email us at 3rddavidstechnology@gmail.com
                </p>
              </div>
            )}
          </>
        )}
      </>
    );
  }

  // ── Website launch page ────────────────────────────────────────────────────
  return (
    <>
      <div className="portal-header">
        <p className="portal-subtitle">{(project as any).title}</p>
        <h1 className="portal-welcome">Launch Setup</h1>
      </div>

      <div className="portal-card">
        <p style={{ fontSize: 14, color: 'var(--p-muted)', lineHeight: 1.65, marginBottom: 0 }}>
          To hand off your finished website, David just needs your Vercel account email.
          He handles everything else — including the domain, hosting setup, and transfer.
        </p>
      </div>

      {submitted ? (
        <div className="portal-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <span className="portal-badge portal-badge-green" style={{ fontSize: 13, padding: '5px 14px' }}>
              ✓ Launch info received
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--p-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>Vercel Email</p>
              <p style={{ fontSize: 14 }}>{(project as any).client_vercel_email || '—'}</p>
            </div>
            {(project as any).client_github_username && (
              <div>
                <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--p-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>GitHub Username</p>
                <p style={{ fontSize: 14 }}>{(project as any).client_github_username}</p>
              </div>
            )}
            {(project as any).launch_notes && (
              <div>
                <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--p-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>Notes</p>
                <p style={{ fontSize: 14, lineHeight: 1.6 }}>{(project as any).launch_notes}</p>
              </div>
            )}
          </div>
          <p style={{ marginTop: 20, fontSize: 12, color: 'var(--p-muted)', borderTop: '1px solid var(--p-border)', paddingTop: 16 }}>
            Need to update something? Email us at 3rddavidstechnology@gmail.com
          </p>
        </div>
      ) : (
        <form action={saveLaunchInfoAction}>
          <input type="hidden" name="token" value={token} />
          <input type="hidden" name="project_id" value={session.project_id} />

          <div className="portal-card" style={{ marginBottom: 12 }}>
            <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Step 1 — Create a Vercel account</p>
            <p style={{ fontSize: 13, color: 'var(--p-muted)', lineHeight: 1.6, marginBottom: 16 }}>
              Go to{' '}
              <a href="https://vercel.com/signup" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--p-accent)', textDecoration: 'underline' }}>
                vercel.com/signup
              </a>{' '}
              and create a free account if you don't already have one. Then enter the email you used below.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--p-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Your Vercel Email *
              </label>
              <input name="vercel_email" type="email" required placeholder="you@example.com" style={{ fontSize: 14 }} />
            </div>
          </div>

          <div className="portal-card" style={{ marginBottom: 12 }}>
            <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Step 2 — GitHub <span style={{ fontWeight: 400, color: 'var(--p-muted)' }}>(optional)</span></p>
            <p style={{ fontSize: 13, color: 'var(--p-muted)', lineHeight: 1.6, marginBottom: 16 }}>
              If you have a GitHub account and want your website's code transferred to you, enter your username.
              This is optional — most clients skip it.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--p-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                GitHub Username
              </label>
              <input name="github_username" type="text" placeholder="yourusername" style={{ fontSize: 14 }} />
            </div>
          </div>

          <div className="portal-card" style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--p-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Questions or notes <span style={{ fontWeight: 400, color: 'var(--p-muted)' }}>(optional)</span>
              </label>
              <textarea name="notes" rows={3} placeholder="Anything you want David to know about launch day..." style={{ fontSize: 14, resize: 'vertical' }} />
            </div>
          </div>

          <button type="submit" className="portal-btn">
            Submit Launch Info →
          </button>
        </form>
      )}
    </>
  );
}
