"use client";

import { X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { UnterkunftForMap } from "@/components/map/unterkuenfte-layer";

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

export function UnterkunftDetailsIsland({
  unterkunft,
  onClose,
}: {
  unterkunft: UnterkunftForMap;
  onClose: () => void;
}) {
  const kapMax = (unterkunft as any).kapazitaet_max_allgemein as number | null | undefined;
  const canHaveCapacity = typeof kapMax === "number" ? kapMax > 0 : false;
  const hasCapacityData = canHaveCapacity && unterkunft.betten_frei != null;

  const free = hasCapacityData
    ? typeof unterkunft.plaetze_frei_aktuell === "number"
      ? unterkunft.plaetze_frei_aktuell
      : null
    : null;

  const timeRange = formatTimeRange(
    unterkunft.oeffnung_von,
    unterkunft.oeffnung_bis
  );

  const capacityUpdated = (() => {
    try {
      return new Date(unterkunft.capacity_updated_at).toLocaleString("de-DE", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return unterkunft.capacity_updated_at;
    }
  })();

  const offers: { key: string; label: string }[] = [
    unterkunft.bietet_essen ? { key: "essen", label: "Essen" } : null,
    unterkunft.bietet_dusche ? { key: "dusche", label: "Dusche" } : null,
    unterkunft.bietet_medizin ? { key: "medizin", label: "Medizin" } : null,
    unterkunft.bietet_kleidung ? { key: "kleidung", label: "Kleidung" } : null,
    unterkunft.bietet_betreuung ? { key: "betreuung", label: "Betreuung" } : null,
    unterkunft.behindertengerecht ? { key: "barrierefrei", label: "Barrierefrei" } : null,
  ].filter(Boolean) as { key: string; label: string }[];

  return (
    <Card className="pointer-events-auto w-[calc(100vw-1.5rem)] sm:w-[360px] max-h-[calc(100dvh-1.5rem)] overflow-auto bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75 shadow-lg">
      <CardHeader className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-base leading-none">
              {unterkunft.name}
            </CardTitle>
            <div className="text-xs text-muted-foreground">
              {typeLabel(unterkunft.typ)}
              {unterkunft.bezirk ? ` · ${unterkunft.bezirk}` : ""}
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
          {hasCapacityData && free != null && (
            <Badge variant={free > 0 ? "default" : "secondary"}>
              {free > 0 ? `${free} Plätze frei` : "Keine Plätze frei"}
            </Badge>
          )}
          {canHaveCapacity && !hasCapacityData && (
            <Badge variant="outline">Kapazität unbekannt</Badge>
          )}
          {unterkunft.is_mobile ? (
            <Badge variant="outline">Mobil</Badge>
          ) : unterkunft.adresse ? (
            <Badge variant="outline">{unterkunft.adresse}</Badge>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {canHaveCapacity && (
          <div className="space-y-1">
            <div className="text-sm font-semibold">Kapazität</div>
            <div className="text-sm text-muted-foreground">
              Aktualisiert: {hasCapacityData ? capacityUpdated : "—"}
            </div>
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

        {(unterkunft.telefon?.length || unterkunft.email?.length || unterkunft.website) && (
          <div className="space-y-2">
            <div className="text-sm font-semibold">Kontakt</div>
            <div className="space-y-1 text-sm text-muted-foreground">
              {unterkunft.telefon?.length ? (
                <div>Tel: {unterkunft.telefon.join(", ")}</div>
              ) : null}
              {unterkunft.email?.length ? (
                <div>E‑Mail: {unterkunft.email.join(", ")}</div>
              ) : null}
              {unterkunft.website && (
                <div className="truncate">
                  Website:{" "}
                  <a
                    className="underline underline-offset-4"
                    href={unterkunft.website}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {unterkunft.website}
                  </a>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}


