-- Track when capacity was last updated (separate from general updated_at).
-- This is used for UI to show freshness of "Plaetze frei".
--
-- Rules:
-- - capacity_updated_at is set to now() on INSERT (default)
-- - capacity_updated_at is updated only when plaetze_frei_aktuell changes

alter table public.unterkuenfte
  add column if not exists capacity_updated_at timestamptz not null default now();

create or replace function public.set_capacity_updated_at()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' then
    if new.plaetze_frei_aktuell is distinct from old.plaetze_frei_aktuell then
      new.capacity_updated_at = now();
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists unterkuenfte_set_capacity_updated_at on public.unterkuenfte;
create trigger unterkuenfte_set_capacity_updated_at
before update on public.unterkuenfte
for each row
execute function public.set_capacity_updated_at();


