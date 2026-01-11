# Supabase Schema (warmebetten.berlin)

This repo uses Supabase Auth in Next.js. The database schema for **Unterkünfte** + **Profiles** lives in:

- `supabase/migrations/20260109000001_init_warmebetten.sql`

## Apply the schema

### Option A: Supabase Dashboard (recommended for now)

1. Open Supabase Dashboard → **SQL Editor**
2. Paste the contents of the migration file above
3. Run it

### Option B: Supabase CLI (if you use local development)

This repo installs the Supabase CLI as a dev dependency. Run it via Bun so you don't need a global install:

```bash
bun run supabase -- --version
```

Typical remote workflow:

```bash
# creates supabase/config.toml (local config)
bun run supabase -- init

# authenticate (opens browser)
bun run supabase -- login

# link to your remote project
bun run supabase -- link --project-ref <YOUR_PROJECT_REF>

# apply migrations in supabase/migrations to the linked project
bun run supabase -- db push
```

If `supabase` says "command not found", **do not** run `supabase ...` directly—use the `bun run supabase -- ...` form above (it picks up `node_modules/.bin`).

## Source of truth: Supabase SQL migrations

From now on, schema changes are made **directly in Supabase via SQL**, and tracked in:

- `supabase/migrations/*`

Apply via Supabase Dashboard SQL editor or via Supabase CLI `db push`.

## Betreiber-Registrierung (Shelter Claim / Admin Approval)

This flow uses these tables (created via `supabase/migrations/*`):

- `unterkunft_email_whitelist` (maps shelter → allowed emails; stored normalized lowercase)
- `unterkunft_applications` (pending/approved/rejected)
- `unterkunft_submissions` (new shelter submissions; admin approval required)

Server-side endpoints require a Supabase service role key:

- Set `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` (server-only).

If you see `permission denied for schema public` on admin pages, you need GRANTs for the `service_role` DB role (it bypasses RLS, but still needs privileges). Run this once in Supabase SQL Editor:

```sql
grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
```

## Tables

- `public.unterkuenfte`
  - Map-visible shelter/offer entries (publicly readable)
  - Ownership: `owner_user_id` (one user can own many unterkuenfte; an unterkunft has max one owner)
  - Source of truth for current capacity is `plaetze_frei_aktuell` (free spots right now)
  - `kapazitaet_belegt` is **generated** from `kapazitaet_max_allgemein - plaetze_frei_aktuell`
  - `betten_frei` is **generated** from `plaetze_frei_aktuell > 0`
  - `bezirk` is an enum (`public.berlin_bezirk`)
- `public.profiles`
  - Linked 1:1 to `auth.users`
  - Contains `role` (used for admin authorization). Users can read/update only their own profile.


