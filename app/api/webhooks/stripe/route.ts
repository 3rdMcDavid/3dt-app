import { stripe } from '@/lib/stripe';
import { createServiceClient } from '@/lib/supabase/service';
import { sendPushNotification } from '@/lib/push';
import { resend } from '@/lib/resend';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  if (!sig) return NextResponse.json({ error: 'No signature' }, { status: 400 });

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook error: ${err.message}` }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as any;
    const invoiceId = session.metadata?.invoice_id;
    const paymentLinkId = session.payment_link;

    const supabase = createServiceClient();
    let paidInvoiceId: string | null = null;

    if (invoiceId) {
      await supabase.from('invoices').update({ status: 'paid' }).eq('id', invoiceId);
      paidInvoiceId = invoiceId;
    } else if (paymentLinkId) {
      const { data: inv } = await supabase
        .from('invoices')
        .update({ status: 'paid' })
        .eq('stripe_payment_id', paymentLinkId)
        .select('id')
        .single();
      paidInvoiceId = inv?.id ?? null;
    }

    // If a deposit was just paid, auto-generate portal and email client
    if (paidInvoiceId) {
      const { data: invoice } = await supabase
        .from('invoices')
        .select('type, project_id')
        .eq('id', paidInvoiceId)
        .single();

      if (invoice?.type === 'deposit') {
        const { data: project } = await supabase
          .from('projects')
          .select('title, clients(name, email)')
          .eq('id', invoice.project_id)
          .single();

        const { data: portalSession } = await supabase
          .from('portal_sessions')
          .insert({ project_id: invoice.project_id })
          .select('token')
          .single();

        await supabase
          .from('projects')
          .update({ revision_stage: 'awaiting_intake' })
          .eq('id', invoice.project_id);

        if (portalSession && project) {
          const client = (project as any).clients;
          const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL}/portal/${portalSession.token}`;

          await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL!,
            to: client.email,
            subject: `Payment received — your project portal is ready`,
            html: `
              <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1A1A1A;">
                <h2 style="margin-bottom:8px;">Hi ${client.name},</h2>
                <p style="margin-bottom:16px;line-height:1.6;">
                  Your $250 deposit has been received — thank you!
                  Your client portal for <strong>${project.title}</strong> is now ready.
                  Inside you'll complete your website intake form, review your contract, and track project progress.
                </p>
                <a href="${portalUrl}" style="display:inline-block;background:#1B4D2E;color:#fff;padding:13px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">
                  Open Your Portal →
                </a>
                <p style="margin-top:24px;color:#6B6B60;font-size:12px;">
                  This link is private to you and valid for 30 days. Reply to this email with any questions.
                </p>
              </div>
            `,
          }).catch(() => {});

          await supabase
            .from('portal_sessions')
            .update({ sent_at: new Date().toISOString() })
            .eq('token', portalSession.token);
        }
      }
    }

    sendPushNotification(
      '💰 Invoice Paid',
      `A client just completed a payment`,
      '/admin/projects'
    ).catch(() => {});
  }

  return NextResponse.json({ received: true });
}
