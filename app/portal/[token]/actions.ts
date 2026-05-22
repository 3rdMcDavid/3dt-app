'use server';

import { createServiceClient } from '@/lib/supabase/service';
import { stripe } from '@/lib/stripe';
import { resend } from '@/lib/resend';
import { sendPushNotification } from '@/lib/push';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';

export async function signContractFromPortalAction(formData: FormData) {
  const token = formData.get('token') as string;
  const signatureName = (formData.get('signature_name') as string).trim();
  if (!signatureName) return;

  const headersList = await headers();
  const ip =
    headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    headersList.get('x-real-ip') ??
    'unknown';

  const supabase = createServiceClient();

  const { data: session } = await supabase
    .from('portal_sessions')
    .select('project_id')
    .eq('token', token)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (!session) return;

  const { data: contract } = await supabase
    .from('contracts')
    .select('id, signed_at, content')
    .eq('project_id', session.project_id)
    .single();

  if (!contract || contract.signed_at) return;

  const { data: project } = await supabase
    .from('projects')
    .select('title, client_id, clients(name, email)')
    .eq('id', session.project_id)
    .single();

  if (!project) return;
  const client = (project as any).clients;

  // Sign the contract and activate client
  await supabase
    .from('contracts')
    .update({
      signed_at: new Date().toISOString(),
      signature_name: signatureName,
      signature_ip: ip,
    })
    .eq('id', contract.id);

  await supabase
    .from('clients')
    .update({ status: 'active' })
    .eq('id', (project as any).client_id);

  await sendPushNotification(
    '✍️ Contract Signed',
    `${client.name} signed the contract for ${project.title}`,
    `/admin/projects/${session.project_id}`
  );

  resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: '3rddavidstechnology@gmail.com',
    subject: `✍️ Contract Signed — ${project.title}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1A1A1A;">
        <h2 style="margin-bottom:8px;">Contract Signed</h2>
        <p style="line-height:1.6;"><strong>${client.name}</strong> signed the contract for <strong>${project.title}</strong>. Deposit invoice is being sent to them now.</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/admin/projects/${session.project_id}" style="display:inline-block;background:#1B4D2E;color:#fff;padding:10px 22px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;margin-top:12px;">View Project →</a>
      </div>
    `,
  }).catch(() => {});

  // Use existing invoices if onboarded via the new flow; otherwise create them
  let depositInvoice = (await supabase
    .from('invoices')
    .select('id, amount, stripe_payment_url')
    .eq('project_id', session.project_id)
    .eq('type', 'deposit')
    .maybeSingle()).data;

  if (!depositInvoice) {
    const { data: newDeposit } = await supabase
      .from('invoices')
      .insert({ project_id: session.project_id, amount: 250, type: 'deposit', status: 'unpaid' })
      .select('id, amount, stripe_payment_url')
      .single();
    depositInvoice = newDeposit;

    await supabase
      .from('invoices')
      .insert({ project_id: session.project_id, amount: 250, type: 'final', status: 'unpaid' });
  }

  // Generate Stripe deposit payment link only if not already created
  let depositPaymentUrl: string | null = depositInvoice?.stripe_payment_url ?? null;
  if (depositInvoice && !depositPaymentUrl) {
    try {
      const price = await stripe.prices.create({
        currency: 'usd',
        unit_amount: Math.round(depositInvoice.amount * 100),
        product_data: { name: `${project.title} — Deposit` },
      });
      const paymentLink = await stripe.paymentLinks.create({
        line_items: [{ price: price.id, quantity: 1 }],
        metadata: { invoice_id: depositInvoice.id },
        after_completion: {
          type: 'redirect',
          redirect: { url: `${process.env.NEXT_PUBLIC_APP_URL}/payment-success?token=${token}` },
        },
      });
      await supabase
        .from('invoices')
        .update({ stripe_payment_id: paymentLink.id, stripe_payment_url: paymentLink.url })
        .eq('id', depositInvoice.id);
      depositPaymentUrl = paymentLink.url;
    } catch (e) {
      console.error('Stripe deposit link creation failed:', e);
    }
  }

  // Send signed contract copy + deposit payment link to client
  if (client?.email) {
    const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL}/portal/${token}`;
    const signedDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'America/Chicago',
    });
    const depositAmount = depositInvoice?.amount ?? 250;
    const fmt = (n: number) => `$${n % 1 === 0 ? n.toLocaleString('en-US') : n.toFixed(2)}`;

    // Format contract for email
    const contractHtml = (contract.content ?? '')
      .split('\n')
      .map((line: string) =>
        line.trim()
          ? `<p style="margin:0 0 10px;font-size:13px;color:#374151;line-height:1.6;">${line}</p>`
          : '<br/>'
      )
      .join('');

    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL!,
      to: client.email,
      subject: `Contract signed — your ${fmt(depositAmount)} deposit is due`,
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1A1A1A;">
          <h2 style="margin-bottom:8px;">Hi ${client.name},</h2>
          <p style="margin-bottom:16px;line-height:1.6;">
            Thanks for signing your contract for <strong>${project.title}</strong>!
            Your next step is to pay your <strong>${fmt(depositAmount)} deposit</strong> to kick off the project.
          </p>
          ${depositPaymentUrl ? `
          <a href="${depositPaymentUrl}" style="display:inline-block;background:#1B4D2E;color:#fff;padding:13px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;margin-bottom:24px;">
            Pay ${fmt(depositAmount)} Deposit →
          </a>
          ` : ''}
          <p style="margin-bottom:8px;font-size:13px;color:#6B6B60;">
            Or <a href="${portalUrl}" style="color:#22764A;">return to your portal</a> anytime.
          </p>

          <hr style="border:none;border-top:1px solid #E5E7EB;margin:32px 0;" />

          <p style="font-size:13px;font-weight:600;color:#374151;margin-bottom:4px;">
            📄 Your Signed Contract — ${project.title}
          </p>
          <p style="font-size:12px;color:#9CA3AF;margin-bottom:20px;">
            Signed by ${signatureName} on ${signedDate}
          </p>

          <div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:8px;padding:20px 24px;margin-bottom:24px;">
            ${contractHtml}
          </div>

          <p style="font-size:12px;color:#9CA3AF;">
            Keep this email for your records. Questions? Email us at 3rddavidstechnology@gmail.com
          </p>
        </div>
      `,
    }).catch((e) => console.error('Sign confirmation email failed:', e));
  }

  revalidatePath(`/portal/${token}`);
}

