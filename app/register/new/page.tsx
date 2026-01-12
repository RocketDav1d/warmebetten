import Link from "next/link";

import { hasEnvVars } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RegisterNewShelterForm } from "@/components/register-new-shelter-form";

export default function RegisterNewShelterPage() {
  if (!hasEnvVars) {
    return (
      <div className="flex min-h-svh w-full items-start justify-center px-4 py-6 sm:px-6 sm:py-10">
        <div className="w-full max-w-3xl space-y-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Neue Unterkunft hinzufügen</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm leading-relaxed text-muted-foreground">
                Supabase ist noch nicht konfiguriert. Setze{" "}
                <code>NEXT_PUBLIC_SUPABASE_URL</code> und{" "}
                <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> (oder{" "}
                <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY</code> /{" "}
                <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>) in{" "}
                <code>.env.local</code>.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-svh w-full items-start justify-center px-4 py-6 sm:px-6 sm:py-10">
      <div className="w-full max-w-3xl space-y-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
        <Card>
          <CardHeader className="space-y-2">
            <CardTitle className="text-xl">Neue Unterkunft hinzufügen</CardTitle>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Du reichst eine neue Unterkunft ein. Sie wird erst nach Admin-Freigabe
              auf der Karte sichtbar. Dein Account wird dabei ebenfalls als Betreiber
              freigeschaltet.
            </p>
          </CardHeader>
          <CardContent>
            <RegisterNewShelterForm />
          </CardContent>
        </Card>

        <div className="text-sm text-muted-foreground sm:text-xs">
          Zurück zur Betreiber-Registrierung:{" "}
          <Link className="underline underline-offset-4" href="/register">
            /register
          </Link>
        </div>
      </div>
    </div>
  );
}


