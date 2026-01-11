import Link from "next/link";
import { Suspense } from "react";

import { createClient } from "@/lib/supabase/server";
import { hasEnvVars } from "@/lib/utils";
import type { BerlinBezirk } from "@/lib/unterkunft/meta";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
    <Suspense fallback={<RegisterPageSkeleton />}>
      <RegisterPageContent />
    </Suspense>
  );
}

function RegisterPageSkeleton() {
  return (
    <div className="flex min-h-svh w-full items-start justify-center p-6 md:p-10">
      <div className="w-full max-w-3xl space-y-4">
        <Card>
          <CardHeader className="space-y-2">
            <Skeleton className="h-6 w-64" />
            <Skeleton className="h-4 w-full max-w-xl" />
            <Skeleton className="h-4 w-full max-w-2xl" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <Skeleton className="h-4 w-72" />
              <Skeleton className="h-8 w-44" />
            </div>
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </CardContent>
        </Card>

        <div className="text-xs text-muted-foreground">
          <Skeleton className="h-3 w-40" />
        </div>
      </div>
    </div>
  );
}

async function RegisterPageContent() {
  const supabase = await createClient();

  const baseSelect = "id,name,is_mobile,adresse,bezirk";

  let whitelistWarning: string | null = null;

  type ShelterForRegister = {
    id: string;
    name: string;
    is_mobile: boolean;
    adresse: string | null;
    bezirk: BerlinBezirk | null;
    unterkunft_email_whitelist?: Array<{ email: string }>;
  };

  const { data: sheltersWithWhitelist, error: withWhitelistError } = await supabase
    .from("unterkuenfte")
    .select(`${baseSelect},unterkunft_email_whitelist(email)`)
    .is("owner_user_id", null)
    .order("name", { ascending: true });

  let shelters = sheltersWithWhitelist as ShelterForRegister[] | null;
  let error = withWhitelistError;

  // If whitelist table is not readable yet (missing GRANT/policy), still show shelters.
  if (withWhitelistError?.message?.includes("unterkunft_email_whitelist")) {
    whitelistWarning =
      "Freigeschaltete E‑Mails konnten nicht geladen werden (DB-Permissions fehlen). Bitte Migration anwenden.";
    const retry = await supabase
      .from("unterkuenfte")
      .select(baseSelect)
      .is("owner_user_id", null)
      .order("name", { ascending: true });
    shelters =
      (retry.data as Array<Omit<ShelterForRegister, "unterkunft_email_whitelist">> | null)?.map(
        (s) => ({ ...s, unterkunft_email_whitelist: [] }),
      ) ?? null;
    error = retry.error;
  }

  return (
    <div className="flex min-h-svh w-full items-start justify-center p-6 md:p-10">
      <div className="w-full max-w-3xl space-y-4">
        <Card>
          <CardHeader className="space-y-2">
            <CardTitle className="text-xl">Betreiber-Registrierung</CardTitle>
            <p className="text-sm text-muted-foreground">
              Wenn du Betreiber bist: wähle zuerst deine Unterkunft aus und registriere dich anschließend.
            </p>
            <p className="text-sm text-muted-foreground">
              Wenn deine E‑Mail-Adresse für diese Unterkunft freigeschaltet ist,
              wird die Verbindung direkt erstellt. Andernfalls landet deine Anfrage
              zur Freischaltung beim Admin.
            </p>
          </CardHeader>
          <CardContent>
            {error ? (
              <div className="text-sm text-red-600">
                Fehler beim Laden der Unterkünfte: {error.message}
              </div>
            ) : (
              <div className="space-y-4">
                {whitelistWarning && (
                  <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                    {whitelistWarning}
                  </div>
                )}
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


