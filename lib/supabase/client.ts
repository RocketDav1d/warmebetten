import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseEnv } from "@/lib/utils";

export function createClient() {
  const { url, key } = getSupabaseEnv();
  if (!url || !key) {
    throw new Error(
      "Supabase env vars missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY / NEXT_PUBLIC_SUPABASE_ANON_KEY) in .env.local."
    );
  }

  return createBrowserClient(
    url,
    key,
  );
}
