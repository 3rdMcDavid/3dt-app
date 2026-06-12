-- 3dt-app database schema
-- Authoritative reference — represents the full current DB structure.
-- To reset a project from scratch, run this in Supabase SQL Editor → New query.

-- ── Tables ──────────────────────────────────────────────────────────────────

create table clients (
  id         uuid        default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  name       text        not null,
  email      text        not null unique,
  phone      text,
  company    text,
  status     text        not null default 'lead'
             check (status in ('lead', 'active', 'completed')),
  notes      text
);

create table projects (
  id                    uuid        default gen_random_uuid() primary key,
  created_at            timestamptz default now(),
  client_id             uuid        not null references clients(id) on delete cascade,
  title                 text        not null,
  project_type          text        not null default 'website'
                        check (project_type in ('website', 'tool', 'website_tool')),
  stage                 text        not null default 'discovery'
                        check (stage in ('discovery', 'proposal', 'contract', 'build', 'review', 'handoff_pending', 'launched')),
  revision_stage        text        default 'awaiting_intake'
                        check (revision_stage in (
                          'awaiting_intake', 'intake_received',
                          'revision_1_open', 'revision_1_received',
                          'revision_2_open', 'revision_2_received',
                          'post_final_open', 'extra_revision_requested', 'complete'
                        )),
  revision_components   text        not null default 'both'
                        check (revision_components in ('website', 'tool', 'both')),
  draft_url             text,
  tool_draft_url        text,
  notes                 text,
  -- Launch / handoff fields (populated by client via portal)
  client_vercel_email   text,
  client_github_username text,
  launch_notes          text,
  launch_submitted_at   timestamptz,
  launch_confirmed_at   timestamptz
);

create table proposals (
  id           uuid          default gen_random_uuid() primary key,
  created_at   timestamptz   default now(),
  project_id   uuid          not null references projects(id) on delete cascade,
  deliverables text          not null,
  price        numeric(10,2) not null,
  status       text          not null default 'draft'
               check (status in ('draft', 'sent', 'accepted', 'declined'))
);

create table contracts (
  id                 uuid        default gen_random_uuid() primary key,
  created_at         timestamptz default now(),
  project_id         uuid        not null references projects(id) on delete cascade,
  content            text        not null,
  sign_token         uuid        not null default gen_random_uuid(),  -- magic link for /sign/[token]
  sign_email_sent_at timestamptz,
  signed_at          timestamptz,
  signature_name     text,
  signature_ip       text
);

-- contract_templates: admin-editable template used to pre-fill new contracts.
-- Only one row expected; onboardClientAction uses .single().
create table contract_templates (
  id         uuid        default gen_random_uuid() primary key,
  updated_at timestamptz default now(),
  content    text        not null default ''
);

create table invoices (
  id                 uuid          default gen_random_uuid() primary key,
  created_at         timestamptz   default now(),
  project_id         uuid          not null references projects(id) on delete cascade,
  amount             numeric(10,2) not null,
  type               text          not null check (type in ('deposit', 'final', 'addon')),
  stripe_payment_id  text,
  stripe_payment_url text,
  status             text          not null default 'unpaid'
                     check (status in ('unpaid', 'paid')),
  due_date           date
);

-- Persists selected scope items per project for display, add-on tracking, and reference.
-- is_addon = false → chosen at onboarding; is_addon = true → added post-creation.
-- invoice_id is null for original scope items; set to the add-on invoice for addon items.
create table project_scope_items (
  id         uuid          default gen_random_uuid() primary key,
  created_at timestamptz   default now(),
  project_id uuid          not null references projects(id) on delete cascade,
  name       text          not null,
  price      numeric(10,2) not null,
  is_addon   boolean       not null default false,
  invoice_id uuid          references invoices(id) on delete set null
);

create table documents (
  id         uuid        default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  project_id uuid        not null references projects(id) on delete cascade,
  file_url   text        not null,
  file_name  text        not null,
  type       text        not null
);

-- Magic-link tokens for client portal access (no password required).
-- Portal routes use the service role key server-side after validating the token.
create table portal_sessions (
  id         uuid        default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  project_id uuid        not null references projects(id) on delete cascade,
  token      uuid        not null default gen_random_uuid() unique,
  sent_at    timestamptz,
  expires_at timestamptz not null default (now() + interval '30 days')
);

-- Client intake form responses submitted through the portal.
-- type tracks which round of review the submission belongs to.
create table intake_submissions (
  id                    uuid        default gen_random_uuid() primary key,
  created_at            timestamptz default now(),
  project_id            uuid        not null references projects(id) on delete cascade,
  type                  text        not null
                        check (type in ('initial', 'revision_1', 'revision_2', 'post_final')),
  approved              boolean     not null default false,
  -- Website fields
  pages_type            text,
  pages_list            text[],
  business_name         text,
  tagline               text,
  description           text,
  target_audience       text,
  services_offered      text,
  primary_cta           text,
  phone                 text,
  business_email        text,
  business_address      text,
  existing_domain       text,
  existing_website      text,
  style_notes           text,
  brand_colors          text,
  content_ready         text,
  bio                   text,
  testimonials          text,
  special_features      text[],
  social_facebook       text,
  social_instagram      text,
  social_linkedin       text,
  social_other          text,
  additional_notes      text,
  -- Tool / automation fields
  tool_problem          text,
  tool_current_workflow text,
  tool_desired_output   text,
  tool_systems          text,
  tool_success_criteria text
);

