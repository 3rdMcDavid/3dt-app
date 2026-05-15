import { stripe } from '@/lib/stripe';
import { createServiceClient } from '@/lib/supabase/service';
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

    if (invoiceId) {
      await supabase
        .from('invoices')
        .update({ status: 'paid' })
        .eq('id', invoiceId);
    } else if (paymentLinkId) {
      await supabase
        .from('invoices')
        .update({ status: 'paid' })
        .eq('stripe_payment_id', paymentLinkId);
    }
  }

  return NextResponse.json({ received: true });
}
