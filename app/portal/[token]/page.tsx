import { createServiceClient } from '@/lib/supabase/service';
import { notFound } from 'next/navigation';
import Link from 'next/link';

function getActionCta(stage: string, projectType: string): { label: string; href: string } | undefined {
  const isBoth     = projectType === 'website_tool';
  const isToolOnly = projectType === 'tool';
  const BuildWord  = isBoth ? 'Build & Draft' : isToolOnly ? 'Build' : 'Draft';
  const map: Partial<Record<string, { label: string; href: string }>> = {
    awaiting_intake: { label: 'Complete your intake form →',     href: 'intake' },
    revision_1_open: { label: `Review ${BuildWord} 1 →`,         href: 'intake' },
    revision_2_open: { label: `Review ${BuildWord} 2 →`,         href: 'intake' },
    post_final_open: { label: 'Review & approve final →',        href: 'intake' },
  };
  return map[stage];
}

function progressLabel(stage: string, projectType: string): string {
  const isBoth     = projectType === 'website_tool';
  const isToolOnly = projectType === 'tool';
  const buildWord  = isBoth ? 'build and draft' : isToolOnly ? 'build' : 'draft';
  const BuildWord  = isBoth ? 'Build & Draft'   : isToolOnly ? 'Build' : 'Draft';
  const map: Record<string, string> = {
    awaiting_intake:          'Complete your intake form to get started',
    intake_received:          `Intake received — first ${buildWord} in progress`,
    revision_1_open:          `${BuildWord} 1 is ready for your review`,
    revision_1_received:      'Feedback received — updates in progress',
    revision_2_open:          `${BuildWord} 2 is ready for your review`,
    revision_2_received:      'Feedback received — final version in progress',
    post_final_open:          'Final version is ready for your approval',
    extra_revision_requested: 'Extra revision requested — updates in progress',
    complete:                 'Project complete — thank you!',
  };
  return map[stage] ?? 'In progress';
}

