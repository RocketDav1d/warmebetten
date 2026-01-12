import {
  BEZIRK_LABELS,
  type BerlinBezirk,
  type UnterkunftTyp,
} from "@/lib/unterkunft/meta";
import type { UnterkunftForMap } from "@/components/map/unterkuenfte-layer";
import { deriveKaeltehilfeStatus } from "@/lib/unterkunft/kaeltehilfe";

export type { BerlinBezirk, UnterkunftTyp } from "@/lib/unterkunft/meta";
export { BEZIRK_LABELS } from "@/lib/unterkunft/meta";

export type CapacityFilter = "any" | "plenty" | "little" | "none" | "unknown";

export type MapFilters = {
  q: string;
  typ: UnterkunftTyp[];
  bezirk: BerlinBezirk[];
  capacity: CapacityFilter;
  openFrom: string; // "HH:MM" or ""
  openTo: string; // "HH:MM" or ""
  showMobile: boolean;
  offers: {
    bietet_essen: boolean;
    bietet_dusche: boolean;
    bietet_betreuung: boolean;
    bietet_kleidung: boolean;
    bietet_medizin: boolean;
  };
};

export const DEFAULT_FILTERS: MapFilters = {
  q: "",
  typ: [],
  bezirk: [],
  capacity: "any",
  openFrom: "",
  openTo: "",
  showMobile: false,
  offers: {
    bietet_essen: false,
    bietet_dusche: false,
    bietet_betreuung: false,
    bietet_kleidung: false,
    bietet_medizin: false,
  },
};

export function bezirkNamesForGeoJson(bezirke: BerlinBezirk[]): string[] {
  return bezirke.map((b) => BEZIRK_LABELS[b]).filter(Boolean);
}

export function bezirkFromGeoJsonName(name: string): BerlinBezirk | null {
  const entry = Object.entries(BEZIRK_LABELS).find(([, label]) => label === name);
  return (entry?.[0] as BerlinBezirk | undefined) ?? null;
}

function parseTimeHHMM(value: string): number | null {
  const s = value.trim();
  if (!s) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(s);
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  return hh * 60 + mm;
}

function parsePgTimeToMinutes(value: string | null): number | null {
  if (!value) return null;
  // stored as "HH:MM:SS"
  const m = /^(\d{2}):(\d{2})/.exec(value);
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  return hh * 60 + mm;
}

function segments(startMin: number, endMin: number): Array<[number, number]> {
  // returns segments in [0, 2880)
  if (startMin === endMin) {
    // treat as "unknown/closed" rather than 24/7
    return [];
  }
  if (startMin < endMin) {
    return [
      [startMin, endMin],
      [startMin + 1440, endMin + 1440],
    ];
  }
  // wraps over midnight
  return [[startMin, endMin + 1440]];
}

function coversInterval(
  shelterFrom: number,
  shelterTo: number,
  filterFrom: number,
  filterTo: number
) {
  const sSegs = segments(shelterFrom, shelterTo);
  const fSegs = segments(filterFrom, filterTo);
  if (sSegs.length === 0 || fSegs.length === 0) return false;
  for (const [fs, fe] of fSegs) {
    for (const [ss, se] of sSegs) {
      if (fs >= ss && fe <= se) return true;
    }
  }
  return false;
}

export function filtersFromSearchParams(sp: URLSearchParams): MapFilters {
  const q = sp.get("q") ?? "";
  const cap = (sp.get("cap") as CapacityFilter | null) ?? "any";
  const capacity: CapacityFilter =
    cap === "any" || cap === "plenty" || cap === "little" || cap === "none" || cap === "unknown"
      ? cap
      : "any";

  const openFrom = sp.get("openFrom") ?? "";
  const openTo = sp.get("openTo") ?? "";
  const showMobile = sp.get("mobile") === "1";

  const typ = sp.getAll("typ") as UnterkunftTyp[];
  const bezirk = sp.getAll("bezirk") as BerlinBezirk[];

  const offers = {
    bietet_essen: sp.get("bietet_essen") === "1",
    bietet_dusche: sp.get("bietet_dusche") === "1",
    bietet_betreuung: sp.get("bietet_betreuung") === "1",
    bietet_kleidung: sp.get("bietet_kleidung") === "1",
    bietet_medizin: sp.get("bietet_medizin") === "1",
  };

  return {
    ...DEFAULT_FILTERS,
    q,
    capacity,
    openFrom,
    openTo,
    showMobile,
    typ,
    bezirk,
    offers,
  };
}

