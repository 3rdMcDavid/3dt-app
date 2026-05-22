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

  let body: { first_name?: string; last_name?: string; email?: string; phone?: string; pain_point?: string; service?: string; budget?: string; message?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400, headers: corsHeaders });
  }

  const { first_name, last_name, email, phone, pain_point, service, budget, message } = body;

  if (!first_name || !email) {
    return NextResponse.json({ error: 'first_name and email are required' }, { status: 400, headers: corsHeaders });
  }

  const SERVICE_LABELS: Record<string, string> = {
    'website':       'New Website',
    'website-tools': 'Website + Business Tools',
    'tool':          'Business Tool / Custom Build',
    'care-plan':     'Monthly Care Plan ($75/mo)',
    'other':         "Not sure — let's talk",
  };

  const BUDGET_LABELS: Record<string, string> = {
    '500-1000':   '$500 – $1,000',
    '1000-2500':  '$1,000 – $2,500',
    '2500-plus':  '$2,500+',
  };

  const serviceLabel = service ? (SERVICE_LABELS[service] ?? service) : null;
  const budgetLabel = budget ? (BUDGET_LABELS[budget] ?? null) : null;
  const notes = [
    pain_point ? `Pain Point: ${pain_point}` : null,
    serviceLabel ? `Interested in: ${serviceLabel}` : null,
    budgetLabel ? `Budget: ${budgetLabel}` : null,
    message ? `Additional notes: ${message}` : null,
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
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1A1A1A;">
        <h2 style="margin-bottom:4px;">New inquiry from ${name}</h2>
        <p style="color:#6B6B60;font-size:13px;margin-bottom:20px;">${email}${phone ? ` · ${phone}` : ''}</p>

        ${pain_point ? `
        <div style="background:#F0F7F3;border-left:4px solid #1B4D2E;padding:14px 16px;border-radius:0 8px 8px 0;margin-bottom:20px;">
          <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#1B4D2E;margin-bottom:6px;">Their Pain Point</p>
          <p style="font-size:15px;line-height:1.6;margin:0;color:#1A1A1A;">${pain_point}</p>
        </div>` : ''}

        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          ${serviceLabel ? `<tr><td style="padding:8px 0;color:#6B6B60;width:110px;">Interested In</td><td style="padding:8px 0;">${serviceLabel}</td></tr>` : ''}
          ${budgetLabel ? `<tr><td style="padding:8px 0;color:#6B6B60;">Budget</td><td style="padding:8px 0;">${budgetLabel}</td></tr>` : ''}
          ${message ? `<tr><td style="padding:8px 0;color:#6B6B60;vertical-align:top;">Notes</td><td style="padding:8px 0;line-height:1.6;">${message}</td></tr>` : ''}
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