export default async function PortalHomePage({
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

  const projectId = session.project_id;

  const [{ data: project }, { data: contract }, { data: invoices }] = await Promise.all([
    supabase.from('projects').select('*, clients(*)').eq('id', projectId).single(),
    supabase.from('contracts').select('signed_at').eq('project_id', projectId).maybeSingle(),
    supabase.from('invoices').select('amount, status, type').eq('project_id', projectId),
  ]);

  if (!project) notFound();

  const client = (project as any).clients;
  const revisionStage = (project as any).revision_stage as string;
  const projectType = (project as any).project_type ?? 'website';
  const isToolOnly = projectType === 'tool';
  const cta = getActionCta(revisionStage, projectType);
  const clientCompleted = client?.status === 'completed';
  const launchSubmitted = !!(project as any).launch_submitted_at;
  const launchConfirmed = !!(project as any).launch_confirmed_at;

  const totalOwed = (invoices || [])
    .filter((i: any) => i.status === 'unpaid')
    .reduce((sum: number, i: any) => sum + Number(i.amount), 0);
  const allPaid = (invoices || []).length > 0 && (invoices || []).every((i: any) => i.status === 'paid');

  return (
    <>
      <div className="portal-header">
        <p className="portal-subtitle">Your Client Portal</p>
        <h1 className="portal-welcome">Welcome, {client?.name?.split(' ')[0] ?? 'there'}</h1>
      </div>

      {/* Next action CTA — shown when it's the client's turn */}
      {cta && revisionStage !== 'complete' && (
        <Link
          href={`/portal/${token}/${cta.href}`}
          style={{
            display: 'block',
            background: 'var(--p-green)',
            color: '#fff',
            borderRadius: 12,
            padding: '18px 20px',
            marginBottom: 16,
            textDecoration: 'none',
          }}
        >
          <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.8, marginBottom: 4 }}>
            Action Required
          </p>
          <p style={{ fontSize: 16, fontWeight: 700 }}>{cta.label}</p>
        </Link>
      )}

      {/* Final approved — awaiting payment */}
      {revisionStage === 'complete' && !clientCompleted && (
        <Link
          href={`/portal/${token}/invoice`}
          style={{
            display: 'block',
            background: 'var(--p-green)',
            color: '#fff',
            borderRadius: 12,
            padding: '18px 20px',
            marginBottom: 16,
            textDecoration: 'none',
          }}
        >
          <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.8, marginBottom: 4 }}>
            Action Required
          </p>
          <p style={{ fontSize: 16, fontWeight: 700 }}>Pay your final invoice →</p>
        </Link>
      )}

      {/* Paid — website + website_tool: prompt for Vercel launch details */}
      {clientCompleted && !launchConfirmed && !isToolOnly && !launchSubmitted && (
        <Link
          href={`/portal/${token}/launch`}
          style={{ display: 'block', background: 'var(--p-green)', color: '#fff', borderRadius: 12, padding: '18px 20px', marginBottom: 16, textDecoration: 'none' }}
        >
          <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.8, marginBottom: 4 }}>Last Step</p>
          <p style={{ fontSize: 16, fontWeight: 700 }}>Complete your launch details →</p>
        </Link>
      )}

      {/* Tool-only: delivery in progress (no action from client) */}
      {clientCompleted && !launchConfirmed && isToolOnly && (
        <div className="portal-card" style={{ padding: '20px', marginBottom: 16 }}>
          <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Delivery in progress</p>
          <p style={{ fontSize: 13, color: 'var(--p-muted)', lineHeight: 1.6 }}>
            Your tool is complete! David is preparing your files and access details. You'll receive an email shortly with everything you need to get started.
          </p>
        </div>
      )}

      {/* Website / website+tool: transfer in progress after launch info submitted */}
      {clientCompleted && launchSubmitted && !launchConfirmed && !isToolOnly && (
        <div className="portal-card" style={{ padding: '20px', marginBottom: 16 }}>
          <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
            {projectType === 'website_tool' ? 'Launch & delivery in progress' : 'Transfer in progress'}
          </p>
          <p style={{ fontSize: 13, color: 'var(--p-muted)', lineHeight: 1.6 }}>
            {projectType === 'website_tool'
              ? "We're transferring your site and preparing your tool delivery. We'll be in touch once everything is ready!"
              : "We're transferring your site to your accounts. We'll reach out once everything is set up!"}
          </p>
        </div>
      )}

      {/* Complete state — after David confirms */}
      {launchConfirmed && (
        <div className="portal-card" style={{ textAlign: 'center', padding: '24px 20px', marginBottom: 16 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🎉</div>
          <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Project Complete!</p>
          <p style={{ fontSize: 13, color: 'var(--p-muted)' }}>Thank you for working with 3rd David's Technology!</p>
        </div>
      )}

      {/* Project status */}
      <div className="portal-card">
        <p className="portal-section-title">Project</p>
        <div className="portal-status-row">
          <span className="portal-status-label">Name</span>
          <span className="portal-status-value">{(project as any).title}</span>
        </div>
        <div className="portal-status-row">
          <span className="portal-status-label">Status</span>
          <span className="portal-status-value" style={{ fontSize: 13 }}>
            {launchConfirmed
              ? isToolOnly
                ? 'Complete — delivered!'
                : projectType === 'website_tool'
                ? 'Complete — delivered & transferred!'
                : 'Complete — site transferred!'
              : clientCompleted && launchSubmitted && !isToolOnly
              ? projectType === 'website_tool' ? 'Launch & delivery in progress' : 'Transfer in progress'
              : clientCompleted && isToolOnly
              ? 'Delivery in progress'
              : clientCompleted
              ? 'Paid — completing your launch details'
              : revisionStage === 'complete'
              ? 'Final approved — final payment due'
              : progressLabel(revisionStage, projectType)}
          </span>
        </div>
      </div>

      {/* Contract */}
      <div className="portal-card">
        <p className="portal-section-title">Contract</p>
        <div className="portal-status-row">
          <span className="portal-status-label">Status</span>
          {contract?.signed_at ? (
            <span className="portal-badge portal-badge-green">Signed</span>
          ) : (
            <span className="portal-badge portal-badge-amber">Needs Signature</span>
          )}
        </div>
      </div>

      {/* Invoices */}
      <div className="portal-card">
        <p className="portal-section-title">Invoices</p>
        {(invoices || []).length === 0 ? (
          <p style={{ color: 'var(--p-muted)', fontSize: 13 }}>No invoices yet.</p>
        ) : (
          <div className="portal-status-row">
            <span className="portal-status-label">Balance Due</span>
            {allPaid ? (
              <span className="portal-badge portal-badge-green">All Paid</span>
            ) : (
              <span className="portal-status-value" style={{ color: '#92400E' }}>
                ${totalOwed % 1 === 0 ? totalOwed.toLocaleString('en-US') : totalOwed.toFixed(2)}
              </span>
            )}
          </div>
        )}
      </div>

      <p style={{ fontSize: 12, color: 'var(--p-muted)', textAlign: 'center', marginTop: 8 }}>
        Questions? Email{' '}
        <a href="mailto:3rddavidstechnology@gmail.com" style={{ color: 'var(--p-green)' }}>
          3rddavidstechnology@gmail.com
        </a>
      </p>
    </>
  );
}
