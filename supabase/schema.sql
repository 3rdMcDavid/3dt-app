-- 3dt-app database schema
-- Run this in the Supabase SQL editor (project → SQL Editor → New query)

-- ── Tables ──────────────────────────────────────────────────────────────────

create table clients (
  id         uuid        default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  name       text        not null,
  email      text        not null unique,
  phone      text,
  status     text        not null default 'lead'
             check (status in ('lead', 'active', 'completed'))
);

create table projects (
  id         uuid        default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  client_id  uuid        not null references clients(id) on delete cascade,
  title      text        not null,
  stage      text        not null default 'discovery'
             check (stage in ('discovery', 'proposal', 'contract', 'build', 'review', 'launched')),
  notes      text
);

create table proposals (
  id           uuid        default gen_random_uuid() primary key,
  created_at   timestamptz default now(),
  project_id   uuid        not null references projects(id) on delete cascade,
  deliverables text        not null,
  price        numeric(10,2) not null,
  status       text        not null default 'draft'
               check (status in ('draft', 'sent', 'accepted', 'declined'))
);

create table contracts (
  id             uuid        default gen_random_uuid() primary key,
  created_at     timestamptz default now(),
  project_id     uuid        not null references projects(id) on delete cascade,
  content        text        not null,
  signed_at      timestamptz,
  signature_name text,
  signature_ip   text
);

create table invoices (
  id                 uuid        default gen_random_uuid() primary key,
  created_at         timestamptz default now(),
  project_id         uuid        not null references projects(id) on delete cascade,
  amount             numeric(10,2) not null,
  type               text        not null check (type in ('deposit', 'final')),
  stripe_payment_id  text,
  stripe_payment_url text,
  status             text        not null default 'unpaid'
                     check (status in ('unpaid', 'paid')),
  due_date           date
);

create table documents (
  id         uuid        default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  project_id uuid        not null references projects(id) on delete cascade,
  file_url   text        not null,
  file_name  text        not null,
  type       text        not null
);

-- Magic link tokens for client portal access (no password required)
create table portal_sessions (
  id         uuid        default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  project_id uuid        not null references projects(id) on delete cascade,
  token      uuid        not null default gen_random_uuid() unique,
  sent_at    timestamptz,
  expires_at timestamptz not null default (now() + interval '30 days')
);

-- ── Row Level Security ───────────────────────────────────────────────────────

alter table clients        enable row level security;
alter table projects       enable row level security;
alter table proposals      enable row level security;
alter table contracts      enable row level security;
alter table invoices       enable row level security;
alter table documents      enable row level security;
alter table portal_sessions enable row level security;

-- Admin (David — the only authenticated user) has full access to all tables.
-- Portal clients are unauthenticated; portal routes use the service role key
-- server-side after validating the token, so no anon RLS policies are needed.

create policy "admin_all" on clients         for all using (auth.role() = 'authenticated');
create policy "admin_all" on projects        for all using (auth.role() = 'authenticated');
create policy "admin_all" on proposals       for all using (auth.role() = 'authenticated');
create policy "admin_all" on contracts       for all using (auth.role() = 'authenticated');
create policy "admin_all" on invoices        for all using (auth.role() = 'authenticated');
create policy "admin_all" on documents       for all using (auth.role() = 'authenticated');
create policy "admin_all" on portal_sessions for all using (auth.role() = 'authenticated');

-- ── Storage bucket ───────────────────────────────────────────────────────────
-- Create a private "documents" bucket in Storage → Buckets after running this schema.
-- Files are accessed via signed URLs generated server-side.
