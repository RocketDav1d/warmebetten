"use client";

import { Map, MapControls } from "@/components/ui/map";

const BERLIN_CENTER: [number, number] = [13.405, 52.52];
const BERLIN_BOUNDS: [[number, number], [number, number]] = [
  [13.0884, 52.3383], // SW
  [13.7611, 52.6755], // NE
];

export function BerlinMap() {
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
    </Map>
  );
}


