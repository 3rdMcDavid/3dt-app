'use server';

import { createServiceClient } from '@/lib/supabase/service';
import { stripe } from '@/lib/stripe';
import { resend } from '@/lib/resend';
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

  // Create deposit + final invoices
  const { data: depositInvoice } = await supabase
    .from('invoices')
    .insert({ project_id: contract.project_id, amount: 250, type: 'deposit', status: 'unpaid' })
    .select()
    .single();

  await supabase
    .from('invoices')
    .insert({ project_id: contract.project_id, amount: 250, type: 'final', status: 'unpaid' });

  // Generate Stripe payment link for deposit and email client
  if (depositInvoice && client) {
    try {
      const price = await stripe.prices.create({
        currency: 'usd',
        unit_amount: 25000,
        product_data: { name: `${project.title} — Deposit` },
      });

      const paymentLink = await stripe.paymentLinks.create({
        line_items: [{ price: price.id, quantity: 1 }],
        metadata: { invoice_id: depositInvoice.id },
        after_completion: {
          type: 'redirect',
          redirect: { url: `${process.env.NEXT_PUBLIC_APP_URL}/payment-success` },
        },
      });

      await supabase
        .from('invoices')
        .update({ stripe_payment_id: paymentLink.id, stripe_payment_url: paymentLink.url })
        .eq('id', depositInvoice.id);

      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL!,
        to: client.email,
        subject: `Contract signed — your $250 deposit is due`,
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1A1A1A;">
            <h2 style="margin-bottom:8px;">Hi ${client.name},</h2>
            <p style="margin-bottom:16px;line-height:1.6;">
              Thank you for signing your contract for <strong>${project.title}</strong>!
              To officially kick off your project, a deposit of <strong>$250</strong> is due now.
              Once paid, you'll receive access to your private client portal.
            </p>
            <a href="${paymentLink.url}" style="display:inline-block;background:#1B4D2E;color:#fff;padding:13px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">
              Pay $250 Deposit →
            </a>
            <p style="margin-top:24px;color:#6B6B60;font-size:13px;">
              Total project: $500 &nbsp;·&nbsp; Deposit: $250 (due now) &nbsp;·&nbsp; Final: $250 (due on completion)
            </p>
            <p style="color:#6B6B60;font-size:12px;">Questions? Reply to this email.</p>
          </div>
        `,
      });
    } catch (e) {
      console.error('Post-sign invoice/email failed:', e);
    }
  }

  revalidatePath(`/sign/${signToken}`);
}
