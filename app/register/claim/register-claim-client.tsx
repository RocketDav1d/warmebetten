"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

type ClaimResult =
  | { status: "claimed" }
  | { status: "pending" }
  | { status: "error"; message: string };

export function RegisterClaimClient({
  unterkunftId,
}: {
  unterkunftId: string | null;
}) {
  const [result, setResult] = useState<ClaimResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      setIsLoading(true);
      setResult(null);

      if (!unterkunftId) {
        setResult({
          status: "error",
          message: "Missing unterkunftId. Bitte starte den Registrierungsflow neu.",
        });
        setIsLoading(false);
        return;
      }

      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        setResult({
          status: "error",
          message:
            "Du bist nicht eingeloggt. Bitte bestätige zuerst die Email (oder logge dich ein).",
        });
        setIsLoading(false);
        return;
      }

      try {
        const res = await fetch("/api/register/claim", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ unterkunftId }),
        });
        const json = (await res.json()) as ClaimResult;
        if (!res.ok) {
          setResult({
            status: "error",
            message:
              (json as any)?.message ??
              `Request failed (${res.status}). Bitte später erneut versuchen.`,
          });
        } else {
          setResult(json);
        }
      } catch (e: unknown) {
        setResult({
          status: "error",
          message: e instanceof Error ? e.message : "Unbekannter Fehler",
        });
      } finally {
        setIsLoading(false);
      }
    };

    void run();
  }, [unterkunftId]);

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Verbinde…</div>;
  }

  if (!result) return null;

  if (result.status === "claimed") {
    return (
      <div className="space-y-3">
        <div className="text-sm">
          ✅ Deine Email ist whitelisted – die Unterkunft wurde direkt mit deinem
          Account verbunden.
        </div>
        <Button asChild className="w-full">
          <Link href="/protected">Kapazität verwalten</Link>
        </Button>
      </div>
    );
  }

  if (result.status === "pending") {
    return (
      <div className="space-y-3">
        <div className="text-sm">
          ⏳ Registrierung ist angelegt, aber die Unterkunft ist noch nicht
          verbunden. Ein Admin muss die Verbindung nach persönlicher
          Kontaktaufnahme freischalten.
        </div>
        <Button asChild variant="outline" className="w-full">
          <Link href="/protected">Zum Account</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="text-sm text-red-600">Fehler: {result.message}</div>
      <Button asChild variant="outline" className="w-full">
        <Link href="/register">Zurück zur Registrierung</Link>
      </Button>
    </div>
  );
}


