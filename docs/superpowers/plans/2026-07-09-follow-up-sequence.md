# Inquiry Follow-Up Sequence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automatically email website-inquiry leads that go quiet — touch 1 at day 3, touch 2 at day 7 — stopping on status change or a per-lead toggle.

**Architecture:** A daily Vercel Cron hits a secret-guarded route in `3dt-app` that queries eligible leads from Supabase and sends the due touch via the existing Resend client. Sequence state is three new columns on `leads`; the admin lead sheet gets a toggle + progress indicator.

**Tech Stack:** Next.js 16 App Router route handler, Supabase (service client), Resend SDK v6, Vercel Cron.

**Spec:** `docs/superpowers/specs/2026-07-09-follow-up-sequence-design.md`

## Global Constraints

- Repo: `C:\Users\wideo\3dt-app`. No test framework exists — do not add one; verification is `npx eslint <file>`, `npx tsc --noEmit`, and Task 4's manual end-to-end.
- Eligibility (verbatim from spec): `source = 'inquiry'`, `auto_follow_up = true`, `pipeline_state in ('approved','contacted','follow_up')`, `email is not null`, `follow_up_touches_sent < 2`.
- Send rules: touch 1 when `follow_up_touches_sent = 0` and lead ≥ 3 days old; touch 2 when `= 1` and ≥ 7 days old.
- Emails: `from: process.env.RESEND_FROM_EMAIL!`, `replyTo: '3rddavidstechnology@gmail.com'`, copy exactly as written in Task 2 (approved at spec review).
- All sends awaited; Resend SDK reports failures via `{error}` in the result (it does not throw for API errors); increment the counter only after a successful send.
- Cron schedule: `0 14 * * *` (14:00 UTC). Route auth: `Authorization: Bearer ${CRON_SECRET}`, 401 otherwise or when the env var is unset.
- `supabase/schema.sql` must stay authoritative — update it in the same commit as the migration.

---

### Task 1: Migration + types

**Files:**
- Create: `supabase/migrations/20260709_follow_up_sequence.sql`
- Modify: `supabase/schema.sql` (leads table, after `interested_at  timestamptz`)
- Modify: `lib/types.ts` (leads Row ~line 573-578, Insert ~610-615, Update ~647-652 — the blocks ending with `interested_at`)

**Interfaces:**
- Produces: columns `auto_follow_up boolean not null default true`, `follow_up_touches_sent int not null default 0`, `last_follow_up_at timestamptz null` on `leads`; same names in the `Database` type (`auto_follow_up: boolean`, `follow_up_touches_sent: number`, `last_follow_up_at: string | null` in Row; optional in Insert/Update). Tasks 2 and 3 rely on these exact names.

- [x] **Step 1: Write the migration**

`supabase/migrations/20260709_follow_up_sequence.sql`:

```sql
-- Inquiry follow-up sequence (dogfooding step 3).
-- auto_follow_up: per-lead kill switch; follow_up_touches_sent: 0..2;
-- last_follow_up_at: when the most recent touch went out.
alter table leads
  add column auto_follow_up          boolean     not null default true,
  add column follow_up_touches_sent  int         not null default 0,
  add column last_follow_up_at       timestamptz;
```

- [x] **Step 2: Apply it to the live DB**

Via the Supabase MCP (`apply_migration`, project `tlmjfqpgwuvuthcowbkc`, name `follow_up_sequence`) or paste into the Supabase SQL editor. Verify:

```sql
select column_name, data_type, column_default from information_schema.columns
where table_name = 'leads' and column_name like '%follow_up%';
```

Expected: three rows (`follow_up_date` pre-existing plus the two new `follow_up*` columns) — plus check `auto_follow_up` separately; simplest: `select auto_follow_up, follow_up_touches_sent, last_follow_up_at from leads limit 1;` returns without error.

- [x] **Step 3: Update schema.sql**

In `supabase/schema.sql`, inside `create table leads (...)`, after the line `  interested_at      timestamptz` add (note: comma-terminate the previous line):

```sql
  interested_at      timestamptz,
  auto_follow_up          boolean     not null default true,
  follow_up_touches_sent  int         not null default 0,
  last_follow_up_at       timestamptz
```

- [x] **Step 4: Update lib/types.ts**

In the `leads` table type, add to **Row** (after `interested_at: string | null`):

```ts
          auto_follow_up: boolean
          follow_up_touches_sent: number
          last_follow_up_at: string | null
```

Add to **Insert** and **Update** (after their `interested_at?: string | null` lines, same in both):

```ts
          auto_follow_up?: boolean
          follow_up_touches_sent?: number
          last_follow_up_at?: string | null
```

- [x] **Step 5: Verify types compile**

Run (from `C:\Users\wideo\3dt-app`): `npx tsc --noEmit` — expected: exit 0, no output.

- [x] **Step 6: Commit**