export function searchParamsFromFilters(filters: MapFilters): URLSearchParams {
  const sp = new URLSearchParams();
  // Don't trim here: trimming while the user is typing prevents entering spaces
  // (e.g. "foo " gets immediately coerced back to "foo" before you can type "bar").
  if (filters.q.length > 0) sp.set("q", filters.q);
  if (filters.capacity !== "any") sp.set("cap", filters.capacity);
  if (filters.openFrom) sp.set("openFrom", filters.openFrom);
  if (filters.openTo) sp.set("openTo", filters.openTo);
  if (filters.showMobile) sp.set("mobile", "1");

  for (const t of filters.typ) sp.append("typ", t);
  for (const b of filters.bezirk) sp.append("bezirk", b);

  for (const [k, v] of Object.entries(filters.offers)) {
    if (v) sp.set(k, "1");
  }
  return sp;
}

export function applyMapFilters(
  unterkuenfte: UnterkunftForMap[],
  filters: MapFilters
): UnterkunftForMap[] {
  const q = filters.q.trim().toLowerCase();
  const openFromMin = parseTimeHHMM(filters.openFrom);
  const openToMin = parseTimeHHMM(filters.openTo);
  const hasOpeningFilter = openFromMin != null || openToMin != null;

  return unterkuenfte.filter((u) => {
    // text query
    if (q) {
      const hay = [
        u.name,
        u.adresse ?? "",
        u.bezirk ?? "",
        u.typ ?? "",
      ]
        .join(" ")
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }

    // typ / bezirk
    if (filters.typ.length && (!u.typ || !filters.typ.includes(u.typ))) return false;
    if (filters.bezirk.length && (!u.bezirk || !filters.bezirk.includes(u.bezirk)))
      return false;

    // Kaeltehilfe capacity (traffic light).
    // Only Notübernachtung entries participate in this.
    if (filters.capacity !== "any") {
      if (u.typ !== "notuebernachtung") return false;
      const derived = deriveKaeltehilfeStatus(u);
      if (filters.capacity === "unknown") {
        if (derived != null) return false;
      } else {
        if (derived !== filters.capacity) return false;
      }
    }

    // bietet_* offers (AND)
    if (filters.offers.bietet_essen && u.bietet_essen !== true) return false;
    if (filters.offers.bietet_dusche && u.bietet_dusche !== true) return false;
    if (filters.offers.bietet_betreuung && u.bietet_betreuung !== true) return false;
    if (filters.offers.bietet_kleidung && u.bietet_kleidung !== true) return false;
    if (filters.offers.bietet_medizin && u.bietet_medizin !== true) return false;

    // opening hours filter
    if (hasOpeningFilter) {
      const sFrom = parsePgTimeToMinutes(u.oeffnung_von);
      const sTo = parsePgTimeToMinutes(u.oeffnung_bis);
      if (sFrom == null || sTo == null) return false;

      // if only one side is set, treat it as "open at that time"
      if (openFromMin != null && openToMin == null) {
        return coversInterval(sFrom, sTo, openFromMin, (openFromMin + 1) % 1440);
      }
      if (openFromMin == null && openToMin != null) {
        return coversInterval(sFrom, sTo, openToMin, (openToMin + 1) % 1440);
      }
      // both set: shelter must cover the whole requested interval
      return coversInterval(sFrom, sTo, openFromMin as number, openToMin as number);
    }

    return true;
  });
}


