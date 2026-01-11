import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

function decodeBase64Url(input: string) {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = base64.length % 4 === 0 ? "" : "=".repeat(4 - (base64.length % 4));
  return Buffer.from(base64 + pad, "base64").toString("utf-8");
}

function getJwtRole(key: string): string | null {
  const parts = key.split(".");
  if (parts.length < 2) return null;
  try {
    const payloadRaw = decodeBase64Url(parts[1]!);
    const payload = JSON.parse(payloadRaw) as { role?: string };
    return typeof payload.role === "string" ? payload.role : null;
  } catch {
    return null;
  }
}

export function getServiceRoleProblem(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) return "Missing NEXT_PUBLIC_SUPABASE_URL";
  if (!serviceRoleKey) return "Missing SUPABASE_SERVICE_ROLE_KEY";

  const role = getJwtRole(serviceRoleKey);
  if (role && role !== "service_role") {
    return `SUPABASE_SERVICE_ROLE_KEY looks wrong (jwt role="${role}"). Paste the *service_role* key from Supabase Dashboard → Project Settings → API.`;
  }

  return null;
}

export const hasServiceRoleKey = getServiceRoleProblem() === null;

/**
 * Server-only Supabase admin client.
 *
 * Requires:
 * - NEXT_PUBLIC_SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 *
 * IMPORTANT: Never expose the service role key to the browser.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const problem = getServiceRoleProblem();
  if (problem) throw new Error(problem);

  // At this point both vars are present (checked by getServiceRoleProblem()).
  return createClient<Database>(url!, serviceRoleKey!, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}