```bash
git add supabase/migrations/20260709_follow_up_sequence.sql supabase/schema.sql lib/types.ts
git commit -m "feat: follow-up sequence columns on leads

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Email builders + cron route + cron config

**Files:**
- Create: `lib/followUpEmails.ts`
- Create: `app/api/cron/follow-ups/route.ts`
- Create: `vercel.json` (repo has none)

**Interfaces:**
- Consumes: Task 1's columns; `createServiceClient` from `@/lib/supabase/service`; `resend` from `@/lib/resend`.
- Produces: `followUpTouch(touch: 1 | 2, ownerName: string | null): { subject: string; html: string }`; route `GET /api/cron/follow-ups` returning `{ checked, sent, failed }`.

- [x] **Step 1: Write the email builders**

`lib/followUpEmails.ts`:

```ts
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
```

- [x] **Step 2: Write the cron route**

`app/api/cron/follow-ups/route.ts`:

```ts
import { createServiceClient } from '@/lib/supabase/service';
import { resend } from '@/lib/resend';
import { followUpTouch } from '@/lib/followUpEmails';
import { NextRequest, NextResponse } from 'next/server';

const ELIGIBLE_STATES = ['approved', 'contacted', 'follow_up'];
const DAY_MS = 86_400_000;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();
  const { data: leads, error } = await supabase
    .from('leads')
    .select('id, owner_name, email, created_at, follow_up_touches_sent')
    .eq('source', 'inquiry')
    .eq('auto_follow_up', true)
    .in('pipeline_state', ELIGIBLE_STATES)
    .not('email', 'is', null)
    .lt('follow_up_touches_sent', 2);

  if (error) {
    console.error('Follow-up cron: leads query failed:', error);
    return NextResponse.json({ error: 'Query failed' }, { status: 500 });
  }

  let sent = 0;
  let failed = 0;
  const now = Date.now();

  for (const lead of leads ?? []) {
    const ageDays = (now - new Date(lead.created_at as string).getTime()) / DAY_MS;
    const touches = lead.follow_up_touches_sent;
    let touch: 1 | 2 | null = null;
    if (touches === 0 && ageDays >= 3) touch = 1;
    else if (touches === 1 && ageDays >= 7) touch = 2;
    if (!touch) continue;

    try {
      const { subject, html } = followUpTouch(touch, lead.owner_name);
      const result = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL!,
        to: lead.email as string,
        replyTo: '3rddavidstechnology@gmail.com',
        subject,
        html,
      });
      if (result.error) {
        console.error(`Follow-up touch ${touch} failed for lead ${lead.id}:`, result.error);
        failed++;
        continue;
      }
      const { error: updateError } = await supabase
        .from('leads')
        .update({ follow_up_touches_sent: touches + 1, last_follow_up_at: new Date().toISOString() })
        .eq('id', lead.id);
      if (updateError) {
        // Email went out but the counter didn't advance — surface loudly, a
        // rerun would double-send to this lead.
        console.error(`Follow-up counter update failed for lead ${lead.id}:`, updateError);
      }
      sent++;
    } catch (e) {
      console.error(`Follow-up touch ${touch} threw for lead ${lead.id}:`, e);
      failed++;
    }
  }

  return NextResponse.json({ checked: leads?.length ?? 0, sent, failed });
}
```

- [x] **Step 3: Add the cron config**

`vercel.json` (new file at repo root):

```json
{
  "crons": [{ "path": "/api/cron/follow-ups", "schedule": "0 14 * * *" }]
}
```

- [x] **Step 4: Lint and type-check**

Run: `npx eslint lib/followUpEmails.ts app/api/cron/follow-ups/route.ts` — expected: clean.
Run: `npx tsc --noEmit` — expected: exit 0.

- [x] **Step 5: Commit**

```bash
git add lib/followUpEmails.ts app/api/cron/follow-ups/route.ts vercel.json
git commit -m "feat: daily cron sends day-3/day-7 follow-ups to quiet inquiry leads

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Admin toggle + indicator

**Files:**
- Modify: `app/admin/components/LeadDetailSheet.tsx` (local `Lead` type ~line 23-47; JSX after the pipeline-status `<select>` block ~line 335)

**Interfaces:**
- Consumes: Task 1's columns via the sheet's existing `save(updates)` helper (line 82) which writes through the browser Supabase client and calls `onLeadUpdate`.

- [x] **Step 1: Extend the local Lead type**

In the `type Lead = { ... }` block, after `inquiry_notes: string | null;` add:

```ts
  auto_follow_up: boolean;
  follow_up_touches_sent: number;
  last_follow_up_at: string | null;
```

- [x] **Step 2: Add the indicator helper**

Below the `STATUS_OPTIONS` constant (module scope), add:

```ts
const FOLLOW_UP_ACTIVE_STATES = ['approved', 'contacted', 'follow_up'];

function followUpSummary(lead: {
  pipeline_state: string | null;
  auto_follow_up: boolean;
  follow_up_touches_sent: number;
}): string {
  if (lead.follow_up_touches_sent >= 2) return '2/2 sent — sequence done';
  if (!FOLLOW_UP_ACTIVE_STATES.includes(lead.pipeline_state ?? ''))
    return `stopped (${lead.pipeline_state})`;
  if (!lead.auto_follow_up) return 'off';
  return `${lead.follow_up_touches_sent}/2 sent`;
}
```

