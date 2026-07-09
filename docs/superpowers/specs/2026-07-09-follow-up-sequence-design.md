# Inquiry Follow-Up Sequence — Design

**Date:** 2026-07-09
**Status:** Approved
**Dogfooding step 3** (step 1: instant auto-reply, shipped; step 2: SMS, skipped for now)

## Purpose

Website inquiry leads that go quiet get followed up automatically — the site's own
"automatic follow-up" promise, applied to David's business. Two email touches on
day 3 and day 7 after the inquiry, stopping the moment David marks the lead
interested/won/lost/rejected or flips a per-lead kill switch.

## Scope

All in this repo (`3dt-app`):

1. Migration: three new columns on `leads`.
2. New cron route `app/api/cron/follow-ups/route.ts` + `vercel.json` cron entry
   (repo currently has no vercel config file).
3. Two follow-up emails sent via the existing Resend client.
4. Admin UI: auto-follow-up toggle + touches-sent indicator on the lead detail.

Out of scope: scout-sourced leads (cold outreach stays manual — automated
sequences to non-opted-in addresses risk the sending domain), SMS, any change to
the instant auto-reply.

## Decisions (from brainstorm 2026-07-09)

- **Audience:** `source = 'inquiry'` leads only.
- **Cadence:** two touches — day 3 and day 7 after `created_at`. Sequence ends
  after touch 2.
- **Stop signals (either):** pipeline_state moves to `interested`, `won`,
  `lost`, or `rejected` (falls out of eligibility), or David turns the per-lead
  `auto_follow_up` toggle off.

## Design

### Data model

Migration `supabase/migrations/20260709_follow_up_sequence.sql` (run against the
live DB before deploying, per repo convention; `supabase/schema.sql` updated in
the same commit to stay authoritative):

```sql
alter table leads
  add column auto_follow_up          boolean     not null default true,
  add column follow_up_touches_sent  int         not null default 0,
  add column last_follow_up_at       timestamptz;
```

Existing rows default to `auto_follow_up = true`. Note the effect on inquiry
leads that predate this feature: a lead already ≥7 days old in an eligible state
gets touch 1 on the first cron run and touch 2 the next day (touches gate on age
thresholds plus the counter, not on time since the previous touch). This is
intentional and acceptable, but David reviews the pipeline before deploy and
pre-sets `follow_up_touches_sent = 2` (or toggles off) any existing lead that
shouldn't hear from the sequence.

### Cron route

`app/api/cron/follow-ups/route.ts`, `GET`.

- **Auth:** requires `Authorization: Bearer ${CRON_SECRET}`. Vercel sends this
  header automatically for cron invocations when the `CRON_SECRET` env var is
  set on the project (David must add it in Vercel: a long random string,
  Sensitive is fine — it never needs to be pulled). Requests without it get 401.
- **Schedule:** `vercel.json` → `{"crons": [{"path": "/api/cron/follow-ups",
  "schedule": "0 14 * * *"}]}` — daily 14:00 UTC ≈ 8–9 AM Mobile, AL.
- **Eligibility query** (service client): `source = 'inquiry'`,
  `auto_follow_up = true`, `pipeline_state in ('approved','contacted','follow_up')`,
  `email is not null`, `follow_up_touches_sent < 2`.
- **Send rules per lead:**
  - `follow_up_touches_sent = 0` and `created_at <= now() - 3 days` → send touch 1.
  - `follow_up_touches_sent = 1` and `created_at <= now() - 7 days` → send touch 2.
  - Otherwise skip.
- **After each successful send:** increment `follow_up_touches_sent`, set
  `last_follow_up_at = now()`. On send failure (Resend `{error}` or throw): log
  via `console.error`, do NOT increment — the next daily run retries.
- **Response:** JSON summary `{ checked, sent, failed }` for log visibility.
- Sends are awaited (lesson from step 1: fire-and-forget dies on function
  freeze, and the Resend SDK returns errors rather than throwing).

### Emails

Same visual style as the instant auto-reply (sans-serif, 520px, green `#1B4D2E`
button, muted footer), `from: RESEND_FROM_EMAIL`, `replyTo:
3rddavidstechnology@gmail.com`. First name = first word of `owner_name`,
HTML-escaped.

**Touch 1 — day 3.** Subject: `Still thinking it over, {first_name}?`
Body: one short paragraph — "You reached out a few days ago about getting your
follow-up and lead-catching automated. No pressure at all — most owners have a
question or two at this stage. Just hit reply and ask." Button: "Watch the
system in action →" → `https://3rddavidstechnology.com/demo/automation`.
Sign-off "— David".

**Touch 2 — day 7.** Subject: `Last note from me, {first_name}`
Body: "I won't keep emailing you — this is my last note. The offer stands
whenever you're ready: $1,800 one-time, your automation live within 10 days,
and if it's not working within 10 days of go-live you pay nothing. Reply
anytime — the door stays open." Same button. Sign-off "— David".

Copy is final as written here unless David edits it at spec review.

### Admin UI

In `LeadDetailSheet` (the lead drawer used by scout/admin pages), for
inquiry-source leads only:

- A visible **"Auto follow-up: ON/OFF"** toggle bound to `auto_follow_up`,
  saving immediately (same pattern as the existing status dropdown).
- A small indicator: "0/2 · next ~{date}", "1/2 sent", or "2/2 — sequence done",
  derived from `follow_up_touches_sent`, `created_at`, `last_follow_up_at`.
- When pipeline_state is terminal/interested, show "stopped (status)" instead of
  the next-send hint.

### Error handling

- Route never 500s for a single bad lead: per-lead try/catch, failures counted
  and logged, loop continues.
- Idempotency: touches keyed to `follow_up_touches_sent` counter — a duplicate
  cron invocation on the same day finds the counter already incremented and
  skips. (Vercel Hobby cron fires within an hour window; exact time doesn't
  matter at daily cadence.)
- Missing `CRON_SECRET` env → route returns 401 for everything, cron does
  nothing, no emails leak.

### Testing (manual, end-to-end)

1. Run the migration; verify columns exist and schema.sql matches.
2. Deploy with `CRON_SECRET` set; insert a test inquiry lead via the live form.
3. Backdate it: `update leads set created_at = now() - interval '4 days'` for
   the test lead. Curl the cron route with the bearer secret → expect
   `{sent: 1}`, touch-1 email in David's personal inbox (check content +
   reply-to), `follow_up_touches_sent = 1`.
4. Backdate to 8 days, curl again → touch 2 arrives, counter = 2. Curl a third
   time → `{sent: 0}` (sequence done).
5. Reset a lead to counter 0, toggle `auto_follow_up` off in the dashboard,
   curl → skipped.
6. Verify the toggle + indicator render in the lead sheet.
7. Delete test lead.

## Open dependency

`CRON_SECRET` must be added to Vercel project env (production) by David or via
CLI before the cron is useful; the code ships safely without it (401s).
