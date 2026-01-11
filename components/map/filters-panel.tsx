"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { Database } from "@/lib/supabase/database.types";
import {
  BEZIRK_LABELS,
  DEFAULT_FILTERS,
  bezirkFromGeoJsonName,
  filtersFromSearchParams,
  searchParamsFromFilters,
  type MapFilters,
} from "@/components/map/filters";

type UnterkunftTyp = Database["public"]["Enums"]["unterkunft_typ"];
type BerlinBezirk = Database["public"]["Enums"]["berlin_bezirk"];

const TYPE_OPTIONS: Array<{ value: UnterkunftTyp; label: string; emoji: string }> = [
  { value: "notuebernachtung", label: "Notübernachtung", emoji: "🛏️" },
  { value: "nachtcafe", label: "Nachtcafé", emoji: "☕️" },
  { value: "tagesangebote", label: "Tagesangebote", emoji: "☀️" },
  { value: "essen_verpflegung", label: "Essen & Verpflegung", emoji: "🍲" },
  { value: "medizinische_hilfen", label: "Medizinische Hilfen", emoji: "🩺" },
  { value: "suchtangebote", label: "Suchtangebote", emoji: "💊" },
  { value: "beratung", label: "Beratung", emoji: "💬" },
  { value: "hygiene", label: "Hygiene", emoji: "🚿" },
  { value: "kleiderkammer", label: "Kleiderkammer", emoji: "👕" },
];

const BEZIRK_OPTIONS = Object.entries(BEZIRK_LABELS).map(([value, label]) => ({
  value: value as BerlinBezirk,
  label,
}));

const OFFER_META: Array<{
  key: keyof MapFilters["offers"];
  label: string;
  emoji: string;
}> = [
  { key: "bietet_essen", label: "Essen", emoji: "🍲" },
  { key: "bietet_dusche", label: "Dusche", emoji: "🚿" },
  { key: "bietet_betreuung", label: "Betreuung", emoji: "🧑‍🤝‍🧑" },
  { key: "bietet_kleidung", label: "Kleidung", emoji: "👕" },
  { key: "bietet_medizin", label: "Medizin", emoji: "🩺" },
];