- [x] **Step 3: Render the toggle for inquiry leads**

Directly after the pipeline-status `<select>`'s wrapping element (the block around line 335 containing `value={lead.pipeline_state ?? 'new'}`), insert:

```tsx
              {lead.source === 'inquiry' && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, padding: '10px 12px', background: '#F7F7F2', borderRadius: 8 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>Auto follow-up</div>
                    <div style={{ fontSize: 12, color: '#6B6B60' }}>{followUpSummary(lead)}</div>
                  </div>
                  <button
                    onClick={() => save({ auto_follow_up: !lead.auto_follow_up })}
                    disabled={saving}
                    style={{
                      padding: '6px 14px', borderRadius: 999, border: 'none', cursor: 'pointer',
                      fontSize: 12, fontWeight: 700,
                      background: lead.auto_follow_up ? '#1B4D2E' : '#D9D9D2',
                      color: lead.auto_follow_up ? '#fff' : '#1A1A1A',
                    }}
                  >
                    {lead.auto_follow_up ? 'ON' : 'OFF'}
                  </button>
                </div>
              )}
```

(If the surrounding JSX uses className-based styling rather than inline styles, match the file's actual convention when inserting — behavior stays as written.)

- [x] **Step 4: Lint and type-check**

Run: `npx eslint app/admin/components/LeadDetailSheet.tsx` — expected: no new errors.
Run: `npx tsc --noEmit` — expected: exit 0.

- [x] **Step 5: Commit**

```bash
git add app/admin/components/LeadDetailSheet.tsx
git commit -m "feat: auto-follow-up toggle and progress on inquiry lead sheet

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: Deploy, env, end-to-end verification

**Files:** none — deployment and verification.

**Interfaces:**
- Consumes: everything above, deployed at `app.3rddavidstechnology.com`.

- [x] **Step 1: Set CRON_SECRET on Vercel**

Generate and add (David approved CLI use; project is linked):

```bash
cd /c/Users/wideo/3dt-app
openssl rand -hex 32 > /tmp/cron_secret.txt
npx vercel env add CRON_SECRET production < /tmp/cron_secret.txt
```

Keep the value in hand for Step 4's curl. (If `vercel env add` prompts interactively, have David paste the value in the Vercel dashboard instead: Settings → Environment Variables → `CRON_SECRET`, production.)

- [x] **Step 2: Pre-deploy pipeline review**

Old eligible inquiry leads will enter the sequence on the first run (spec: intentional). List them; David reviews and opts out any that shouldn't be emailed:

```sql
select id, owner_name, email, created_at, pipeline_state from leads
where source = 'inquiry' and auto_follow_up = true
  and pipeline_state in ('approved','contacted','follow_up') and email is not null;
```

Opt-out is `update leads set auto_follow_up = false where id = '...'` (or the new toggle once deployed).

- [x] **Step 3: Push to deploy**

⚠️ Deploys to production. `git push origin main`, then wait for the deployment to reach READY (Vercel dashboard or MCP). Confirm the cron registered: Vercel dashboard → project → Settings → Cron Jobs shows `/api/cron/follow-ups` at `0 14 * * *`.

- [x] **Step 4: End-to-end test**

```bash
# 1. Create a test lead through the real form
curl -s -X POST https://3rddavidstechnology.com/api/submit -H 'Content-Type: application/json' \
  -d '{"first_name":"Test","last_name":"FollowUp","email":"wideoutinfootball@gmail.com","service":"automation-setup","message":"Follow-up sequence e2e test."}'
```

Then in SQL: `update leads set created_at = now() - interval '4 days' where owner_name = 'Test FollowUp';`

```bash
# 2. Trigger the cron manually (unauth first, then auth)
curl -s -o /dev/null -w '%{http_code}\n' https://app.3rddavidstechnology.com/api/cron/follow-ups          # expect 401
curl -s https://app.3rddavidstechnology.com/api/cron/follow-ups -H "Authorization: Bearer $(cat /tmp/cron_secret.txt)"  # expect {"checked":N,"sent":1,"failed":0}
```

Verify: touch-1 email ("Still thinking it over, Test?") arrives at David's personal inbox with reply-to the business Gmail; `follow_up_touches_sent = 1` in SQL. Then backdate to 8 days, curl again → touch 2 ("Last note from me, Test"), counter 2; curl a third time → `sent: 0`. Reset counter to 0, flip the dashboard toggle OFF, curl → `sent: 0`. NOTE: the instant auto-reply from step 1 will also have fired at lead creation — expected, ignore it.

- [x] **Step 5: Clean up**

```sql
delete from leads where owner_name = 'Test FollowUp' and email = 'wideoutinfootball@gmail.com';
```

Delete `/tmp/cron_secret.txt`. Done.
