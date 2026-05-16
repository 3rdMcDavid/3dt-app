import { createServiceClient } from '@/lib/supabase/service';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const token = formData.get('token') as string;
  const submissionType = formData.get('submission_type') as string;
  const approved = formData.get('approved') === 'true';

  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 });

  const supabase = createServiceClient();

  // Validate token
  const { data: session } = await supabase
    .from('portal_sessions')
    .select('project_id')
    .eq('token', token)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (!session) return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });

  const projectId = session.project_id;

  // Build next revision_stage
  const NEXT_STAGE: Record<string, string> = {
    initial: 'intake_received',
    revision_1: 'revision_1_received',
    revision_2: 'revision_2_received',
    post_final: approved ? 'complete' : 'complete',
  };
  const nextStage = NEXT_STAGE[submissionType] ?? 'intake_received';

  // Create intake submission
  const { data: submission, error: subError } = await supabase
    .from('intake_submissions')
    .insert({
      project_id: projectId,
      type: submissionType,
      approved,
      pages_type: (formData.get('pages_type') as string) || null,
      pages_list: formData.getAll('pages_list') as string[],
      business_name: (formData.get('business_name') as string) || null,
      tagline: (formData.get('tagline') as string) || null,
      description: (formData.get('description') as string) || null,
      target_audience: (formData.get('target_audience') as string) || null,
      style_notes: (formData.get('style_notes') as string) || null,
      bio: (formData.get('bio') as string) || null,
      social_facebook: (formData.get('social_facebook') as string) || null,
      social_instagram: (formData.get('social_instagram') as string) || null,
      social_linkedin: (formData.get('social_linkedin') as string) || null,
      social_other: (formData.get('social_other') as string) || null,
      additional_notes: (formData.get('additional_notes') as string) || null,
    })
    .select()
    .single();

  if (subError || !submission) {
    return NextResponse.json({ error: 'Failed to save submission' }, { status: 500 });
  }

  // Upload files to storage
  const files = formData.getAll('files') as File[];
  for (const file of files) {
    if (!file.size) continue;
    const ext = file.name.split('.').pop();
    const path = `${projectId}/${submission.id}/${Date.now()}-${file.name}`;
    const buffer = await file.arrayBuffer();

    const { error: uploadError } = await supabase.storage
      .from('intake')
      .upload(path, buffer, { contentType: file.type || 'application/octet-stream' });

    if (!uploadError) {
      await supabase.from('intake_files').insert({
        intake_submission_id: submission.id,
        project_id: projectId,
        file_name: file.name,
        file_url: path,
      });
    }
  }

  // Advance project revision stage
  await supabase
    .from('projects')
    .update({ revision_stage: nextStage })
    .eq('id', projectId);

  return NextResponse.json({ success: true });
}
