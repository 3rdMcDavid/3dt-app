# Instant Inquiry Auto-Reply — Design

**Date:** 2026-07-08
**Status:** Approved

## Purpose

When a lead submits the contact form on 3rddavidstechnology.com, they currently get
nothing until David personally responds. This feature sends the lead an instant,
branded confirmation email the moment their inquiry is saved — delivering the
"instant lead replies" promise from the site's own Business Automation Setup offer
(dogfooding step 1).

## Scope

One change, in this repo (`3dt-app`): add a lead-facing auto-reply email to
`app/api/inquiries/route.ts`. No changes to the website repo, the form, the
database schema, or the existing owner notification.

## Background / current flow

1. Site form posts to the website's `/api/submit`, which forwards to
   `app.3rddavidstechnology.com/api/inquiries` with `x-inquiry-secret`.
2. The inquiries route validates, inserts a `leads` row (`source: 'inquiry'`,
   `pipeline_state: 'approved'`), sends David a push notification and a
   notification email via Resend, then returns 201.
3. Resend is already configured: `lib/resend.ts`, `RESEND_API_KEY`,
   `RESEND_FROM_EMAIL` = `3rd Davids Technology <noreply@3rddavidstechnology.com>`
   (verified domain).

## Design

### Placement

In `app/api/inquiries/route.ts`, immediately after the successful lead insert,
alongside the existing owner-notification send. Fire-and-forget with
`.catch(() => {})`, matching the existing pattern — an email failure must never
change the 201 response the form depends on.

### Email

| Field | Value |
| --- | --- |
| From | `process.env.RESEND_FROM_EMAIL` (unchanged) |
| To | the lead's submitted email |
| Reply-To | `3rddavidstechnology@gmail.com` |
| Subject | `Got your inquiry, {first_name} — here's what happens next` |

Body: branded HTML consistent with the existing client-facing emails
(e.g. `sendPortalGetStartedEmail`): sans-serif, max-width 520px, green
(`#1B4D2E`) buttons, muted gray (`#6B6B60`) footer text.

1. Personal greeting using `first_name` (escaped with the route's `esc()` helper).
2. Confirmation line: David will reach out personally within 24 hours — usually
   same day.
3. "What happens next" — the three-step process from the site: 15-minute fit
   call → I build it (about an hour of your time) → go live within 10 days.
4. Button linking to `https://3rddavidstechnology.com/demo/automation`
   ("Watch the system in action").
5. Sign-off: "— David, 3rd David's Technology", with the gmail address as the
   questions contact in the footer.

No unsubscribe footer is required: this is a transactional reply to a direct
inquiry, not marketing.

### Error handling

- Send is not awaited for response success; `.catch(() => {})` swallows failures
  (same as the owner notification).
- `email` is already validated as required before the insert, so the send always
  has a recipient.
- `first_name` is interpolated into HTML and the subject; HTML-escape via `esc()`
  in the body (subject is plain text, no escaping needed).

### Testing

Manual, end-to-end:

1. Submit the live contact form (or `curl` the endpoint with the secret) using a
   test email address David controls.
2. Confirm the auto-reply arrives promptly, renders correctly, and Reply-To goes
   to `3rddavidstechnology@gmail.com`.
3. Confirm the existing owner notification and push notification still arrive.
4. Check the Resend dashboard log entry if anything is missing.

## Out of scope (later dogfooding steps)

- Multi-day follow-up sequences (step 3) — likely Resend Automations.
- Scheduling/booking link in the email — revisit once a Cal.com/Calendly account
  exists.
- SMS/missed-call auto-replies (step 2).
