/**
 * One-time helper to "baseline" Drizzle migrations against an already existing database schema.
 *
 * Use case:
 * - Your Supabase DB already has tables (created via Supabase SQL / dashboard)
 * - You generated an initial Drizzle migration (e.g. drizzle/0000_*.sql)
 * - Running `db:migrate` would try to CREATE TABLE again and fail
 *
 * This script:
 * - ensures the migrations table exists (in `public.__drizzle_migrations`)
 * - inserts a baseline row with created_at equal to the latest local migration timestamp
 *   so Drizzle will treat existing migrations as already applied.
 */

import fs from "node:fs";
import path from "node:path";

import postgres from "postgres";

function mustGetEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name} env var`);
  return v;
}

function readJournalMillis() {
  const journalPath = path.join(process.cwd(), "drizzle/meta/_journal.json");
  const raw = fs.readFileSync(journalPath, "utf-8");
  const journal = JSON.parse(raw);
  const last = journal.entries?.at?.(-1);
  if (!last) throw new Error("No entries in drizzle/meta/_journal.json");
  return last.when;
}

async function main() {
  const url = mustGetEnv("DATABASE_URL");
  const baselineMillis = readJournalMillis();

  const sql = postgres(url, { ssl: "require" });

  try {
    await sql`
      create table if not exists public.__drizzle_migrations (
        id serial primary key,
        hash text not null,
        created_at bigint
      )
    `;

    const [{ count }] =
      await sql`select count(*)::text as count from public.__drizzle_migrations`;

    if (Number(count) === 0) {
      await sql`
        insert into public.__drizzle_migrations (hash, created_at)
        values ('baseline', ${baselineMillis})
      `;
      console.log(
        `Baseline inserted into public.__drizzle_migrations (created_at=${baselineMillis}).`,
      );
    } else {
      console.log(
        "public.__drizzle_migrations already has entries; skipping baseline insert.",
      );
    }
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


