"use client";

import { useMemo } from "react";
import { useTheme } from "next-themes";

import { MapMarker, MarkerContent, MarkerTooltip } from "@/components/ui/map";
import { Button } from "@/components/ui/button";
import { ExternalLink, Navigation } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Database } from "@/lib/supabase/database.types";

type UnterkunftRow = Database["public"]["Tables"]["unterkuenfte"]["Row"];

export type UnterkunftForMap = Pick<
  UnterkunftRow,
  | "id"
  | "name"
  | "is_mobile"
  | "adresse"
  | "bezirk"
  | "typ"
  | "lat"
  | "lng"
  | "betten_frei"
  | "plaetze_frei_aktuell"
  | "kapazitaet_max_allgemein"
  | "capacity_updated_at"
  | "telefon"
  | "email"
  | "website"
  | "oeffnung_von"
  | "oeffnung_bis"
  | "letzter_einlass"
  | "bietet_dusche"
  | "bietet_essen"
  | "bietet_betreuung"
  | "bietet_kleidung"
  | "bietet_medizin"
  | "behindertengerecht"
>;

type UnterkunftTyp = UnterkunftRow["typ"];
type UnterkunftTypKey = Database["public"]["Enums"]["unterkunft_typ"];

const TYPE_META: Record<UnterkunftTypKey, { label: string; emoji: string; color: string }> =
  {
  notuebernachtung: { label: "Notübernachtung", emoji: "🛏️", color: "#6366f1" }, // indigo
  nachtcafe: { label: "Nachtcafé", emoji: "☕️", color: "#f59e0b" }, // amber
  tagesangebote: { label: "Tagesangebote", emoji: "☀️", color: "#eab308" }, // yellow
  essen_verpflegung: { label: "Essen & Verpflegung", emoji: "🍲", color: "#f97316" }, // orange
  medizinische_hilfen: { label: "Medizinische Hilfen", emoji: "🩺", color: "#ef4444" }, // red-ish
  suchtangebote: { label: "Suchtangebote", emoji: "💊", color: "#a855f7" }, // purple
  beratung: { label: "Beratung", emoji: "💬", color: "#3b82f6" }, // blue
  hygiene: { label: "Hygiene", emoji: "🚿", color: "#06b6d4" }, // cyan
  kleiderkammer: { label: "Kleiderkammer", emoji: "👕", color: "#22c55e" }, // green
};

function getTypeMeta(typ: UnterkunftTyp) {
  if (typ) return TYPE_META[typ];
  return { label: "Unterkunft", emoji: "📍", color: "#64748b" }; // slate
}

function getAvailabilityStyle(bettenFrei: boolean | null, shouldColor: boolean) {
  if (!shouldColor || bettenFrei == null) {
    return { glow: undefined as string | undefined };
  }
  if (bettenFrei === true) {
    return {
      glow: "0 0 0 6px rgba(34, 197, 94, 0.22), 0 0 22px rgba(34, 197, 94, 0.55)",
    };
  }
  return {
    // "No free places" should not be alarming-red; render as warm orange.
    glow: "0 0 0 6px rgba(249, 115, 22, 0.22), 0 0 22px rgba(249, 115, 22, 0.55)",
  };
}

