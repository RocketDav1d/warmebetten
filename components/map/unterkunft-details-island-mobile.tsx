"use client";

import { ExternalLink, Navigation, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { UnterkunftForMap } from "@/components/map/unterkuenfte-layer";
import { deriveKaeltehilfeStatus, kaeltehilfeStatusLabel } from "@/lib/unterkunft/kaeltehilfe";
import { formatBezirk } from "@/lib/unterkunft/meta";
import { googleMapsDirectionsHref, normalizeWebsiteUrl } from "@/lib/unterkunft/links";

function formatTimeRange(from: string | null, to: string | null) {
  if (!from && !to) return null;
  if (from && to) return `${from}–${to}`;
  if (from) return `ab ${from}`;
  return `bis ${to}`;
}

function typeLabel(typ: UnterkunftForMap["typ"]) {
  switch (typ) {
    case "notuebernachtung":
      return "Notübernachtung";
    case "nachtcafe":
      return "Nachtcafé";
    case "tagesangebote":
      return "Tagesangebote";
    case "essen_verpflegung":
      return "Essen & Verpflegung";
    case "medizinische_hilfen":
      return "Medizinische Hilfen";
    case "suchtangebote":
      return "Suchtangebote";
    case "beratung":
      return "Beratung";
    case "hygiene":
      return "Hygiene";
    case "kleiderkammer":
      return "Kleiderkammer";
    default:
      return "Unterkunft";
  }
}

export function UnterkunftDetailsIslandMobile({
  unterkunft,
  onClose,
}: {
  unterkunft: UnterkunftForMap;
  onClose: () => void;
}) {
  const isNotuebernachtung = unterkunft.typ === "notuebernachtung";
  const kaeltehilfeStatus = isNotuebernachtung ? deriveKaeltehilfeStatus(unterkunft) : null;

  const timeRange = formatTimeRange(unterkunft.oeffnung_von, unterkunft.oeffnung_bis);

  const capacityUpdated = isNotuebernachtung
    ? (() => {
        try {
          return new Date(unterkunft.kaeltehilfe_capacity_updated_at).toLocaleString("de-DE", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          });
        } catch {
          return unterkunft.kaeltehilfe_capacity_updated_at;
        }
      })()
    : null;

  const offers: { key: string; label: string }[] = [
    unterkunft.bietet_essen ? { key: "essen", label: "Essen" } : null,
    unterkunft.bietet_dusche ? { key: "dusche", label: "Dusche" } : null,
    unterkunft.bietet_medizin ? { key: "medizin", label: "Medizin" } : null,
    unterkunft.bietet_kleidung ? { key: "kleidung", label: "Kleidung" } : null,
    unterkunft.bietet_betreuung ? { key: "betreuung", label: "Betreuung" } : null,
    unterkunft.behindertengerecht ? { key: "barrierefrei", label: "Barrierefrei" } : null,
  ].filter(Boolean) as { key: string; label: string }[];

  const hasCoords = unterkunft.lat != null && unterkunft.lng != null;
  const directionsHref = hasCoords
    ? googleMapsDirectionsHref({ lat: unterkunft.lat as number, lng: unterkunft.lng as number })
    : "";
  const websiteHref = unterkunft.website ? normalizeWebsiteUrl(unterkunft.website) : "";

  return (
    <Card className="pointer-events-auto w-full max-h-[50dvh] overflow-auto bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 shadow-lg rounded-2xl">
      <CardHeader className="space-y-2 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-base leading-none">{unterkunft.name}</CardTitle>
            <div className="text-xs text-muted-foreground">
              {typeLabel(unterkunft.typ)}
              {unterkunft.bezirk ? ` · ${formatBezirk(unterkunft.bezirk)}` : ""}
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Details schließen"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isNotuebernachtung && (
            <Badge
              variant={kaeltehilfeStatus == null ? "outline" : "secondary"}
              className={
                kaeltehilfeStatus === "plenty"
                  ? "bg-green-500/15 text-green-700 dark:text-green-300 border-green-500/30"
                  : kaeltehilfeStatus === "little"
                    ? "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30"
                    : kaeltehilfeStatus === "none"
                      ? "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30"
                      : undefined
              }
            >
              {kaeltehilfeStatusLabel(kaeltehilfeStatus)}
            </Badge>
          )}
          {unterkunft.is_mobile ? (
            <Badge variant="outline">Mobil</Badge>
          ) : unterkunft.adresse ? (
            <Badge variant="outline">{unterkunft.adresse}</Badge>
          ) : null}
        </div>

        {/* Mobile replacement for hover popup actions */}
        <div className="flex gap-2 pt-1">
          <Button asChild size="sm" className="h-9 flex-1" disabled={!directionsHref}>
            <a href={directionsHref || "#"} target="_blank" rel="noreferrer">
              <Navigation className="mr-2 size-4" />
              Route
            </a>
          </Button>
          {websiteHref ? (
            <Button asChild size="sm" variant="outline" className="h-9">
              <a href={websiteHref} target="_blank" rel="noreferrer" aria-label="Website öffnen">
                <ExternalLink className="size-4" />
              </a>
            </Button>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
        {isNotuebernachtung && (
          <div className="space-y-1">
            <div className="text-sm font-semibold">Kapazität (live)</div>
            <div className="text-sm text-muted-foreground">Aktualisiert: {capacityUpdated ?? "—"}</div>
            {unterkunft.kaeltehilfe_capacity_url && (
              <div className="text-xs text-muted-foreground">
                Quelle:{" "}
                <a
                  className="underline underline-offset-4"
                  href={unterkunft.kaeltehilfe_capacity_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  kaeltehilfe-berlin.de
                </a>
              </div>
            )}
          </div>
        )}

        {timeRange && (
          <div className="space-y-1">
            <div className="text-sm font-semibold">Öffnungszeiten</div>
            <div className="text-sm text-muted-foreground">{timeRange}</div>
            {unterkunft.letzter_einlass && (
              <div className="text-xs text-muted-foreground">
                Letzter Einlass: {unterkunft.letzter_einlass}
              </div>
            )}
          </div>
        )}

        {offers.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-semibold">Angebote</div>
            <div className="flex flex-wrap gap-2">
              {offers.map((o) => (
                <Badge key={o.key} variant="secondary">
                  {o.label}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {(unterkunft.telefon?.length || unterkunft.email?.length || websiteHref) && (
          <div className="space-y-2">
            <div className="text-sm font-semibold">Kontakt</div>
            <div className="space-y-1 text-sm text-muted-foreground">
              {unterkunft.telefon?.length ? <div>Tel: {unterkunft.telefon.join(", ")}</div> : null}
              {unterkunft.email?.length ? <div>E‑Mail: {unterkunft.email.join(", ")}</div> : null}
              {websiteHref ? (
                <div className="truncate">
                  Website:{" "}
                  <a
                    className="underline underline-offset-4"
                    href={websiteHref}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {unterkunft.website}
                  </a>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}


