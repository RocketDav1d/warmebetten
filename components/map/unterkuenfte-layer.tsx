"use client";

import { useMemo } from "react";

import { MapMarker, MarkerContent, MarkerTooltip } from "@/components/ui/map";
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
  | "plaetze_frei"
  | "plaetze_frei_aktuell"
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

function getAvailabilityStyle(bettenFrei: boolean | null) {
  if (bettenFrei === true) {
    return {
      color: "#22c55e",
      glow: "0 0 0 6px rgba(34, 197, 94, 0.22), 0 0 22px rgba(34, 197, 94, 0.55)",
    };
  }
  if (bettenFrei === false) {
    return { color: "#ef4444", glow: undefined };
  }
  return { color: null as string | null, glow: undefined };
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

export function UnterkuenfteLayer({
  unterkuenfte,
  onSelect,
}: {
  unterkuenfte: UnterkunftForMap[];
  onSelect: (u: UnterkunftForMap) => void;
}) {
  const withCoords = useMemo(
    () => unterkuenfte.filter((u) => u.lat != null && u.lng != null),
    [unterkuenfte]
  );

  return (
    <>
      {withCoords.map((u) => {
        const meta = getTypeMeta(u.typ);
        const availability = getAvailabilityStyle(u.betten_frei);
        const bg = availability.color ?? meta.color;

        const free =
          typeof u.plaetze_frei === "number"
            ? u.plaetze_frei
            : typeof u.plaetze_frei_aktuell === "number"
              ? u.plaetze_frei_aktuell
              : null;

        const statusLine =
          free == null
            ? meta.label
            : free > 0
              ? `${free} frei`
              : "Keine freien Plätze";

        const updated = formatUpdatedAt(u.capacity_updated_at ?? null);

        return (
          <MapMarker
            key={u.id}
            longitude={u.lng as number}
            latitude={u.lat as number}
            onClick={() => onSelect(u)}
          >
            <MarkerContent
              className={cn(
                "rounded-full border border-white/90 shadow-lg",
                "flex items-center justify-center select-none"
              )}
            >
              <div
                className="h-9 w-9 rounded-full flex items-center justify-center"
                style={{
                  background: bg,
                  boxShadow: availability.glow,
                }}
                aria-label={meta.label}
                role="img"
              >
                <span className="text-base leading-none">{meta.emoji}</span>
              </div>
            </MarkerContent>

            <MarkerTooltip>
              <div className="min-w-[180px] space-y-0.5">
                <div className="font-semibold">{u.name}</div>
                <div className="text-[11px] opacity-90">{statusLine}</div>
                {updated && (
                  <div className="text-[11px] opacity-75">
                    Kapazität: {updated}
                  </div>
                )}
                {u.is_mobile ? (
                  <div className="text-[11px] opacity-80">Mobil</div>
                ) : u.adresse ? (
                  <div className="text-[11px] opacity-80">{u.adresse}</div>
                ) : null}
              </div>
            </MarkerTooltip>
          </MapMarker>
        );
      })}
    </>
  );
}


