'use server';

import { createServiceClient } from '@/lib/supabase/service';
import { stripe } from '@/lib/stripe';
import { resend } from '@/lib/resend';
import { sendPushNotification } from '@/lib/push';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';

export async function signContractAction(formData: FormData) {
  const signToken = formData.get('sign_token') as string;
  const signatureName = (formData.get('signature_name') as string).trim();
  if (!signatureName) return;

  const headersList = await headers();
  const ip =
    headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    headersList.get('x-real-ip') ??
    'unknown';

  const supabase = createServiceClient();

  // Look up contract + project + client
  const { data: contract } = await supabase
    .from('contracts')
    .select('id, project_id, signed_at')
    .eq('sign_token', signToken)
    .single();

  if (!contract || contract.signed_at) return;

  const { data: project } = await supabase
    .from('projects')
    .select('title, client_id, clients(name, email)')
    .eq('id', contract.project_id)
    .single();

  if (!project) return;
  const client = (project as any).clients;

  // Sign the contract
  await supabase
    .from('contracts')
    .update({
      signed_at: new Date().toISOString(),
      signature_name: signatureName,
      signature_ip: ip,
    })
    .eq('id', contract.id);

  // Activate the client
  if ((project as any)?.client_id) {
    await supabase
      .from('clients')
      .update({ status: 'active' })
      .eq('id', (project as any).client_id);
  }

  await sendPushNotification(
    '✍️ Contract Signed',
    `${client.name} signed the contract for ${project.title}`,
    `/admin/projects/${contract.project_id}`
  );

  // Look up existing invoices (created by the onboarding flow)
  const depositInvoice = (await supabase
    .from('invoices')
    .select('id, amount, stripe_payment_url')
    .eq('project_id', contract.project_id)
    .eq('type', 'deposit')
    .maybeSingle()).data;

  const hasInvoice = !!depositInvoice;

  resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: '3rddavidstechnology@gmail.com',
    subject: `✍️ Contract Signed — ${project.title}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1A1A1A;">
        <h2 style="margin-bottom:8px;">Contract Signed</h2>
        <p style="line-height:1.6;"><strong>${client.name}</strong> signed the contract for <strong>${project.title}</strong>.${hasInvoice ? ' Deposit invoice is being sent to them now.' : ' <strong>No invoices are set up yet — add pricing in the project hub to send the deposit.</strong>'}</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/admin/projects/${contract.project_id}" style="display:inline-block;background:#1B4D2E;color:#fff;padding:10px 22px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;margin-top:12px;">View Project →</a>
      </div>
    `,
  }).catch(() => {});

  // Send deposit email only if invoice + Stripe link were set up beforehand (onboarding flow)
  if (depositInvoice && client && !depositInvoice.stripe_payment_url) {
    try {
      const { data: portalSessions } = await supabase
        .from('portal_sessions')
        .select('token')
        .eq('project_id', contract.project_id)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1);
      const portalToken = portalSessions?.[0]?.token ?? null;

      const depositAmt = Number(depositInvoice.amount);
      const fmt = (n: number) => `$${n % 1 === 0 ? n.toLocaleString('en-US') : n.toFixed(2)}`;

      const price = await stripe.prices.create({
        currency: 'usd',
        unit_amount: Math.round(depositAmt * 100),
        product_data: { name: `${project.title} — Deposit` },
      });

      const paymentLink = await stripe.paymentLinks.create({
        line_items: [{ price: price.id, quantity: 1 }],
        metadata: { invoice_id: depositInvoice.id },
        after_completion: {
          type: 'redirect',
          redirect: { url: `${process.env.NEXT_PUBLIC_APP_URL}/payment-success${portalToken ? `?token=${portalToken}` : ''}` },
        },
      });

      await supabase
        .from('invoices')
        .update({ stripe_payment_id: paymentLink.id, stripe_payment_url: paymentLink.url })
        .eq('id', depositInvoice.id);

      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL!,
        to: client.email,
        subject: `Contract signed — your ${fmt(depositAmt)} deposit is due`,
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1A1A1A;">
            <h2 style="margin-bottom:8px;">Hi ${client.name},</h2>
            <p style="margin-bottom:16px;line-height:1.6;">
              Thank you for signing your contract for <strong>${project.title}</strong>!
              To officially kick off your project, a deposit of <strong>${fmt(depositAmt)}</strong> is due now.
              Once paid, your portal will be fully unlocked.
            </p>
            <a href="${paymentLink.url}" style="display:inline-block;background:#1B4D2E;color:#fff;padding:13px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">
              Pay ${fmt(depositAmt)} Deposit →
            </a>
            <p style="color:#6B6B60;font-size:12px;margin-top:24px;">Questions? Email us at 3rddavidstechnology@gmail.com</p>
          </div>
        `,
      });
    } catch (e) {
      console.error('Post-sign invoice/email failed:', e);
    }
  }

  revalidatePath(`/sign/${signToken}`);
}
