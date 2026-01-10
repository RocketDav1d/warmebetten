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

## Drizzle ORM vs Supabase migrations (source of truth)

This repo currently uses **both**:

- `supabase/migrations/*`: authoritative for the **Supabase database** (tables + RLS/policies/triggers/grants).
- `lib/db/schema.ts`: authoritative for the **app's table model + types** (Drizzle ORM).
- `drizzle/*`: generated SQL migrations from `lib/db/schema.ts` (useful for local DBs or if you decide to let Drizzle manage your Supabase DB schema).

### Recommendation (practical)

- If your production DB is Supabase: **apply `supabase/migrations/*`** (Dashboard SQL editor or `supabase db push`) and keep `lib/db/schema.ts` in sync.
- Only use **Drizzle `db:migrate` against the Supabase DB** if you intentionally want Drizzle to manage schema changes there. In that case, baseline correctly first (see below) and be aware that Supabase RLS/policies/triggers are *not* expressed in Drizzle by default.

Drizzle is configured for:

- **Schema**: `lib/db/schema.ts`
- **Config**: `drizzle.config.ts`
- **Migrations output**: `drizzle/`

You need a Postgres connection string:

- Set `DATABASE_URL` to your Supabase Postgres connection string (Dashboard → Project Settings → Database → Connection string).
  - Put it into `.env.local` so both Next.js and drizzle-kit can use it.

Scripts:

```bash
# generate migrations from lib/db/schema.ts changes
bun run db:generate

# one-time: if your database already has the tables, baseline the initial migration
# so `db:migrate` won't try to CREATE TABLE again
bun run db:baseline

# apply generated migrations to DATABASE_URL
bun run db:migrate

# optional: Drizzle Studio UI
bun run db:studio
```

Important note about Supabase RLS:
- If `DATABASE_URL` uses the `postgres` user, it can bypass RLS. Keep using `@supabase/supabase-js` for user-scoped operations that rely on RLS.

### Baselining Drizzle against an existing Supabase schema

If you created your DB via `supabase/migrations/*` and later want to use Drizzle migrations (`db:migrate`) against the same database, you must **baseline** Drizzle so it doesn't try to re-create existing tables.

This repo includes `scripts/db_baseline_drizzle.mjs`, but note it baselines to the **latest local migration** (whatever is currently in `drizzle/meta/_journal.json`). If you run it *after* generating new migrations, it can accidentally baseline past them (so they won't run).

If you see errors like `EHOSTUNREACH ... 2a05:...:5432`, that's usually IPv6 connectivity. The `db:*` scripts are configured to prefer IPv4.

## Betreiber-Registrierung (Shelter Claim / Admin Approval)

This flow uses two extra tables (defined in `lib/db/schema.ts`):

- `unterkunft_email_whitelist` (maps shelter → allowed emails; stored normalized lowercase)
- `unterkunft_applications` (pending/approved/rejected)

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
  - `plaetze_frei` is a **generated alias** for `plaetze_frei_aktuell` (convenience/back-compat)
  - `bezirk` is an enum (`public.berlin_bezirk`)
- `public.profiles`
  - Linked 1:1 to `auth.users`
  - Contains `role` (used for admin authorization). Users can read/update only their own profile.


