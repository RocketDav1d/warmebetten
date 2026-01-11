-- Fix permissions for Betreiber-Registrierung support tables
--
-- Problem:
-- - Public /register page needs to read unterkunft_email_whitelist to show which emails are whitelisted.
-- - Server-side admin flows use service_role and must have explicit GRANTs too.

-- ---------------------------------------------------------------------------
-- unterkunft_email_whitelist
-- ---------------------------------------------------------------------------

-- RLS: explicit (and future-proof). Public read is intentional for /register UI.
alter table public.unterkunft_email_whitelist enable row level security;

drop policy if exists "unterkunft_email_whitelist_public_read" on public.unterkunft_email_whitelist;
create policy "unterkunft_email_whitelist_public_read"
on public.unterkunft_email_whitelist
for select
using (true);

-- Grants
grant select on public.unterkunft_email_whitelist to anon, authenticated;
revoke insert, update, delete on public.unterkunft_email_whitelist from anon, authenticated;
grant all on public.unterkunft_email_whitelist to service_role;

-- ---------------------------------------------------------------------------
-- unterkunft_applications
-- ---------------------------------------------------------------------------

-- Permissions: lock down for public roles; allow server-side admin via service_role.
revoke all on public.unterkunft_applications from anon, authenticated;
grant all on public.unterkunft_applications to service_role;


