-- Make unterkuenfte coordinates optional + add tables for Betreiber-Registrierung
--
-- Motivation:
-- - Some sources don't provide geocoding yet -> allow NULL lat/lng.
-- - The Betreiber-Registrierung flow depends on:
--   - public.unterkunft_email_whitelist
--   - public.unterkunft_applications (+ enum public.unterkunft_application_status)

-- Allow rows without coordinates (can be enriched later).
alter table public.unterkuenfte
  alter column lat drop not null,
  alter column lng drop not null;

-- Enum for application status (idempotent).
do $$
begin
  create type public.unterkunft_application_status as enum ('pending', 'approved', 'rejected');
exception
  when duplicate_object then null;
end $$;

-- Shelter email whitelist (idempotent).
create table if not exists public.unterkunft_email_whitelist (
  id uuid primary key default gen_random_uuid(),
  unterkunft_id uuid not null references public.unterkuenfte (id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists unterkunft_email_whitelist_unique
  on public.unterkunft_email_whitelist (unterkunft_id, email);

create index if not exists unterkunft_email_whitelist_unterkunft_idx
  on public.unterkunft_email_whitelist (unterkunft_id);

-- Applications for manual admin approval (idempotent).
create table if not exists public.unterkunft_applications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unterkunft_id uuid not null references public.unterkuenfte (id) on delete cascade,
  user_id uuid not null,
  email text not null,

  status public.unterkunft_application_status not null default 'pending',

  reviewed_by_user_id uuid null,
  admin_note text null,
  reviewed_at timestamptz null
);

create index if not exists unterkunft_applications_status_idx
  on public.unterkunft_applications (status);

create index if not exists unterkunft_applications_unterkunft_idx
  on public.unterkunft_applications (unterkunft_id);

create unique index if not exists unterkunft_applications_user_unterkunft_unique
  on public.unterkunft_applications (user_id, unterkunft_id);


