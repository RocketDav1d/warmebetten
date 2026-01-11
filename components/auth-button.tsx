import Link from "next/link";
import { Button } from "./ui/button";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "./logout-button";
import { hasEnvVars } from "@/lib/utils";

export async function AuthButton() {
  if (!hasEnvVars) {
    return (
      <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        Supabase ist noch nicht konfiguriert. Setze <code>NEXT_PUBLIC_SUPABASE_URL</code>{" "}
        und <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> (oder{" "}
        <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY</code> /{" "}
        <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>) in <code>.env.local</code>.
      </div>
    );
  }

  const supabase = await createClient();

  // You can also use getUser() which will be slower.
  const { data } = await supabase.auth.getClaims();

  const user = data?.claims;

  return user ? (
    <div className="flex items-center gap-4">
      Hallo, {user.email}!
      <LogoutButton />
    </div>
  ) : (
    <div className="flex w-full gap-2">
      <Button asChild size="sm" variant={"outline"} className="flex-1">
        <Link href="/auth/login">Anmelden</Link>
      </Button>
      <Button asChild size="sm" variant={"default"} className="flex-1">
        <Link href="/register">Registrieren</Link>
      </Button>
    </div>
  );
}
