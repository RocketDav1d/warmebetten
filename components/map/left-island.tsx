import Link from "next/link";
import { Suspense } from "react";

import { AuthButton } from "@/components/auth-button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { FiltersPanel } from "@/components/map/filters-panel";
import { ProviderActions } from "@/components/map/provider-actions";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";

export function LeftIsland() {
  return (
    <Card className="pointer-events-auto w-[calc(100vw-1.5rem)] sm:w-[360px] max-h-[calc(100dvh-1.5rem)] overflow-auto bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70 shadow-lg">
      <CardHeader className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-base leading-none">🛌 warmebetten.berlin</CardTitle>
            <p className="text-sm text-muted-foreground">
              Karte für Unterkünfte & Betten in Berlin
            </p>
          </div>
          <ThemeSwitcher /> 
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <section className="space-y-3">
          <div className="text-sm font-semibold">Filter</div>
          <FiltersPanel />
        </section>

        <Separator className="mb-2" />

        <section className="space-y-3">
          <div className="rounded bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
            <span className="font-semibold">Betreiber:innen</span> von Unterkünften können sich registrieren, ihre Unterkunft beanspruchen und anschließend live Kapazitäten sowie weitere Daten verwalten.
          </div>
          <Suspense
            fallback={
              <div className="flex w-full gap-2">
                <Skeleton className="h-8 flex-1" />
                <Skeleton className="h-8 flex-1" />
              </div>
            }
          >
            <AuthButton />
          </Suspense>
          <Suspense
            fallback={
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-9 w-full" />
              </div>
            }
          >
            <ProviderActions />
          </Suspense>
        </section>
      </CardContent>

      <CardFooter className="flex-col items-stretch gap-2 text-xs text-muted-foreground">
        <Separator className="mb-2" />
        <Button
          asChild
          className="w-full"
        >
          <a
            href="https://gebewo.berlin/spenden?fb_item_id=87057#fundraisingBox"
            target="_blank"
            rel="noopener noreferrer"
          >
            Spenden
          </a>
        </Button>
      </CardFooter>
    </Card>
  );
}