export async function saveLaunchInfoAction(formData: FormData) {
  const token = formData.get('token') as string;
  const projectId = formData.get('project_id') as string;
  const vercelEmail = (formData.get('vercel_email') as string).trim();
  const githubUsername = (formData.get('github_username') as string | null)?.trim() || null;
  const notes = (formData.get('notes') as string | null)?.trim() || null;

  if (!token || !projectId || !vercelEmail) return;

  const supabase = createServiceClient();

  const { data: session } = await supabase
    .from('portal_sessions')
    .select('project_id')
    .eq('token', token)
    .eq('project_id', projectId)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (!session) return;

  const { data: project } = await supabase
    .from('projects')
    .select('title, clients(name)')
    .eq('id', projectId)
    .single();

  await supabase
    .from('projects')
    .update({
      client_vercel_email: vercelEmail,
      client_github_username: githubUsername,
      launch_notes: notes,
      launch_submitted_at: new Date().toISOString(),
    })
    .eq('id', projectId);

  const clientName = (project as any)?.clients?.name ?? 'Client';
  const projectTitle = (project as any)?.title ?? '';

  await sendPushNotification(
    '🚀 Launch Info Submitted',
    `${clientName} submitted their Vercel account info for ${projectTitle}`,
    `/admin/projects/${projectId}`
  );

  resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: '3rddavidstechnology@gmail.com',
    subject: `🚀 Launch Info Submitted — ${projectTitle}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1A1A1A;">
        <h2 style="margin-bottom:8px;">Launch Info Submitted</h2>
        <p style="line-height:1.6;"><strong>${clientName}</strong> submitted their launch details for <strong>${projectTitle}</strong>. Transfer is ready to begin.</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/admin/projects/${projectId}" style="display:inline-block;background:#1B4D2E;color:#fff;padding:10px 22px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;margin-top:12px;">View Project →</a>
      </div>
    `,
  }).catch(() => {});

  revalidatePath(`/portal/${token}/launch`);
}
