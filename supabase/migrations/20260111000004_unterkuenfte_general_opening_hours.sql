-- Store unstructured opening-hours info from the PDF ("ganzjährig", "Okt.–April", etc.)
-- alongside structured time fields.

alter table public.unterkuenfte
  add column if not exists general_opening_hours text;


