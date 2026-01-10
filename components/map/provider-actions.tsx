import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";

/**
 * Logged-in-only actions for providers.
 * When the user is not authenticated, this renders nothing (so the left island shows only auth buttons).
 */
export async function ProviderActions() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  if (!user) return null;

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Betreiber können Kapazitäten (z.B. freie Betten) und aktuelle Angebote
        aktualisieren.
      </p>
      <Button asChild className="w-full">
        <Link href="/protected">Kapazität verwalten</Link>
      </Button>
    </div>
  );
}


