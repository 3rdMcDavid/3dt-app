import { createServiceClient } from '@/lib/supabase/service';
import { stripe } from '@/lib/stripe';
import { resend } from '@/lib/resend';
import { sendPushNotification } from '@/lib/push';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const token = formData.get('token') as string;
  const submissionType = formData.get('submission_type') as string;
  const approved = formData.get('approved') === 'true';

  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 });

  const supabase = createServiceClient();

  const { data: session } = await supabase
    .from('portal_sessions')
    .select('project_id')
    .eq('token', token)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (!session) return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });

  const projectId = session.project_id;

  const NEXT_STAGE: Record<string, string> = {
    initial: 'intake_received',
    revision_1: 'revision_1_received',
    revision_2: 'revision_2_received',
    post_final: approved ? 'complete' : 'revision_2_received',
  };
  const nextStage = NEXT_STAGE[submissionType] ?? 'intake_received';

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

  const files = formData.getAll('files') as File[];
  for (const file of files) {
    if (!file.size) continue;
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

  await supabase
    .from('projects')
    .update({ revision_stage: nextStage })
    .eq('id', projectId);

  // ── Push notification to David ─────────────────────────────────────────────
  const PUSH: Record<string, (a: boolean) => { title: string; body: string }> = {
    initial:    () => ({ title: '📋 Intake Submitted',      body: 'A client completed their intake — ready to build!' }),
    revision_1: (a) => a
      ? { title: '✅ Draft 1 Approved',      body: 'Client approved Draft 1 — no changes needed.' }
      : { title: '📝 Revision 1 Feedback',  body: 'Client sent feedback on Draft 1 — check the hub.' },
    revision_2: (a) => a
      ? { title: '✅ Draft 2 Approved',      body: 'Client approved Draft 2 — ready to finalize.' }
      : { title: '📝 Revision 2 Feedback',  body: 'Client sent feedback on Draft 2 — check the hub.' },
    post_final: (a) => a
      ? { title: '🎉 Final Approved!',       body: 'Client approved the final — sending final invoice now.' }
      : { title: '⚠️ Extra Revision Requested', body: 'Client requested changes beyond included revisions.' },
  };
  const push = PUSH[submissionType]?.(approved);
  if (push) {
    await sendPushNotification(push.title, push.body, `/admin/projects/${projectId}`);
  }

  // ── Final payment automation (fires when client approves final) ────────────
  if (submissionType === 'post_final' && approved) {
    try {
      const [{ data: project }, { data: finalInvoice }, { data: portalSessions }] = await Promise.all([
        supabase.from('projects').select('title, clients(name, email)').eq('id', projectId).single(),
        supabase
          .from('invoices')
          .select('*')
          .eq('project_id', projectId)
          .eq('type', 'final')
          .eq('status', 'unpaid')
          .maybeSingle(),
        supabase
          .from('portal_sessions')
          .select('token')
          .eq('project_id', projectId)
          .gt('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false })
          .limit(1),
      ]);

      if (finalInvoice && project) {
        const client = (project as any).clients;
        let paymentUrl = finalInvoice.stripe_payment_url;

        if (!paymentUrl) {
          const price = await stripe.prices.create({
            currency: 'usd',
            unit_amount: Math.round(Number(finalInvoice.amount) * 100),
            product_data: { name: `${project.title} — Final Payment` },
          });
          const paymentLink = await stripe.paymentLinks.create({
            line_items: [{ price: price.id, quantity: 1 }],
            metadata: { invoice_id: finalInvoice.id },
            after_completion: {
              type: 'redirect',
              redirect: { url: `${process.env.NEXT_PUBLIC_APP_URL}/payment-success` },
            },
          });
          await supabase
            .from('invoices')
            .update({ stripe_payment_id: paymentLink.id, stripe_payment_url: paymentLink.url })
            .eq('id', finalInvoice.id);
          paymentUrl = paymentLink.url;
        }

        if (paymentUrl && client?.email) {
          const portalInvoiceUrl = portalSessions?.[0]
            ? `${process.env.NEXT_PUBLIC_APP_URL}/portal/${portalSessions[0].token}/invoice`
            : null;

          await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL!,
            to: client.email,
            subject: `Your final invoice is ready — ${project.title}`,
            html: `
              <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1A1A1A;">
                <h2 style="margin-bottom:8px;">Hi ${client.name},</h2>
                <p style="margin-bottom:16px;line-height:1.6;">
                  Your final version of <strong>${project.title}</strong> has been approved — great choice!
                  Your final payment of <strong>$${Number(finalInvoice.amount).toFixed(2)}</strong> is now due.
                  Once paid, we'll handle the launch and send you everything you need.
                </p>
                <a href="${paymentUrl}" style="display:inline-block;background:#1B4D2E;color:#fff;padding:13px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">
                  Pay Final Invoice →
                </a>
                <p style="margin-top:24px;color:#6B6B60;font-size:13px;">
                  Total project: $500 &nbsp;·&nbsp; Deposit: $250 (paid) &nbsp;·&nbsp; Final: $${Number(finalInvoice.amount).toFixed(2)} (due now)
                </p>
                ${portalInvoiceUrl ? `<p style="margin-top:8px;color:#6B6B60;font-size:12px;"><a href="${portalInvoiceUrl}" style="color:#22764A;">View in your portal →</a></p>` : ''}
                <p style="color:#6B6B60;font-size:12px;margin-top:16px;">Questions? Reply to this email.</p>
              </div>
            `,
          });
        }
      }
    } catch (e) {
      console.error('Final invoice automation failed:', e);
    }
  }

  return NextResponse.json({ success: true });
}
