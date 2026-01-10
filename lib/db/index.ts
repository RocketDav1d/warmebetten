import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

import * as schema from "./schema";
export * from "./schema";
export * from "./types";

declare global {
  // eslint-disable-next-line no-var
  var __db_sql__: postgres.Sql | undefined;
  // eslint-disable-next-line no-var
  var __db__: ReturnType<typeof drizzle> | undefined;
}

function getDatabaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "Missing DATABASE_URL. Add it to your environment (Supabase Postgres connection string).",
    );
  }
  return url;
}

export const sql =
  globalThis.__db_sql__ ??
  postgres(getDatabaseUrl(), {
    ssl: "require",
  });

export const db = globalThis.__db__ ?? drizzle(sql, { schema });

if (process.env.NODE_ENV !== "production") {
  globalThis.__db_sql__ = sql;
  globalThis.__db__ = db;
}


