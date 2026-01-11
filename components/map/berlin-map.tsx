"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { Map, MapControls } from "@/components/ui/map";
import { UnterkuenfteLayer, type UnterkunftForMap } from "@/components/map/unterkuenfte-layer";
import { UnterkunftDetailsIsland } from "@/components/map/unterkunft-details-island";
import { applyMapFilters, filtersFromSearchParams } from "@/components/map/filters";
import { BezirkeLayer } from "@/components/map/bezirke-layer";

const BERLIN_CENTER: [number, number] = [13.405, 52.52];
const BERLIN_BOUNDS: [[number, number], [number, number]] = [
  // Slightly padded beyond the strict Berlin bbox so markers near the edge
  // (and minor geocoding inaccuracies) remain reachable via panning.
  [12.95, 52.30], // SW
  [13.90, 52.73], // NE
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


