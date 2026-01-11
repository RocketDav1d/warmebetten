"use client";

import { useMemo, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ResendConfirmationClient({ initialEmail }: { initialEmail?: string | null }) {
  const supabase = useMemo(() => createClient(), []);

  const [email, setEmail] = useState(initialEmail ?? "");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const resend = async () => {
    const e = email.trim();
    if (!e) {
      setError("Bitte gib deine E‑Mail-Adresse ein.");
      setSuccess(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const { error } = await supabase.auth.resend({ type: "signup", email: e });
      if (error) throw error;
      setSuccess("Bestätigungs‑E‑Mail wurde erneut gesendet. Bitte Posteingang/Spam prüfen.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mt-4 space-y-3">
      {!initialEmail ? (
        <div className="space-y-2">
          <Label htmlFor="resendEmail">E‑Mail</Label>
          <Input
            id="resendEmail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@beispiel.de"
          />
        </div>
      ) : null}

      <Button type="button" variant="outline" className="w-full" disabled={isLoading} onClick={resend}>
        {isLoading ? "Sende…" : "Bestätigungs‑E‑Mail erneut senden"}
      </Button>

      {success ? <p className="text-sm text-muted-foreground">{success}</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}


