"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ShelterRow = {
  id: string;
  name: string;
  adresse: string;
  bezirk: string | null;
};

export function RegisterProviderForm({ shelters }: { shelters: ShelterRow[] }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [selectedId, setSelectedId] = useState<string | null>(
    shelters[0]?.id ?? null,
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedId) {
      setError("Bitte zuerst eine Unterkunft auswählen.");
      return;
    }
    if (password !== repeatPassword) {
      setError("Passwörter stimmen nicht überein.");
      return;
    }

    setIsLoading(true);
    try {
      const next = `/register/claim?unterkunftId=${encodeURIComponent(
        selectedId,
      )}`;
      const emailRedirectTo = `${window.location.origin}/auth/confirm?next=${encodeURIComponent(
        next,
      )}`;

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo },
      });
      if (error) throw error;

      router.push("/auth/sign-up-success");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="text-sm font-semibold">1) Unterkunft auswählen</div>
        {shelters.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            Aktuell gibt es keine Unterkünfte ohne verbundenen Betreiber.
          </div>
        ) : (
          <div className="rounded-md border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="w-10 p-2 text-left" />
                  <th className="p-2 text-left">Name</th>
                  <th className="p-2 text-left">Adresse</th>
                  <th className="p-2 text-left">Bezirk</th>
                </tr>
              </thead>
              <tbody>
                {shelters.map((s) => (
                  <tr
                    key={s.id}
                    className="border-t hover:bg-muted/30 cursor-pointer"
                    onClick={() => setSelectedId(s.id)}
                  >
                    <td className="p-2 align-top">
                      <input
                        type="radio"
                        name="shelter"
                        checked={selectedId === s.id}
                        onChange={() => setSelectedId(s.id)}
                      />
                    </td>
                    <td className="p-2 align-top font-medium">{s.name}</td>
                    <td className="p-2 align-top">{s.adresse}</td>
                    <td className="p-2 align-top">{s.bezirk ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <form onSubmit={handleSignUp} className="space-y-4">
        <div className="text-sm font-semibold">2) Registrieren</div>

        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="password">Passwort</Label>
          <Input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="repeatPassword">Passwort wiederholen</Label>
          <Input
            id="repeatPassword"
            type="password"
            required
            value={repeatPassword}
            onChange={(e) => setRepeatPassword(e.target.value)}
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button
          type="submit"
          className="w-full"
          disabled={isLoading || shelters.length === 0}
        >
          {isLoading ? "Registrieren…" : "Registrieren"}
        </Button>
      </form>
    </div>
  );
}


