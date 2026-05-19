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

      if (invoice?.type === 'final') {
        const [{ data: project }, { data: finalPortalSessions }] = await Promise.all([
          supabase
            .from('projects')
            .select('client_id, title, clients(name, email)')
            .eq('id', invoice.project_id)
            .single(),
          supabase
            .from('portal_sessions')
            .select('token')
            .eq('project_id', invoice.project_id)
            .gt('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false })
            .limit(1),
        ]);

        if (project) {
          const client = (project as any).clients;

          await supabase
            .from('clients')
            .update({ status: 'completed' })
            .eq('id', (project as any).client_id);

          await supabase
            .from('projects')
            .update({ stage: 'launched' })
            .eq('id', invoice.project_id);

          const portalLaunchUrl = finalPortalSessions?.[0]?.token
            ? `${process.env.NEXT_PUBLIC_APP_URL}/portal/${finalPortalSessions[0].token}/launch`
            : null;

          if (client?.email) {
            resend.emails.send({
              from: process.env.RESEND_FROM_EMAIL!,
              to: client.email,
              subject: `Final payment received — ${project.title}`,
              html: `
                <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1A1A1A;">
                  <h2 style="margin-bottom:8px;">🎉 Thank you, ${client.name}!</h2>
                  <p style="margin-bottom:16px;line-height:1.6;">
                    Your final payment for <strong>${project.title}</strong> has been received — you're all set!
                    One last step: complete your launch details so we can transfer ownership of your site to you.
                  </p>
                  ${portalLaunchUrl ? `
                  <a href="${portalLaunchUrl}" style="display:inline-block;background:#1B4D2E;color:#fff;padding:13px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;margin-bottom:16px;">
                    Complete Launch Details →
                  </a>
                  <p style="margin-bottom:16px;font-size:13px;color:#6B6B60;">
                    Enter your Vercel account email (and GitHub username if applicable) in the Launch tab. We'll take it from there.
                  </p>
                  ` : ''}
                  <p style="color:#6B6B60;font-size:13px;">
                    Your 30-day post-launch support window starts now. Questions? Email us at 3rddavidstechnology@gmail.com
                  </p>
                </div>
              `,
            }).catch(() => {});

            resend.emails.send({
              from: process.env.RESEND_FROM_EMAIL!,
              to: '3rddavidstechnology@gmail.com',
              subject: `💰 Final Payment Received — ${project.title}`,
              html: `
                <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1A1A1A;">
                  <h2 style="margin-bottom:8px;">Final Payment Received</h2>
                  <p style="line-height:1.6;"><strong>${client.name}</strong> paid their final invoice for <strong>${project.title}</strong>. Client has been prompted to complete launch details.</p>
                  <a href="${process.env.NEXT_PUBLIC_APP_URL}/admin/projects/${invoice.project_id}" style="display:inline-block;background:#1B4D2E;color:#fff;padding:10px 22px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;margin-top:12px;">View Project →</a>
                </div>
              `,
            }).catch(() => {});
          }

          await sendPushNotification(
            '🚀 Project Complete',
            `${client?.name ?? 'Client'} paid their final invoice — ${project.title} is done!`,
            `/admin/projects/${invoice.project_id}`
          );
        }
      }

      if (invoice?.type === 'deposit') {
        const { data: project } = await supabase
          .from('projects')
          .select('title, clients(name, email)')
          .eq('id', invoice.project_id)
          .single();

        // Find the existing portal session (created at project setup) rather than
        // creating a new one, so the client keeps the same URL they already have.
        const { data: existingSessions } = await supabase
          .from('portal_sessions')
          .select('token')
          .eq('project_id', invoice.project_id)
          .gt('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false })
          .limit(1);

        let portalToken = existingSessions?.[0]?.token ?? null;

        // Safety fallback: if no session exists somehow, create one
        if (!portalToken) {
          const { data: newSession } = await supabase
            .from('portal_sessions')
            .insert({ project_id: invoice.project_id })
            .select('token')
            .single();
          portalToken = newSession?.token ?? null;
        }

        await supabase
          .from('projects')
          .update({ revision_stage: 'awaiting_intake' })
          .eq('id', invoice.project_id);

        if (portalToken && project) {
          const client = (project as any).clients;
          const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL}/portal/${portalToken}`;

          await sendPushNotification(
            '💳 Deposit Paid',
            `${client?.name ?? 'Client'} paid their deposit for ${project.title}`,
            `/admin/projects/${invoice.project_id}`
          );

          resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL!,
            to: '3rddavidstechnology@gmail.com',
            subject: `💳 Deposit Paid — ${project.title}`,
            html: `
              <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1A1A1A;">
                <h2 style="margin-bottom:8px;">Deposit Paid</h2>
                <p style="line-height:1.6;"><strong>${client?.name ?? 'Client'}</strong> paid their $250 deposit for <strong>${project.title}</strong>. Their portal is now unlocked and intake form is open.</p>
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/admin/projects/${invoice.project_id}" style="display:inline-block;background:#1B4D2E;color:#fff;padding:10px 22px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;margin-top:12px;">View Project →</a>
              </div>
            `,
          }).catch(() => {});

          if (!client?.email) return NextResponse.json({ received: true });

          await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL!,
            to: client.email,
            subject: `Deposit received — your portal is now fully open`,
            html: `
              <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1A1A1A;">
                <h2 style="margin-bottom:8px;">Hi ${client.name},</h2>
                <p style="margin-bottom:16px;line-height:1.6;">
                  Your $250 deposit for <strong>${project.title}</strong> has been received — thank you!
                  Your portal is now fully unlocked. Head inside to complete your intake form and
                  kick off the project.
                </p>
                <a href="${portalUrl}" style="display:inline-block;background:#1B4D2E;color:#fff;padding:13px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">
                  Open Your Portal →
                </a>
                <p style="margin-top:24px;color:#6B6B60;font-size:12px;">
                  Same link as before — bookmark it for easy access. Questions? Email us at 3rddavidstechnology@gmail.com
                </p>
              </div>
            `,
          }).catch(() => {});
        }
      }
    }

  }

  return NextResponse.json({ received: true });
}
