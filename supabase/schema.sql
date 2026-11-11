-- Run once in Supabase: SQL Editor > New query > paste > Run.

-- Who is allowed to sign in (besides the admin).
create table if not exists public.clients (
  email      text primary key,
  name       text,
  created_at timestamptz not null default now()
);

-- One positioning record per client.
create table if not exists public.positioning (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  turns       jsonb not null default '[]'::jsonb,
  profile     text not null default '',
  linkedin    text not null default '',
  status      text not null default 'draft' check (status in ('draft', 'submitted', 'approved')),
  approved_at timestamptz,
  updated_at  timestamptz not null default now()
);

-- Lock both tables. With RLS on and no policies, browsers can't read or write them;
-- the app's server code reads and writes with the service role key after checking who is signed in.
alter table public.clients enable row level security;
alter table public.positioning enable row level security;
