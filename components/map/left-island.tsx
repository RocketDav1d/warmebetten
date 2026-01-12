import { Suspense } from "react";
import { ChevronDown } from "lucide-react";

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
    <>
      {/* Mobile: floating button + bottom sheet (keeps map visible and feels native) */}
      <div className="sm:hidden pointer-events-auto">
        <details className="group pointer-events-auto">
          {/* IMPORTANT: summary must be the first direct child of details, otherwise the browser shows the default "Details" label */}
          <Button
            asChild
            variant="outline"
            className="fixed left-3 top-3 z-30 shadow-lg bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/50"
          >
            <summary className="cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden flex items-center gap-2">
              <span>Filter &amp; Account</span>
              <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
            </summary>
          </Button>

          {/* Bottom sheet */}
          <div className="pointer-events-none fixed inset-0 z-20">
            <div className="pointer-events-auto absolute inset-x-0 bottom-0 translate-y-[calc(100%+1rem)] transition-transform duration-200 ease-out group-open:translate-y-0">
              <Card className="rounded-t-2xl border-t bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75 shadow-2xl">
                <CardHeader className="space-y-2 pb-3">
                  <div className="mx-auto h-1.5 w-10 rounded-full bg-muted" aria-hidden="true" />
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

                <div className="max-h-[75dvh] overflow-auto">
                  <CardContent className="space-y-6">
                    <section className="space-y-3">
                      <div className="text-sm font-semibold">Filter</div>
                      <FiltersPanel />
                    </section>

                    <Separator className="mb-2" />

                    <section className="space-y-3">
                      <div className="rounded bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                        <span className="font-semibold">Betreiber:innen</span> von Unterkünften
                        können sich registrieren, ihre Unterkunft beanspruchen und anschließend
                        live Kapazitäten sowie weitere Daten verwalten.
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

                  <CardFooter className="flex-col items-stretch gap-2 text-xs text-muted-foreground pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
                    <Separator className="mb-2" />
                    <Button asChild className="w-full">
                      <a
                        href="https://gebewo.berlin/spenden?fb_item_id=87057#fundraisingBox"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Spenden
                      </a>
                    </Button>
                  </CardFooter>
                </div>
              </Card>
            </div>
          </div>
        </details>
      </div>

      {/* Desktop: keep existing layout/behavior */}
      <div className="hidden sm:block">
        <Card className="pointer-events-auto w-[360px] max-h-[calc(100dvh-1.5rem)] overflow-auto bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70 shadow-lg">
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
                <span className="font-semibold">Betreiber:innen</span> von Unterkünften können sich
                registrieren, ihre Unterkunft beanspruchen und anschließend live Kapazitäten sowie
                weitere Daten verwalten.
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
            <Button asChild className="w-full">
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
      </div>
    </>
  );
}


