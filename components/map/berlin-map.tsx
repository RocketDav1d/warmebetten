"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { Map, MapControls } from "@/components/ui/map";
import { UnterkuenfteLayer, type UnterkunftForMap } from "@/components/map/unterkuenfte-layer";
import { UnterkunftDetailsIsland } from "@/components/map/unterkunft-details-island";
import { applyMapFilters, filtersFromSearchParams } from "@/components/map/filters";
import { BezirkeLayer } from "@/components/map/bezirke-layer";
import { MobileOffersIsland } from "@/components/map/mobile-offers-island";

const BERLIN_CENTER: [number, number] = [13.405, 52.52];
const BERLIN_BOUNDS: [[number, number], [number, number]] = [
  // Padded beyond the strict Berlin bbox so:
  // - markers near the edge (or with minor geocoding inaccuracies) remain reachable
  // - users can still pan at the *minimum zoom* (when the viewport is very wide),
  //   even with the left island overlay.
  [12.75, 52.20], // SW
  [14.05, 52.85], // NE
];

export function BerlinMap({ unterkuenfte }: { unterkuenfte: UnterkunftForMap[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const searchParams = useSearchParams();

  const filters = useMemo(
    () => filtersFromSearchParams(new URLSearchParams(searchParams.toString())),
    [searchParams]
  );

  const filtered = useMemo(
    () => applyMapFilters(unterkuenfte, filters),
    [unterkuenfte, filters]
  );

  const mobileOffers = useMemo(() => {
    if (!filters.showMobile) return [];
    // For mobile offers, apply the same filters, but ignore bezirk (many are not tied to a district).
    const mobileOnly = unterkuenfte.filter((u) => u.is_mobile);
    return applyMapFilters(mobileOnly, { ...filters, bezirk: [] });
  }, [unterkuenfte, filters]);

  const selected = useMemo(
    () => filtered.find((u) => u.id === selectedId) ?? null,
    [filtered, selectedId]
  );

  useEffect(() => {
    if (selectedId && !filtered.some((u) => u.id === selectedId)) {
      setSelectedId(null);
    }
  }, [filtered, selectedId]);

  return (
    <Map
      center={BERLIN_CENTER}
      zoom={11.5}
      minZoom={8}
      maxZoom={18}
      maxBounds={BERLIN_BOUNDS}
      dragRotate={false}
      pitchWithRotate={false}
    >
      <MapControls showZoom showLocate showFullscreen />

      <BezirkeLayer selectedBezirke={filters.bezirk} />

      <UnterkuenfteLayer
        unterkuenfte={filtered}
        onSelect={(u) => setSelectedId(u.id)}
      />

      {filters.showMobile && (
        <div className="pointer-events-none absolute inset-0 z-10 p-3 sm:p-4">
          <div className="pointer-events-auto absolute bottom-3 right-3 sm:bottom-4 sm:right-4">
            <MobileOffersIsland unterkuenfte={mobileOffers} />
          </div>
        </div>
      )}

      {selected && (
        <div className="pointer-events-none absolute inset-0 z-10 p-3 sm:p-4">
          <div className="pointer-events-auto absolute right-3 top-3 sm:right-4 sm:top-4">
            <UnterkunftDetailsIsland
              unterkunft={selected}
              onClose={() => setSelectedId(null)}
            />
          </div>
        </div>
      )}
    </Map>
  );
}


