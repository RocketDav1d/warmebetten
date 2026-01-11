-- Drop duplicate generated column `plaetze_frei` (it mirrors `plaetze_frei_aktuell`)
--
-- Source of truth is `plaetze_frei_aktuell` (provider-updated).
-- `plaetze_frei` served as a generated alias but adds confusion and is not needed.

alter table public.unterkuenfte
  drop column if exists plaetze_frei;


