import Link from "next/link";
import { Suspense } from "react";

import { AuthButton } from "@/components/auth-button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { FiltersPanel } from "@/components/map/filters-panel";

export function LeftIsland() {
  return (
    <Card className="pointer-events-auto w-[calc(100vw-1.5rem)] sm:w-[360px] max-h-[calc(100dvh-1.5rem)] overflow-auto bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70 shadow-lg">
      <CardHeader className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-base leading-none">warmebetten.berlin</CardTitle>
            <p className="text-sm text-muted-foreground">
              Karte für Unterkünfte & Angebote in Berlin
            </p>
          </div>
          <ThemeSwitcher />
        </div>
        <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          Hinweis: Filter sind UI-first umgesetzt; Anbindung an echte Daten/Marker kommt als
          nächster Schritt.
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <section className="space-y-3">
          <div className="text-sm font-semibold">Filter</div>
          <FiltersPanel />
        </section>

        <section className="space-y-3">
          <div className="text-sm font-semibold">Login</div>
          <Suspense fallback={<div className="text-sm text-muted-foreground">Lade…</div>}>
            <AuthButton />
          </Suspense>
          <p className="text-xs text-muted-foreground">
            Betreiber können Kapazitäten (z.B. freie Betten) und aktuelle Angebote aktualisieren.
          </p>
          <Button asChild variant="outline" size="sm" className="w-full">
            <Link href="/register">Registrieren (Betreiber)</Link>
          </Button>
          <Button asChild className="w-full">
            <Link href="/protected">Kapazität verwalten</Link>
          </Button>
        </section>
      </CardContent>

      <CardFooter className="justify-between gap-2 text-xs text-muted-foreground">
        <span>Beta</span>
        <span className="tabular-nums">Berlin</span>
      </CardFooter>
    </Card>
  );
}