-- Files uploaded alongside an intake submission (stored in the 'intake' Storage bucket).
create table intake_files (
  id                   uuid        default gen_random_uuid() primary key,
  created_at           timestamptz default now(),
  intake_submission_id uuid        not null references intake_submissions(id) on delete cascade,
  project_id           uuid        not null references projects(id) on delete cascade,
  file_name            text        not null,
  file_url             text        not null  -- storage path: {project_id}/{submission_id}/{timestamp}-{filename}
);

-- Prospects found by the Scout agent (WSL pipeline) or entered via the inquiry
-- form / manual entry. Unified funnel:
--   new → qualified → approved → contacted → follow_up → interested
--   terminal: won | lost | rejected
create table leads (
  id                 uuid        default gen_random_uuid() primary key,
  created_at         timestamptz default now(),
  updated_at         timestamptz,
  business_name      text        not null,
  business_type      text,
  city               text,
  pipeline_state     text        not null default 'new'
                     check (pipeline_state in (
                       'new', 'qualified', 'approved', 'contacted', 'follow_up',
                       'interested', 'won', 'lost', 'rejected'
                     )),
  source             text        not null default 'scout'
                     check (source in ('scout', 'inquiry', 'referral', 'manual')),
  tier               text        check (tier is null or tier in ('A', 'B')),
  fit_score          int,        -- rule-based score, 0–12 (legacy rows: 1–10 LLM score)
  fit_reason         text,       -- legacy LLM reason; superseded by observation
  score_breakdown    jsonb,      -- e.g. {"no_website": 3, "reviews_20_plus": 2}
  observation        text,       -- one-sentence call opener (the most damning true problem)
  owner_name         text,
  email              text,
  phone              text,
  address            text,
  website            text,
  rating             numeric,
  review_count       int,
  google_place_id    text        unique,  -- dedupe across scout runs
  google_maps_url    text,
  search_query       text,
  suggested_channel  text        check (suggested_channel is null or
                                        suggested_channel in ('phone', 'facebook_dm', 'email')),
  inquiry_notes      text,       -- service / budget / message block from the inquiry form
  outreach_draft     text,
  outreach_approved  boolean     default false,
  outreach_sent_at   timestamptz,
  notes              text,
  tags               text[],
  call_attempted_at  timestamptz,
  call_outcome       text,
  call_notes         text,
  follow_up_date     date,
  interested_at      timestamptz
);

-- LEGACY — pre-OneSignal web-push subscriptions. No code reads or writes this
-- table anymore (lib/push.ts uses the OneSignal API). Safe to drop.
create table push_subscriptions (
  id         uuid        default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  endpoint   text        not null,
  p256dh     text        not null,
  auth       text        not null
);

-- Job queue + history for the scout pipeline. The Vercel app inserts
-- 'requested'; the WSL watcher claims it ('running') and runs the pipeline.
create table pipeline_runs (
  id              uuid        default gen_random_uuid() primary key,
  started_at      timestamptz default now(),
  completed_at    timestamptz,
  status          text        not null default 'requested'
                  check (status in ('requested', 'running', 'complete', 'error')),
  requested_count    int         default 10,
  leads_found        int         default 0,
  leads_qualified    int         default 0,
  leads_disqualified int         default 0,
  triggered_by       text        default 'manual'
);

-- ── Row Level Security ───────────────────────────────────────────────────────

alter table clients            enable row level security;
alter table projects           enable row level security;
alter table proposals          enable row level security;
alter table contracts          enable row level security;
alter table contract_templates enable row level security;
alter table invoices           enable row level security;
alter table project_scope_items enable row level security;
alter table documents          enable row level security;
alter table portal_sessions    enable row level security;
alter table intake_submissions enable row level security;
alter table intake_files       enable row level security;
alter table leads              enable row level security;
alter table pipeline_runs      enable row level security;
alter table push_subscriptions enable row level security;

-- Admin (David — the only authenticated user) has full access to all tables.
-- Portal clients are unauthenticated; portal routes use the service role key
-- server-side after validating the token, so no anon RLS policies are needed.
-- The scout agent (WSL) uses the service role key, which bypasses RLS.

create policy "admin_all" on clients             for all using (auth.role() = 'authenticated');
create policy "admin_all" on projects            for all using (auth.role() = 'authenticated');
create policy "admin_all" on proposals           for all using (auth.role() = 'authenticated');
create policy "admin_all" on contracts           for all using (auth.role() = 'authenticated');
create policy "admin_all" on contract_templates  for all using (auth.role() = 'authenticated');
create policy "admin_all" on invoices            for all using (auth.role() = 'authenticated');
create policy "admin_all" on project_scope_items for all using (auth.role() = 'authenticated');
create policy "admin_all" on documents           for all using (auth.role() = 'authenticated');
create policy "admin_all" on portal_sessions     for all using (auth.role() = 'authenticated');
create policy "admin_all" on intake_submissions  for all using (auth.role() = 'authenticated');
create policy "admin_all" on intake_files        for all using (auth.role() = 'authenticated');
create policy "admin_all" on leads               for all using (auth.role() = 'authenticated');
create policy "admin_all" on pipeline_runs       for all using (auth.role() = 'authenticated');
create policy "admin_all" on push_subscriptions  for all using (auth.role() = 'authenticated');

-- ── Storage buckets ──────────────────────────────────────────────────────────
-- Create these in Storage → Buckets after running this schema:
--   • "documents" — private; stores project files uploaded from the admin hub.
--                   Accessed via signed URLs generated server-side.
--   • "intake"    — private; stores files uploaded with intake submissions.
--                   Path pattern: {project_id}/{submission_id}/{timestamp}-{filename}
