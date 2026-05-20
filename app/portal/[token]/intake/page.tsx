export const dynamic = 'force-dynamic';

import { createServiceClient } from '@/lib/supabase/service';
import { notFound } from 'next/navigation';
import type { RevisionStage, IntakeSubmissionType } from '@/lib/types';
import IntakeForm from '../components/IntakeForm';

const STAGE_LABELS: Record<RevisionStage, string> = {
  awaiting_intake: 'Initial Intake',
  intake_received: 'Draft In Progress',
  revision_1_open: 'Review Draft 1',
  revision_1_received: 'Revision In Progress',
  revision_2_open: 'Review Draft 2',
  revision_2_received: 'Final In Progress',
  post_final_open: 'Final Review',
  extra_revision_requested: 'Changes Requested',
  complete: 'Complete',
};

const REVISION_TYPE: Partial<Record<RevisionStage, IntakeSubmissionType>> = {
  revision_1_open: 'revision_1',
  revision_2_open: 'revision_2',
  post_final_open: 'post_final',
};

export default async function PortalIntakePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = createServiceClient();

  const { data: session } = await supabase
    .from('portal_sessions')
    .select('project_id, projects(title, revision_stage, draft_url)')
    .eq('token', token)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (!session) notFound();

  const project = (session as any).projects;
  const stage = project?.revision_stage as RevisionStage;
  const draftUrl = project?.draft_url as string | null;

  const { data: submissions } = await supabase
    .from('intake_submissions')
    .select('*, intake_files(*)')
    .eq('project_id', session.project_id)
    .order('created_at', { ascending: false });

  // Count how many times client has already requested changes on the final
  const extraRevisionCount = (submissions ?? []).filter(
    (s: any) => s.type === 'post_final' && !s.approved
  ).length;

  const isWaiting =
    stage === 'intake_received' ||
    stage === 'revision_1_received' ||
    stage === 'revision_2_received' ||
    stage === 'extra_revision_requested';

  const waitingMessages: Partial<Record<RevisionStage, string>> = {
    intake_received: "Your intake has been received! David is working on your first draft. We'll be in touch soon.",
    revision_1_received: "Your feedback has been received! David is preparing your updated draft.",
    revision_2_received: "Your feedback has been received! David is preparing your final version.",
    extra_revision_requested: "Your change request has been received. David will prepare an updated version and be in touch shortly.",
  };

  return (
    <div style={{ padding: '20px 16px 120px' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--p-text)', marginBottom: 4 }}>
          {STAGE_LABELS[stage] ?? 'Intake'}
        </h1>
        <p style={{ fontSize: 13, color: 'var(--p-muted)' }}>{project?.title}</p>
      </div>

      {/* Complete state */}
      {stage === 'complete' && (
        <div className="portal-card" style={{ textAlign: 'center', padding: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🎉</div>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Project Complete!</h2>
          <p style={{ color: 'var(--p-muted)', fontSize: 14 }}>
            Your website has been approved. Check your portal home for next steps on your launch.
          </p>
        </div>
      )}

      {/* Waiting state */}
      {isWaiting && (
        <div className="portal-card" style={{ padding: 24 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
          <p style={{ color: 'var(--p-muted)', lineHeight: 1.7, fontSize: 14 }}>
            {waitingMessages[stage]}
          </p>
        </div>
      )}

      {/* Intake form — initial */}
      {stage === 'awaiting_intake' && (
        <IntakeForm token={token} submissionType="initial" />
      )}

      {/* Revision approval forms */}
      {(stage === 'revision_1_open' || stage === 'revision_2_open' || stage === 'post_final_open') && (
        <>
          {draftUrl && (
            <a
              href={draftUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="portal-btn"
              style={{ display: 'block', textAlign: 'center', marginBottom: 16 }}
            >
              View Your Draft ↗
            </a>
          )}
          <IntakeForm
            token={token}
            submissionType={REVISION_TYPE[stage]!}
            isApproval
            extraRevision={stage === 'post_final_open' && extraRevisionCount > 0}
          />
        </>
      )}

      {/* Previous submissions */}
      {(submissions ?? []).length > 0 && (
        <div style={{ marginTop: 32 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--p-muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Submission History
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {(submissions ?? []).map((sub: any) => (
              <div key={sub.id} className="portal-card" style={{ padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, textTransform: 'capitalize' }}>
                    {sub.type.replace('_', ' ')}
                    {sub.approved && ' · ✓ Approved'}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--p-muted)' }}>
                    {new Date(sub.created_at).toLocaleDateString('en-US', { timeZone: 'America/Chicago' })}
                  </span>
                </div>
                {sub.additional_notes && (
                  <p style={{ fontSize: 13, color: 'var(--p-muted)', lineHeight: 1.6 }}>
                    {sub.additional_notes}
                  </p>
                )}
                {sub.intake_files?.length > 0 && (
                  <p style={{ fontSize: 12, color: 'var(--p-muted)', marginTop: 6 }}>
                    {sub.intake_files.length} file{sub.intake_files.length !== 1 ? 's' : ''} attached
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
