-- Add submissions table for "Neue Unterkunft hinzufügen" (admin approval required)
--
-- Creates:
-- - public.unterkunft_submission_status enum
-- - public.unterkunft_submissions table (draft -> pending -> approved/rejected)
--
-- Notes:
-- - We intentionally do NOT grant access to anon/authenticated.
-- - Server-side code uses service_role (bypasses RLS, but still needs GRANTs).

-- Enum (idempotent)
do $$
begin
  create type public.unterkunft_submission_status as enum ('draft', 'pending', 'approved', 'rejected');
exception
  when duplicate_object then null;
end $$;

-- Table (idempotent)
create table if not exists public.unterkunft_submissions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- attached after email-confirm "claim" step
  user_id uuid null,
  email text not null,

  status public.unterkunft_submission_status not null default 'draft',
  payload jsonb not null,

  reviewed_by_user_id uuid null,
  admin_note text null,
  reviewed_at timestamptz null
);

-- updated_at trigger (safe if function exists from init migration)
drop trigger if exists unterkunft_submissions_set_updated_at on public.unterkunft_submissions;
create trigger unterkunft_submissions_set_updated_at
before update on public.unterkunft_submissions
for each row
execute function public.set_updated_at();

create index if not exists unterkunft_submissions_status_idx
  on public.unterkunft_submissions (status);
create index if not exists unterkunft_submissions_user_idx
  on public.unterkunft_submissions (user_id);
create index if not exists unterkunft_submissions_email_idx
  on public.unterkunft_submissions (email);

-- Permissions: lock down for public roles; allow service_role
revoke all on public.unterkunft_submissions from anon, authenticated;
grant usage on schema public to service_role;
grant all on public.unterkunft_submissions to service_role;


