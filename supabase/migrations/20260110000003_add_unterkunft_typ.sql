-- Add `typ` to `public.unterkuenfte`
-- Values are stored as stable snake_case keys (UI can map to nicer labels).

do $$
begin
  create type public.unterkunft_typ as enum (
    'notuebernachtung',
    'nachtcafe',
    'tagesangebote',
    'essen_verpflegung',
    'medizinische_hilfen',
    'suchtangebote',
    'beratung',
    'hygiene',
    'kleiderkammer'
  );
exception
  when duplicate_object then null;
end $$;

alter table public.unterkuenfte
  add column if not exists typ public.unterkunft_typ null;


