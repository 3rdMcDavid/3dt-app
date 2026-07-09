import { createServiceClient } from '@/lib/supabase/service';
import { sendPushNotification } from '@/lib/push';
import { resend } from '@/lib/resend';
import { NextRequest, NextResponse } from 'next/server';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-inquiry-secret',
};

// Form values are interpolated into the notification email HTML — escape them.
function esc(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-inquiry-secret');
  if (secret !== process.env.INQUIRY_API_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
  }

  let body: { first_name?: string; last_name?: string; email?: string; phone?: string; company?: string; pain_point?: string; service?: string; budget?: string; message?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400, headers: corsHeaders });
  }

  const { first_name, last_name, email, phone, company, pain_point, service, budget, message } = body;

  if (!first_name || !email) {
    return NextResponse.json({ error: 'first_name and email are required' }, { status: 400, headers: corsHeaders });
  }

  const SERVICE_LABELS: Record<string, string> = {
    // Current site offer (July 2026 repositioning)
    'automation-setup': 'Business Automation Setup ($1,800)',
    'landing-page':     'Landing Page ($500)',
    'website':          'Website ($1,200)',
    'care-plan':        'Care Plan ($250/mo)',
    'not-sure':         "Not sure — let's talk",
    // Legacy values from older versions of the site (stale cached pages)
    'digital-presence': 'Digital Presence System',
    'business-ops':     'Business Operations System',
    'other':            "Not sure — let's talk",
    'website-tools':    'Website + Business Tools',
    'tool':             'Business Tool / Custom Build',
    'custom-tool':      'Business Tool / Custom Build',
  };

  const BUDGET_LABELS: Record<string, string> = {
    '1000-2500':  '$1,000 – $2,500',
    '2500-5000':  '$2,500 – $5,000',
    '5000-plus':  '$5,000+',
    'not-sure':   'Not sure yet',
  };

  const serviceLabel = service ? (SERVICE_LABELS[service] ?? service) : null;
  const budgetLabel = budget ? (BUDGET_LABELS[budget] ?? null) : null;
  const inquiryNotes = [
    serviceLabel ? `Interested in: ${serviceLabel}` : null,
    budgetLabel ? `Budget: ${budgetLabel}` : null,
    message ? `Additional notes: ${message}` : null,
  ].filter(Boolean).join('\n\n') || null;

  const name = [first_name, last_name].filter(Boolean).join(' ');

  // Warm inbound lead — lands in the approved funnel, skips qualification.
  // No clients row is created here; /api/leads/convert is the only path into
  // clients, which avoids the unique-email crash on repeat inquiries.
  const supabase = createServiceClient();
  const { error } = await supabase.from('leads').insert({
    business_name: company?.trim() || name,
    owner_name: name,
    email,
    phone: phone ?? null,
    source: 'inquiry',
    pipeline_state: 'approved',
    outreach_approved: true,
    observation: pain_point?.trim() || null,
    inquiry_notes: inquiryNotes,
    suggested_channel: phone ? 'phone' : 'email',
  });

  if (error) {
    console.error('Inquiry insert error:', error);
    return NextResponse.json({ error: 'Failed to save inquiry' }, { status: 500, headers: corsHeaders });
  }

  await sendPushNotification(
    '🆕 New Lead',
    `${name} submitted an inquiry`,
    '/admin/scout'
  );

  resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: '3rddavidstechnology@gmail.com',
    subject: `🆕 New Lead: ${name}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1A1A1A;">
        <h2 style="margin-bottom:4px;">New inquiry from ${esc(name)}</h2>
        ${company ? `<p style="font-size:13px;font-weight:600;margin-bottom:2px;">${esc(company)}</p>` : ''}
        <p style="color:#6B6B60;font-size:13px;margin-bottom:20px;">${esc(email)}${phone ? ` · ${esc(phone)}` : ''}</p>

        ${pain_point ? `
        <div style="background:#F0F7F3;border-left:4px solid #1B4D2E;padding:14px 16px;border-radius:0 8px 8px 0;margin-bottom:20px;">
          <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#1B4D2E;margin-bottom:6px;">Their Pain Point</p>
          <p style="font-size:15px;line-height:1.6;margin:0;color:#1A1A1A;">${esc(pain_point)}</p>
        </div>` : ''}

        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          ${serviceLabel ? `<tr><td style="padding:8px 0;color:#6B6B60;width:110px;">Interested In</td><td style="padding:8px 0;">${esc(serviceLabel)}</td></tr>` : ''}
          ${budgetLabel ? `<tr><td style="padding:8px 0;color:#6B6B60;">Budget</td><td style="padding:8px 0;">${esc(budgetLabel)}</td></tr>` : ''}
          ${message ? `<tr><td style="padding:8px 0;color:#6B6B60;vertical-align:top;">Notes</td><td style="padding:8px 0;line-height:1.6;">${esc(message)}</td></tr>` : ''}
        </table>

        <a href="${process.env.NEXT_PUBLIC_APP_URL}/admin/scout" style="display:inline-block;margin-top:24px;background:#1B4D2E;color:#fff;padding:11px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
          View in Admin →
        </a>
      </div>
    `,
  }).catch(() => {});

  // Instant auto-reply to the lead — the site's own "reply within 60 seconds" promise.
  resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: email,
    replyTo: '3rddavidstechnology@gmail.com',
    subject: `Got your inquiry, ${first_name} — here's what happens next`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1A1A1A;">
        <h2 style="margin-bottom:8px;">Hi ${esc(first_name)},</h2>
        <p style="margin-bottom:16px;line-height:1.6;">
          Thanks for reaching out — your inquiry just landed in my inbox.
          I'll reach out personally within 24 hours, usually same day.
        </p>

        <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#1B4D2E;margin-bottom:10px;">What happens next</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:24px;">
          <tr>
            <td style="padding:8px 0;color:#6B6B60;width:32px;vertical-align:top;font-weight:700;">1.</td>
            <td style="padding:8px 0;line-height:1.6;"><strong>15-minute fit call.</strong> We talk about how leads reach you today and whether this fits. No pitch, no pressure.</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#6B6B60;vertical-align:top;font-weight:700;">2.</td>
            <td style="padding:8px 0;line-height:1.6;"><strong>I build it.</strong> Your total time investment: about an hour. I handle everything else.</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#6B6B60;vertical-align:top;font-weight:700;">3.</td>
            <td style="padding:8px 0;line-height:1.6;"><strong>Go live within 10 days.</strong> A walkthrough on your phone and a plain-English guide.</td>
          </tr>
        </table>

        <a href="https://3rddavidstechnology.com/demo/automation" style="display:inline-block;background:#1B4D2E;color:#fff;padding:13px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">
          Watch the system in action →
        </a>

        <p style="margin-top:24px;line-height:1.6;">— David<br /><span style="color:#6B6B60;font-size:13px;">3rd David's Technology</span></p>
        <p style="margin-top:16px;color:#6B6B60;font-size:12px;">
          Questions in the meantime? Just reply to this email or write to 3rddavidstechnology@gmail.com.
        </p>
      </div>
    `,
  }).catch(() => {});

  return NextResponse.json({ success: true }, { status: 201, headers: corsHeaders });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}
