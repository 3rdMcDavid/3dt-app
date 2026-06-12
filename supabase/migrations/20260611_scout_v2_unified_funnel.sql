-- Scout v2 + unified lead funnel (2026-06-11)
--
-- Run this in Supabase SQL Editor immediately BEFORE pushing the matching app
-- code to main (the state → pipeline_state rename breaks the old deploy).
-- Also add SUPABASE_SERVICE_ROLE_KEY to the scout .env in WSL before the next
-- pipeline run — RLS is enabled on leads/pipeline_runs at the end of this file.

-- ── 1. Leads: unified funnel columns ─────────────────────────────────────────
-- (place_id dedupe already exists as the unique google_place_id column — reused)

alter table leads
  add column if not exists source            text,
  add column if not exists tier              text,
  add column if not exists score_breakdown   jsonb,
  add column if not exists observation       text,
  add column if not exists suggested_channel text,
  add column if not exists owner_name        text,
  add column if not exists email             text,
  add column if not exists inquiry_notes     text;

-- source already existed in the live DB: the old pipeline wrote 'google_places'.
-- Normalize before constraining.
update leads set source = 'scout'
  where source is null or source not in ('scout', 'inquiry', 'referral', 'manual');
alter table leads alter column source set default 'scout';
alter table leads alter column source set not null;

alter table leads drop constraint if exists leads_source_check;
alter table leads add constraint leads_source_check
  check (source in ('scout', 'inquiry', 'referral', 'manual'));

alter table leads drop constraint if exists leads_tier_check;
alter table leads add constraint leads_tier_check
  check (tier is null or tier in ('A', 'B'));

alter table leads drop constraint if exists leads_suggested_channel_check;
alter table leads add constraint leads_suggested_channel_check
  check (suggested_channel is null or suggested_channel in ('phone', 'facebook_dm', 'email'));

-- ── 2. Fix the state/city naming collision ──────────────────────────────────

alter table leads rename column state to pipeline_state;

-- ── 3. Normalize legacy states, then enforce the expanded funnel ────────────
--    new → qualified → approved → contacted → follow_up → interested
--    terminal: won | lost | rejected

update leads set pipeline_state = 'contacted' where pipeline_state = 'called';
update leads set pipeline_state = 'lost'      where pipeline_state = 'not_interested';
update leads set pipeline_state = 'rejected'  where pipeline_state = 'disqualified';
update leads set pipeline_state = 'new'       where pipeline_state is null;

alter table leads alter column pipeline_state set default 'new';
alter table leads alter column pipeline_state set not null;

alter table leads drop constraint if exists leads_state_check;
alter table leads drop constraint if exists leads_pipeline_state_check;
alter table leads add constraint leads_pipeline_state_check
  check (pipeline_state in (
    'new', 'qualified', 'approved', 'contacted', 'follow_up',
    'interested', 'won', 'lost', 'rejected'
  ));

-- ── 4. pipeline_runs becomes a job queue ────────────────────────────────────
--    Vercel inserts 'requested'; the WSL watcher claims it ('running'),
--    runs the pipeline, then marks 'complete' / 'error'.

alter table pipeline_runs
  add column if not exists requested_count int default 10;

alter table pipeline_runs drop constraint if exists pipeline_runs_status_check;
alter table pipeline_runs add constraint pipeline_runs_status_check
  check (status in ('requested', 'running', 'complete', 'error'));

-- ── 5. RLS — match the rest of the schema ───────────────────────────────────
--    The scout agent must switch to the service role key (bypasses RLS).

alter table leads         enable row level security;
alter table pipeline_runs enable row level security;

drop policy if exists "admin_all" on leads;
create policy "admin_all" on leads         for all using (auth.role() = 'authenticated');
drop policy if exists "admin_all" on pipeline_runs;
create policy "admin_all" on pipeline_runs for all using (auth.role() = 'authenticated');
