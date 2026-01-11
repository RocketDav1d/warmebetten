"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

type Result =
  | { status: "pending" }
  | { status: "error"; message: string };

export function RegisterNewShelterClaimClient({
  submissionId,
}: {
  submissionId: string | null;
}) {
  const [result, setResult] = useState<Result | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      setIsLoading(true);
      setResult(null);

      if (!submissionId) {
        setResult({
          status: "error",
          message:
            "submissionId fehlt. Bitte starte den Ablauf erneut (/register/new).",
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
            "Du bist nicht eingeloggt. Bitte bestätige zuerst die E‑Mail (oder logge dich ein).",
        });
        setIsLoading(false);
        return;
      }

      try {
        const res = await fetch("/api/register/submissions/claim", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ submissionId }),
        });
        const json = (await res.json()) as Result;
        if (!res.ok) {
          setResult({
            status: "error",
            message:
              (json as any)?.message ??
              `Anfrage fehlgeschlagen (${res.status}). Bitte später erneut versuchen.`,
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
  }, [submissionId]);

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Speichere…</div>;
  }

  if (!result) return null;

  if (result.status === "pending") {
    return (
      <div className="space-y-3">
        <div className="text-sm">
          ✅ Danke! Deine Unterkunft wurde eingereicht und wartet jetzt auf
          Admin-Freigabe. Du bekommst Zugriff, sobald sie bestätigt wurde.
        </div>
        <Button asChild variant="outline" className="w-full">
          <Link href="/">Zurück zur Karte</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="text-sm text-red-600">Fehler: {result.message}</div>
      <Button asChild variant="outline" className="w-full">
        <Link href="/register/new">Zurück</Link>
      </Button>
    </div>
  );
}


