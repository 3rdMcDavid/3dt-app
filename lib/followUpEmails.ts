// Follow-up sequence emails (dogfooding step 3). Copy approved in
// docs/superpowers/specs/2026-07-09-follow-up-sequence-design.md — edit there first.

function esc(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function firstName(ownerName: string | null) {
  return (ownerName ?? '').trim().split(/\s+/)[0] || 'there';
}

function wrap(inner: string) {
  return `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1A1A1A;">
        ${inner}
        <a href="https://3rddavidstechnology.com/demo/automation" style="display:inline-block;background:#1B4D2E;color:#fff;padding:13px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">
          Watch the system in action →
        </a>
        <p style="margin-top:24px;line-height:1.6;">— David<br /><span style="color:#6B6B60;font-size:13px;">3rd David's Technology</span></p>
        <p style="margin-top:16px;color:#6B6B60;font-size:12px;">
          Questions? Just reply to this email or write to 3rddavidstechnology@gmail.com.
        </p>
      </div>
    `;
}

export function followUpTouch(touch: 1 | 2, ownerName: string | null): { subject: string; html: string } {
  const first = firstName(ownerName);
  if (touch === 1) {
    return {
      subject: `Still thinking it over, ${first}?`,
      html: wrap(`
        <h2 style="margin-bottom:8px;">Hi ${esc(first)},</h2>
        <p style="margin-bottom:24px;line-height:1.6;">
          You reached out a few days ago about getting your follow-up and
          lead-catching automated. No pressure at all — most owners have a
          question or two at this stage. Just hit reply and ask.
        </p>
      `),
    };
  }
  return {
    subject: `Last note from me, ${first}`,
    html: wrap(`
      <h2 style="margin-bottom:8px;">Hi ${esc(first)},</h2>
      <p style="margin-bottom:24px;line-height:1.6;">
        I won't keep emailing you — this is my last note. The offer stands
        whenever you're ready: <strong>$1,800 one-time</strong>, your automation
        live within 10 days, and if it's not working within 10 days of go-live
        you pay nothing. Reply anytime — the door stays open.
      </p>
    `),
  };
}