export function FiltersPanel() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [filters, setFilters] = useState<MapFilters>(DEFAULT_FILTERS);
  const didAutoSelectBezirk = useRef(false);

  // Hydrate local state from URL (and keep in sync).
  useEffect(() => {
    setFilters(filtersFromSearchParams(new URLSearchParams(searchParams.toString())));
  }, [searchParams]);

  // Default bezirk: if none selected yet, use the user's current location (once).
  useEffect(() => {
    if (didAutoSelectBezirk.current) return;
    didAutoSelectBezirk.current = true;

    const sp = new URLSearchParams(searchParams.toString());
    if (sp.getAll("bezirk").length > 0) return; // user already selected
    if (!("geolocation" in navigator)) return;

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lng = pos.coords.longitude;
          const lat = pos.coords.latitude;

          const res = await fetch("/api/bezirke", { cache: "force-cache" });
          if (!res.ok) return;
          const geo = (await res.json()) as any;
          const features = Array.isArray(geo?.features) ? geo.features : [];

          const hitName = findBezirkNameForPoint(features, lng, lat);
          if (!hitName) return;

          const enumValue = bezirkFromGeoJsonName(hitName);
          if (!enumValue) return;

          // Don't overwrite if the user selected in the meantime.
          const spNow = new URLSearchParams(window.location.search);
          if (spNow.getAll("bezirk").length > 0) return;

          const next = { ...filtersFromSearchParams(spNow), bezirk: [enumValue] };
          const nextSp = searchParamsFromFilters(next);
          const href = nextSp.toString() ? `${pathname}?${nextSp.toString()}` : pathname;
          router.replace(href, { scroll: false });
        } catch {
          // ignore
        }
      },
      () => {
        // ignore permission denied / unavailable
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 5 * 60 * 1000 }
    );
  }, [pathname, router, searchParams]);

  function pointInRing(point: [number, number], ring: [number, number][]) {
    // Ray casting algorithm. point: [lng, lat]
    const [x, y] = point;
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const xi = ring[i][0],
        yi = ring[i][1];
      const xj = ring[j][0],
        yj = ring[j][1];
      const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 0.0) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  }

  function pointInPolygon(point: [number, number], polygon: [number, number][][]) {
    // polygon: [outerRing, hole1, hole2, ...]
    if (polygon.length === 0) return false;
    if (!pointInRing(point, polygon[0])) return false;
    for (let i = 1; i < polygon.length; i++) {
      if (pointInRing(point, polygon[i])) return false;
    }
    return true;
  }

  function findBezirkNameForPoint(features: any[], lng: number, lat: number): string | null {
    const point: [number, number] = [lng, lat];
    for (const f of features) {
      const name = f?.properties?.Gemeinde_name;
      const geom = f?.geometry;
      if (typeof name !== "string" || !geom) continue;
      if (geom.type === "Polygon") {
        if (pointInPolygon(point, geom.coordinates)) return name;
      } else if (geom.type === "MultiPolygon") {
        for (const poly of geom.coordinates ?? []) {
          if (pointInPolygon(point, poly)) return name;
        }
      }
    }
    return null;
  }

  const isDirty = useMemo(() => {
    const base = JSON.stringify(DEFAULT_FILTERS);
    return JSON.stringify(filters) !== base;
  }, [filters]);

  function commit(next: MapFilters) {
    setFilters(next);
    const sp = searchParamsFromFilters(next);
    const href = sp.toString() ? `${pathname}?${sp.toString()}` : pathname;
    router.replace(href, { scroll: false });
  }

  function reset() {
    commit(DEFAULT_FILTERS);
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="search">Suche</Label>
        <Input
          id="search"
          placeholder="Name, Adresse, Angebot…"
          value={filters.q}
          onChange={(e) => commit({ ...filters, q: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <div className="text-sm font-medium">Typ</div>
        <div className="grid grid-cols-1 gap-2">
          {TYPE_OPTIONS.map((t) => {
            const checked = filters.typ.includes(t.value);
            return (
              <label key={t.value} className="flex items-center gap-2">
                <Checkbox
                  checked={checked}
                  onCheckedChange={() => {
                    const typ = checked
                      ? filters.typ.filter((x) => x !== t.value)
                      : [...filters.typ, t.value];
                    commit({ ...filters, typ });
                  }}
                />
                <span className="text-sm">
                  {t.emoji} {t.label}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-sm font-medium">Bezirk</div>
        <div className="grid grid-cols-1 gap-2">
          <label className="flex items-center gap-2">
            <Checkbox
              checked={filters.bezirk.length === 0}
              onCheckedChange={() => commit({ ...filters, bezirk: [] })}
            />
            <span className="text-sm">Alle Bezirke</span>
          </label>
          <div className="h-px bg-border/60 my-1" />
          {BEZIRK_OPTIONS.map((b) => {
            const checked = filters.bezirk.includes(b.value);
            return (
              <label key={b.value} className="flex items-center gap-2">
                <Checkbox
                  checked={checked}
                  onCheckedChange={() => {
                    const bezirk = checked
                      ? filters.bezirk.filter((x) => x !== b.value)
                      : [...filters.bezirk, b.value];
                    commit({ ...filters, bezirk });
                  }}
                />
                <span className="text-sm">{b.label}</span>
              </label>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-sm font-medium">Betten frei</div>
        <div className="grid grid-cols-1 gap-2">
          {[
            { value: "any" as const, label: "Alle" },
            { value: "free" as const, label: "Nur mit freien Betten" },
            { value: "full" as const, label: "Nur voll" },
          ].map((opt) => (
            <label key={opt.value} className="flex items-center gap-2">
              <Checkbox
                checked={filters.bettenFrei === opt.value}
                onCheckedChange={() => commit({ ...filters, bettenFrei: opt.value })}
              />
              <span className="text-sm">{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-sm font-medium">Öffnungszeiten (Zeitfenster)</div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor="openFrom" className="text-xs">
              Von
            </Label>
            <Input
              id="openFrom"
              type="time"
              value={filters.openFrom}
              onChange={(e) => commit({ ...filters, openFrom: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="openTo" className="text-xs">
              Bis
            </Label>
            <Input
              id="openTo"
              type="time"
              value={filters.openTo}
              onChange={(e) => commit({ ...filters, openTo: e.target.value })}
            />
          </div>
        </div>
        <div className="text-xs text-muted-foreground">
          Filtert Angebote, deren Öffnungszeit das Zeitfenster vollständig abdeckt (auch über
          Mitternacht).
        </div>
      </div>

      <div className="space-y-2 rounded-md border bg-muted/30 p-3">
        <div className="text-sm font-medium">Ausstattung</div>
        <div className="grid grid-cols-1 gap-2">
          {OFFER_META.map((o) => (
            <label key={o.key} className="flex items-center gap-2">
              <Checkbox
                checked={filters.offers[o.key]}
                onCheckedChange={() =>
                  commit({
                    ...filters,
                    offers: { ...filters.offers, [o.key]: !filters.offers[o.key] },
                  })
                }
              />
              <span className="text-sm">
                {o.emoji} {o.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button type="button" variant="secondary" onClick={reset} disabled={!isDirty}>
          Zurücksetzen
        </Button>
      </div>
    </div>
  );
}


