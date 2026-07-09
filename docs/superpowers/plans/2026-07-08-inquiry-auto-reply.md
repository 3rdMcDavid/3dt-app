# Instant Inquiry Auto-Reply Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Send the lead an instant branded confirmation email the moment their inquiry is saved by `POST /api/inquiries`.

**Architecture:** One addition to the existing inquiries route in `3dt-app`. After the lead row inserts successfully, fire a second Resend email (to the lead) next to the existing owner-notification send, fire-and-forget, so email failures never affect the 201 response.

**Tech Stack:** Next.js 16 App Router route handler, Resend Node SDK v6 (already installed and configured via `lib/resend.ts`).

**Spec:** `docs/superpowers/specs/2026-07-08-inquiry-auto-reply-design.md`

## Global Constraints

- Repo: `C:\Users\wideo\3dt-app` (NOT the website repo).
- From address: `process.env.RESEND_FROM_EMAIL!` — do not change the env var.
- Reply-To: `3rddavidstechnology@gmail.com` (exact string).
- Subject: `Got your inquiry, {first_name} — here's what happens next` (em dash, plain text, no HTML escaping in subject).
- The auto-reply must be fire-and-forget: `.catch(() => {})`, not awaited for success, placed so the 201 response does not depend on it.
- All user-supplied values interpolated into email HTML must go through the route's existing `esc()` helper.
- No test framework exists in this repo — do not add one. Verification is `npm run lint`, `npx tsc --noEmit`, and the manual end-to-end check in Task 2.

---

### Task 1: Add the lead auto-reply email to the inquiries route

**Files:**
- Modify: `app/api/inquiries/route.ts` (insert after the existing owner-notification `resend.emails.send(...).catch(() => {})` block, which ends around line 128, before the final `return NextResponse.json({ success: true } ...)`)

**Interfaces:**
- Consumes: `resend` from `@/lib/resend`, `esc()` helper and `first_name` / `email` variables already defined in this route.
- Produces: nothing consumed by other code — the route's response shape is unchanged.

- [ ] **Step 1: Add the auto-reply send**

In `app/api/inquiries/route.ts`, directly after the existing owner-notification send block (the one addressed `to: '3rddavidstechnology@gmail.com'` ending with `.catch(() => {});`) and before the `return NextResponse.json({ success: true }, ...)` line, insert:

```ts
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
```

Notes for the implementer:
- `email` and `first_name` are guaranteed non-empty here — the route returns 400 before the insert if either is missing.
- `replyTo` is the correct camelCase field name for Resend SDK v6 (this repo has `resend@^6.12.3`).
- Do not `await` the send and do not log its failure — this matches the owner-notification block directly above it.

- [ ] **Step 2: Verify lint passes**

Run (from `C:\Users\wideo\3dt-app`): `npm run lint`
Expected: exits clean, no new warnings/errors for `app/api/inquiries/route.ts`.

- [ ] **Step 3: Verify types compile**

Run: `npx tsc --noEmit`
Expected: exits 0 with no output. (If pre-existing unrelated errors appear, confirm none mention `app/api/inquiries/route.ts`.)

- [ ] **Step 4: Commit**

```bash
git add app/api/inquiries/route.ts
git commit -m "feat: instant auto-reply email to leads on inquiry submission

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Deploy and verify end-to-end

**Files:**
- None modified — deployment and manual verification only.

**Interfaces:**
- Consumes: the deployed `POST https://app.3rddavidstechnology.com/api/inquiries` endpoint (auth header `x-inquiry-secret` = `INQUIRY_API_SECRET` from `.env.local`).
- Produces: confirmation that the feature works in production.

- [ ] **Step 1: Push to deploy**

⚠️ This deploys to production (the app auto-deploys from `main`). Confirm with David before pushing if he hasn't already approved.

```bash
git push origin main
```

Expected: push succeeds; wait for the deployment to go live (check the Vercel dashboard or `vercel ls` if CLI is available).

- [ ] **Step 2: Submit a test inquiry**

Either submit the live form at https://3rddavidstechnology.com/#contact using a test email address David controls, or curl the endpoint directly (PowerShell, secret from `3dt-app\.env.local`):

```powershell
$secret = (Get-Content C:\Users\wideo\3dt-app\.env.local | Select-String '^INQUIRY_API_SECRET=').ToString().Split('=')[1]
Invoke-RestMethod -Method Post -Uri 'https://app.3rddavidstechnology.com/api/inquiries' -Headers @{ 'x-inquiry-secret' = $secret } -ContentType 'application/json' -Body (@{ first_name = 'Test'; last_name = 'AutoReply'; email = 'wideoutinfootball@gmail.com'; service = 'automation-setup'; message = 'End-to-end test of the instant auto-reply.' } | ConvertTo-Json)
```

Expected: `success : True` (HTTP 201).

- [ ] **Step 3: Verify the emails**

Check within a minute or two:
1. The test address received the auto-reply; subject reads `Got your inquiry, Test — here's what happens next`; layout renders (numbered steps, green demo button); hitting Reply addresses `3rddavidstechnology@gmail.com`.
2. `3rddavidstechnology@gmail.com` still received the `🆕 New Lead: Test AutoReply` owner notification (regression check).
3. If either is missing, check the Resend dashboard → Logs for the send attempt and error.

- [ ] **Step 4: Clean up the test lead**

Delete the `Test AutoReply` lead from the admin dashboard (`/admin/scout`, approved funnel) so it doesn't pollute the pipeline.
