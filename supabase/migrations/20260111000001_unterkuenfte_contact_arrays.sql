-- Change unterkuenfte contact fields to arrays
-- - telefon: text -> text[]
-- - email:   text -> text[]
--
-- Reason: allow multiple phone numbers / emails per shelter.

alter table public.unterkuenfte
  alter column telefon type text[]
    using case
      when telefon is null then '{}'::text[]
      else array[telefon]
    end,
  alter column email type text[]
    using case
      when email is null then '{}'::text[]
      else array[email]
    end;

alter table public.unterkuenfte
  alter column telefon set default '{}'::text[],
  alter column email set default '{}'::text[];


