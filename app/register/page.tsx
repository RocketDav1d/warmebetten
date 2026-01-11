import Link from "next/link";
import { Suspense } from "react";

import { createClient } from "@/lib/supabase/server";
import { hasEnvVars } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RegisterProviderForm } from "@/components/register-provider-form";

export default function RegisterPage() {
  if (!hasEnvVars) {
    return (
      <div className="flex min-h-svh w-full items-start justify-center p-6 md:p-10">
        <div className="w-full max-w-3xl space-y-4">
          <Card>
            <CardHeader className="space-y-2">
              <CardTitle className="text-xl">Betreiber-Registrierung</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                Supabase ist noch nicht konfiguriert. Setze{" "}
                <code>NEXT_PUBLIC_SUPABASE_URL</code> und{" "}
                <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> (oder{" "}
                <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>) in{" "}
                <code>.env.local</code>.
              </div>
            </CardContent>
          </Card>
          <div className="text-xs text-muted-foreground">
            Zurück zur Karte:{" "}
            <Link className="underline underline-offset-4" href="/">
              warmebetten.berlin
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground">Laden…</div>}>
      <RegisterPageContent />
    </Suspense>
  );
}

async function RegisterPageContent() {
  const supabase = await createClient();

  const { data: shelters, error } = await supabase
    .from("unterkuenfte")
    .select("id,name,adresse,bezirk")
    .is("owner_user_id", null)
    .order("name", { ascending: true });

  return (
    <div className="flex min-h-svh w-full items-start justify-center p-6 md:p-10">
      <div className="w-full max-w-3xl space-y-4">
        <Card>
          <CardHeader className="space-y-2">
            <CardTitle className="text-xl">Betreiber-Registrierung</CardTitle>
            <p className="text-sm text-muted-foreground">
              Wenn du Betreiber bist: wähle zuerst deine Unterkunft aus und registriere dich
              anschließend. Wenn deine Email für diese Unterkunft whitelisted ist, wird die
              Verbindung direkt erstellt. Andernfalls landet deine Anfrage zur Freischaltung
              beim Admin.
            </p>
          </CardHeader>
          <CardContent>
            {error ? (
              <div className="text-sm text-red-600">
                Fehler beim Laden der Unterkünfte: {error.message}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm text-muted-foreground">
                    Oder: neue Unterkunft einreichen (Admin-Freigabe erforderlich)
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <Link href="/register/new">Neue Unterkunft hinzufügen</Link>
                  </Button>
                </div>
                <RegisterProviderForm shelters={shelters ?? []} />
              </div>
            )}
          </CardContent>
        </Card>

        <div className="text-xs text-muted-foreground">
          Zurück zur Karte:{" "}
          <Link className="underline underline-offset-4" href="/">
            warmebetten.berlin
          </Link>
        </div>
      </div>
    </div>
  );
}


