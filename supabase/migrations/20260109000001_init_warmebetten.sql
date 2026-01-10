-- warmebetten.berlin - clean initial schema (single migration)
--
-- Core ideas:
-- - `public.unterkuenfte` holds all map-visible shelter/offer entries (publicly readable)
-- - Current free capacity is tracked as `plaetze_frei_aktuell` (source of truth)
-- - `owner_user_id`: one user can own many unterkuenfte; an unterkunft has max one owner
-- - `public.profiles` extends `auth.users` (role + display name)
-- - RLS: public read for map; owners/admin can write

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

do $$
begin
  create type public.user_role as enum ('public', 'provider', 'admin');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.berlin_bezirk as enum (
    'mitte',
    'friedrichshain_kreuzberg',
    'pankow',
    'charlottenburg_wilmersdorf',
    'spandau',
    'steglitz_zehlendorf',
    'tempelhof_schoeneberg',
    'neukoelln',
    'treptow_koepenick',
    'marzahn_hellersdorf',
    'lichtenberg',
    'reinickendorf'
  );
exception
  when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.unterkuenfte (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- audit
  created_by uuid null references auth.users (id) on delete set null,
  -- ownership / authorization
  owner_user_id uuid null references auth.users (id) on delete set null,

  -- location / display
  bezirk public.berlin_bezirk null,
  name text not null,
  adresse text not null,
  strasse text null,

  lat double precision not null,
  lng double precision not null,

  u_bahn_station text null,
  s_bahn_station text null,
  bus text null,

  -- contact / public info
  telefon text null,
  email text null,
  website text null,
  verantwortliche_personen text[] not null default '{}'::text[],
  metadata text null,

  -- opening times (daily)
  oeffnung_von time null,
  oeffnung_bis time null,
  letzter_einlass time null,

  -- kälte-/wärmebus can come between...
  kaelte_waerme_bus_kann_kommen_von time null,
  kaelte_waerme_bus_kann_kommen_bis time null,

  -- rules
  keine_drogen boolean not null default false,
  keine_tiere boolean not null default false,
  keine_gewalt boolean not null default false,

  -- offers/services
  bietet_dusche boolean not null default false,
  bietet_essen boolean not null default false,
  bietet_betreuung boolean not null default false,
  bietet_kleidung boolean not null default false,
  bietet_medizin boolean not null default false,
  behindertengerecht boolean not null default false,

  -- capacities (max)
  kapazitaet_max_allgemein integer not null default 0,
  kapazitaet_max_frauen integer not null default 0,
  kapazitaet_max_maenner integer not null default 0,

  -- SOURCE OF TRUTH: free spots right now
  plaetze_frei_aktuell integer not null default 0,

  -- derived convenience columns
  kapazitaet_belegt integer generated always as (greatest(kapazitaet_max_allgemein - plaetze_frei_aktuell, 0)) stored,
  plaetze_frei integer generated always as (plaetze_frei_aktuell) stored,
  betten_frei boolean generated always as (plaetze_frei_aktuell > 0) stored,

  -- constraints
  constraint unterkuenfte_lat_range check (lat between -90 and 90),
  constraint unterkuenfte_lng_range check (lng between -180 and 180),
  constraint unterkuenfte_kapazitaet_max_allgemein_nonneg check (kapazitaet_max_allgemein >= 0),
  constraint unterkuenfte_kapazitaet_max_frauen_nonneg check (kapazitaet_max_frauen >= 0),
  constraint unterkuenfte_kapazitaet_max_maenner_nonneg check (kapazitaet_max_maenner >= 0),
  constraint unterkuenfte_plaetze_frei_aktuell_nonneg check (plaetze_frei_aktuell >= 0),
  constraint unterkuenfte_plaetze_frei_aktuell_leq_max check (plaetze_frei_aktuell <= kapazitaet_max_allgemein)
);

create index if not exists unterkuenfte_lat_lng_idx on public.unterkuenfte (lat, lng);
create index if not exists unterkuenfte_owner_user_id_idx on public.unterkuenfte (owner_user_id);

drop trigger if exists unterkuenfte_set_updated_at on public.unterkuenfte;
create trigger unterkuenfte_set_updated_at
before update on public.unterkuenfte
for each row
execute function public.set_updated_at();

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  full_name text null,
  role public.user_role not null default 'public'
);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

-- Create profile row on signup.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email)
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security (RLS)
-- ---------------------------------------------------------------------------

alter table public.unterkuenfte enable row level security;
alter table public.profiles enable row level security;

-- Public read for the map (anon + authenticated)
drop policy if exists "unterkuenfte_public_read" on public.unterkuenfte;
create policy "unterkuenfte_public_read"
on public.unterkuenfte
for select
using (true);

-- Insert: authenticated; must set created_by=auth.uid() and owner_user_id=auth.uid() (admins can set owner_user_id differently)
drop policy if exists "unterkuenfte_insert_authenticated" on public.unterkuenfte;
create policy "unterkuenfte_insert_authenticated"
on public.unterkuenfte
for insert
to authenticated
with check (
  auth.uid() = created_by
  and (
    owner_user_id = auth.uid()
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  )
);

-- Update: owner or admin
drop policy if exists "unterkuenfte_update_owner_or_admin" on public.unterkuenfte;
create policy "unterkuenfte_update_owner_or_admin"
on public.unterkuenfte
for update
to authenticated
using (
  owner_user_id = auth.uid()
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
)
with check (
  owner_user_id = auth.uid()
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);

-- Delete: admin only
drop policy if exists "unterkuenfte_delete_admin_only" on public.unterkuenfte;
create policy "unterkuenfte_delete_admin_only"
on public.unterkuenfte
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);

-- Profiles: users can read & update only their own profile.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

-- Grants
grant usage on schema public to anon, authenticated, service_role;
grant select on public.unterkuenfte to anon, authenticated;
grant insert, update, delete on public.unterkuenfte to authenticated;
grant select, update on public.profiles to authenticated;

-- service_role (server-only) needs direct privileges too (it bypasses RLS, but still needs GRANTs).
grant all on public.unterkuenfte to service_role;
grant all on public.profiles to service_role;


