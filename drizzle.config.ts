import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

// drizzle-kit does not load Next.js env files automatically.
// Load `.env.local` first (typical for Next), then fall back to `.env`.
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  // Keep the migrations table in `public` to avoid requiring CREATE SCHEMA permissions.
  migrations: {
    schema: "public",
    table: "__drizzle_migrations",
  },
  strict: true,
  verbose: true,
});