function formatUpdatedAt(value: string | null) {
  if (!value) return null;
  try {
    return new Date(value).toLocaleString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

function normalizeWebsiteUrl(url: string) {
  const s = url.trim();
  if (!s) return "";
  if (/^https?:\/\//i.test(s)) return s;
  return `https://${s}`;
}

function MarkerPopupCard({
  name,
  statusLine,
  updated,
  adresse,
  isMobile,
  directionsHref,
  websiteHref,
}: {
  name: string;
  statusLine: string;
  updated: string | null;
  adresse: string | null;
  isMobile: boolean;
  directionsHref: string;
  websiteHref: string;
}) {
  return (
    <div className="w-[320px] overflow-hidden rounded-2xl bg-background shadow-2xl">
      <div className="space-y-2 p-4">
        <div className="text-base font-semibold leading-tight text-foreground">{name}</div>
        <div className="text-sm text-muted-foreground">{statusLine}</div>
        {updated && <div className="text-xs text-muted-foreground">Aktualisiert: {updated}</div>}
        {isMobile ? (
          <div className="text-xs text-muted-foreground">Mobil</div>
        ) : adresse ? (
          <div className="text-xs text-muted-foreground">{adresse}</div>
        ) : null}

        <div className="flex gap-2 pt-2">
          <Button asChild size="sm" className="h-8 flex-1">
            <a href={directionsHref} target="_blank" rel="noreferrer">
              <Navigation className="mr-1.5 size-3.5" />
              Route
            </a>
          </Button>
          {websiteHref && (
            <Button asChild size="sm" variant="outline" className="h-8">
              <a href={websiteHref} target="_blank" rel="noreferrer">
                <ExternalLink className="size-3.5" />
              </a>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function UnterkuenfteLayer({
  unterkuenfte,
  onSelect,
}: {
  unterkuenfte: UnterkunftForMap[];
  onSelect: (u: UnterkunftForMap) => void;
}) {
  const { resolvedTheme } = useTheme();
  const neutralBg = resolvedTheme === "dark" ? "#ffffff" : "#000000";
  const fullBg = "#f97316"; // orange-500

  const withCoords = useMemo(
    () => unterkuenfte.filter((u) => u.lat != null && u.lng != null),
    [unterkuenfte]
  );

  return (
    <>
      {withCoords.map((u) => {
        const meta = getTypeMeta(u.typ);
        const kapMax = (u as any).kapazitaet_max_allgemein as number | null | undefined;
        // In the current schema this field is NOT NULL (default 0),
        // so we treat "> 0" as "capacity is relevant for this entry".
        const canHaveCapacity = typeof kapMax === "number" ? kapMax > 0 : false;

        // If betten_frei is NULL, we treat it as "no current capacity data".
        const hasCapacityData = canHaveCapacity && u.betten_frei != null;

        const availability = getAvailabilityStyle(u.betten_frei, hasCapacityData);
        const markerBg =
          hasCapacityData && u.betten_frei === false ? fullBg : neutralBg;

        const free = hasCapacityData
          ? typeof u.plaetze_frei_aktuell === "number"
            ? u.plaetze_frei_aktuell
            : null
          : null;

        const statusLine = !canHaveCapacity
          ? meta.label
          : !hasCapacityData
            ? "Kapazität unbekannt"
            : free != null && free > 0
              ? `${free} frei`
              : "Keine freien Plätze";

        const updated = hasCapacityData ? formatUpdatedAt(u.capacity_updated_at ?? null) : null;

        const directionsHref = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
          `${u.lat},${u.lng}`,
        )}`;
        const websiteHref = u.website ? normalizeWebsiteUrl(u.website) : "";

        return (
          <MapMarker
            key={u.id}
            longitude={u.lng as number}
            latitude={u.lat as number}
            onClick={() => onSelect(u)}
          >
            <MarkerContent
              className={cn(
                "rounded-full shadow-md",
                "flex items-center justify-center select-none"
              )}
            >
              <div
                className="h-8 w-8 rounded-full flex items-center justify-center"
                style={{
                  background: markerBg,
                  boxShadow: availability.glow,
                }}
                aria-label={meta.label}
                role="img"
              >
                <span className="text-[15px] leading-none">{meta.emoji}</span>
              </div>
            </MarkerContent>

            {/* Hover popup (interactive actions) */}
            <MarkerTooltip offset={18} interactive>
              <MarkerPopupCard
                name={u.name}
                statusLine={statusLine}
                updated={updated}
                adresse={u.adresse}
                isMobile={Boolean(u.is_mobile)}
                directionsHref={directionsHref}
                websiteHref={websiteHref}
              />
            </MarkerTooltip>
          </MapMarker>
        );
      })}
    </>
  );
}


