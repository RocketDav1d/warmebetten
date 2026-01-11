"use client";

import { useMemo, useState } from "react";

import { Map, MapControls } from "@/components/ui/map";
import { UnterkuenfteLayer, type UnterkunftForMap } from "@/components/map/unterkuenfte-layer";
import { UnterkunftDetailsIsland } from "@/components/map/unterkunft-details-island";

const BERLIN_CENTER: [number, number] = [13.405, 52.52];
const BERLIN_BOUNDS: [[number, number], [number, number]] = [
  [13.0884, 52.3383], // SW
  [13.7611, 52.6755], // NE
];

export function BerlinMap({ unterkuenfte }: { unterkuenfte: UnterkunftForMap[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = useMemo(
    () => unterkuenfte.find((u) => u.id === selectedId) ?? null,
    [unterkuenfte, selectedId]
  );

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

      <UnterkuenfteLayer
        unterkuenfte={unterkuenfte}
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


