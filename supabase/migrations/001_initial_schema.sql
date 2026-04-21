-- ============================================================
-- Orion — Initial Schema
-- Run this in the Supabase SQL editor for your project.
-- ============================================================

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ── profiles ─────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id               uuid        primary key references auth.users(id) on delete cascade,
  email            text        not null check (email like '%@virginia.edu'),
  full_name        text        not null,
  graduation_year  integer,
  program          text,
  current_role     text,
  current_company  text,
  industry         text,
  location         text,
  linkedin_url     text,
  open_to          text[]      not null default '{}',
  bio              text,
  is_verified      boolean     not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ── chat_requests ─────────────────────────────────────────────────────────────
create table if not exists public.chat_requests (
  id           uuid        primary key default gen_random_uuid(),
  from_user_id uuid        not null references public.profiles(id) on delete cascade,
  to_user_id   uuid        not null references public.profiles(id) on delete cascade,
  message      text        not null,
  status       text        not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at   timestamptz not null default now(),
  constraint no_self_request check (from_user_id <> to_user_id)
);

-- ── opportunities ─────────────────────────────────────────────────────────────
create table if not exists public.opportunities (
  id          uuid        primary key default gen_random_uuid(),
  posted_by   uuid        not null references public.profiles(id) on delete cascade,
  type        text        not null check (type in ('job', 'cofounder', 'internship', 'contract')),
  title       text        not null,
  company     text        not null,
  description text        not null,
  is_active   boolean     not null default true,
  created_at  timestamptz not null default now()
);

-- ── opportunity_applications ──────────────────────────────────────────────────
create table if not exists public.opportunity_applications (
  id             uuid        primary key default gen_random_uuid(),
  opportunity_id uuid        not null references public.opportunities(id) on delete cascade,
  applicant_id   uuid        not null references public.profiles(id) on delete cascade,
  note           text,
  created_at     timestamptz not null default now(),
  unique (opportunity_id, applicant_id)
);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.profiles                enable row level security;
alter table public.chat_requests           enable row level security;
alter table public.opportunities           enable row level security;
alter table public.opportunity_applications enable row level security;

-- ── profiles policies ────────────────────────────────────────────────────────

-- Any authenticated user can read all profiles
create policy "profiles: authenticated read"
  on public.profiles for select
  to authenticated
  using (true);

-- Users can only insert/update their own profile
create policy "profiles: owner insert"
  on public.profiles for insert
  to authenticated
  with check (id = auth.uid());

create policy "profiles: owner update"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- ── chat_requests policies ───────────────────────────────────────────────────

-- Sender or recipient can read
create policy "chat_requests: parties read"
  on public.chat_requests for select
  to authenticated
  using (from_user_id = auth.uid() or to_user_id = auth.uid());

-- Only sender can create
create policy "chat_requests: sender insert"
  on public.chat_requests for insert
  to authenticated
  with check (from_user_id = auth.uid());

-- Only recipient can update status
create policy "chat_requests: recipient update"
  on public.chat_requests for update
  to authenticated
  using (to_user_id = auth.uid());

-- ── opportunities policies ───────────────────────────────────────────────────

-- All authenticated users can read active opportunities
create policy "opportunities: authenticated read"
  on public.opportunities for select
  to authenticated
  using (is_active = true or posted_by = auth.uid());

-- Any authenticated user can post
create policy "opportunities: authenticated insert"
  on public.opportunities for insert
  to authenticated
  with check (posted_by = auth.uid());

-- Only poster can update
create policy "opportunities: poster update"
  on public.opportunities for update
  to authenticated
  using (posted_by = auth.uid());

-- ── opportunity_applications policies ────────────────────────────────────────

-- Applicant or opportunity poster can read
create policy "applications: parties read"
  on public.opportunity_applications for select
  to authenticated
  using (
    applicant_id = auth.uid() or
    opportunity_id in (select id from public.opportunities where posted_by = auth.uid())
  );

-- Any authenticated user can apply
create policy "applications: authenticated insert"
  on public.opportunity_applications for insert
  to authenticated
  with check (applicant_id = auth.uid());
