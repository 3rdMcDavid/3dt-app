import { createServiceClient } from '@/lib/supabase/service';
import { sendPushNotification } from '@/lib/push';
import { resend } from '@/lib/resend';
import { NextRequest, NextResponse } from 'next/server';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-inquiry-secret',
};

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-inquiry-secret');
  if (secret !== process.env.INQUIRY_API_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
  }

  let body: { first_name?: string; last_name?: string; email?: string; phone?: string; service?: string; message?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400, headers: corsHeaders });
  }

  const { first_name, last_name, email, phone, service, message } = body;

  if (!first_name || !email) {
    return NextResponse.json({ error: 'first_name and email are required' }, { status: 400, headers: corsHeaders });
  }

  const SERVICE_LABELS: Record<string, string> = {
    'website':       'New Website ($500+)',
    'website-tools': 'Website + Business Tools',
    'tool':          'Business Tool / Custom Build',
    'care-plan':     'Monthly Care Plan ($75/mo)',
    'other':         "Not sure — let's talk",
  };

  const serviceLabel = service ? (SERVICE_LABELS[service] ?? service) : null;
  const notes = [
    serviceLabel ? `Interested in: ${serviceLabel}` : null,
    message || null,
  ].filter(Boolean).join('\n\n') || null;

  const name = [first_name, last_name].filter(Boolean).join(' ');

  const supabase = createServiceClient();
  const { error } = await supabase.from('clients').insert({
    name,
    email,
    phone: phone ?? null,
    status: 'lead',
    notes,
  });

  if (error) {
    console.error('Inquiry insert error:', error);
    return NextResponse.json({ error: 'Failed to save inquiry' }, { status: 500, headers: corsHeaders });
  }

  await sendPushNotification(
    '🆕 New Lead',
    `${name} submitted an inquiry`,
    '/admin/clients'
  );

  resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: '3rddavidstechnology@gmail.com',
    subject: `🆕 New Lead: ${name}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#1A1A1A;">
        <h2 style="margin-bottom:16px;">New inquiry from ${name}</h2>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <tr><td style="padding:8px 0;color:#6B6B60;width:80px;">Name</td><td style="padding:8px 0;font-weight:600;">${name}</td></tr>
          <tr><td style="padding:8px 0;color:#6B6B60;">Email</td><td style="padding:8px 0;">${email}</td></tr>
          ${phone ? `<tr><td style="padding:8px 0;color:#6B6B60;">Phone</td><td style="padding:8px 0;">${phone}</td></tr>` : ''}
          ${serviceLabel ? `<tr><td style="padding:8px 0;color:#6B6B60;">Interested In</td><td style="padding:8px 0;">${serviceLabel}</td></tr>` : ''}
          ${message ? `<tr><td style="padding:8px 0;color:#6B6B60;vertical-align:top;">Message</td><td style="padding:8px 0;line-height:1.6;">${message}</td></tr>` : ''}
        </table>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/admin/clients" style="display:inline-block;margin-top:24px;background:#1B4D2E;color:#fff;padding:11px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
          View in Admin →
        </a>
      </div>
    `,
  }).catch(() => {});

  return NextResponse.json({ success: true }, { status: 201, headers: corsHeaders });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}
