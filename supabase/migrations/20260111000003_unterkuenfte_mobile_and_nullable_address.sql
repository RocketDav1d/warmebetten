-- Support mobile services without a fixed address.
--
-- Changes:
-- - `is_mobile`: whether this entry is mobile (no fixed location)
-- - `adresse`: make nullable (some entries have no fixed address)
--
-- Note: `bezirk` is already nullable.

alter table public.unterkuenfte
  add column if not exists is_mobile boolean not null default false;

alter table public.unterkuenfte
  alter column adresse drop not null;


