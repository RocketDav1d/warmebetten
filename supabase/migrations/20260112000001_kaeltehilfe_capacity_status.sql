-- Add Kaeltehilfe categorical capacity status (traffic light) to unterkuenfte.
--
-- Kaeltehilfe provides only:
-- - none   (red)
-- - little (yellow/orange)
-- - plenty (green)
-- and optionally per gender (men/women/diverse) + an overall status.

do $$
begin
  create type public.kaeltehilfe_capacity_status as enum ('none', 'little', 'plenty');
exception
  when duplicate_object then null;
end $$;

alter table public.unterkuenfte
  add column if not exists kaeltehilfe_capacity_status public.kaeltehilfe_capacity_status null,
  add column if not exists kaeltehilfe_capacity_status_men public.kaeltehilfe_capacity_status null,
  add column if not exists kaeltehilfe_capacity_status_women public.kaeltehilfe_capacity_status null,
  add column if not exists kaeltehilfe_capacity_status_diverse public.kaeltehilfe_capacity_status null,
  add column if not exists kaeltehilfe_capacity_url text null,
  add column if not exists kaeltehilfe_capacity_checked_at timestamptz not null default now(),
  add column if not exists kaeltehilfe_capacity_updated_at timestamptz not null default now();

-- Update kaeltehilfe_capacity_updated_at only when the categorical statuses changed.
-- (Checked-at is updated by the scraper on every run.)
create or replace function public.set_kaeltehilfe_capacity_updated_at()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' then
    if (
      new.kaeltehilfe_capacity_status is distinct from old.kaeltehilfe_capacity_status
      or new.kaeltehilfe_capacity_status_men is distinct from old.kaeltehilfe_capacity_status_men
      or new.kaeltehilfe_capacity_status_women is distinct from old.kaeltehilfe_capacity_status_women
      or new.kaeltehilfe_capacity_status_diverse is distinct from old.kaeltehilfe_capacity_status_diverse
    ) then
      new.kaeltehilfe_capacity_updated_at = now();
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists unterkuenfte_set_kaeltehilfe_capacity_updated_at on public.unterkuenfte;
create trigger unterkuenfte_set_kaeltehilfe_capacity_updated_at
before update on public.unterkuenfte
for each row
execute function public.set_kaeltehilfe_capacity_updated_at();


