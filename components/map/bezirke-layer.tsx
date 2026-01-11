"use client";

import { useEffect, useMemo, useState } from "react";
import { useTheme } from "next-themes";
import type { ExpressionSpecification, Map as MapLibreMap } from "maplibre-gl";

import { useMap } from "@/components/ui/map";
import { bezirkNamesForGeoJson, type BerlinBezirk } from "@/components/map/filters";

type GeoJSON = GeoJSON.FeatureCollection<
  GeoJSON.Geometry,
  Record<string, unknown>
>;

const SOURCE_ID = "bezirke";
const FILL_ID = "bezirke-fill";
const LINE_ID = "bezirke-line";

function getFirstSymbolLayerId(map: MapLibreMap) {
  const layers = map.getStyle()?.layers ?? [];
  const firstSymbol = layers.find((l) => l.type === "symbol");
  return firstSymbol?.id;
}

export function BezirkeLayer({ selectedBezirke }: { selectedBezirke: BerlinBezirk[] }) {
  const { map, isLoaded } = useMap();
  const { resolvedTheme } = useTheme();
  const [data, setData] = useState<GeoJSON | null>(null);
  const [hoverId, setHoverId] = useState<string | number | null>(null);

  const selectedNames = useMemo(
    () => bezirkNamesForGeoJson(selectedBezirke),
    [selectedBezirke]
  );

  const style = useMemo(() => {
    const isDark = resolvedTheme === "dark";
    const baseFillOpacity = isDark ? 0.08 : 0.06;
    const baseLineOpacity = isDark ? 0.45 : 0.35;

    const hoverFillOpacity = isDark ? 0.16 : 0.12;
    const hoverLineOpacity = isDark ? 0.8 : 0.7;
    const baseLineWidth = 1.25;
    const hoverLineWidth = 2.75;

    // Berlin Bezirke (Gemeinde_name)
    const colorExpr: ExpressionSpecification = [
      "match",
      ["get", "Gemeinde_name"],
      "Mitte",
      "#22c55e",
      "Friedrichshain-Kreuzberg",
      "#06b6d4",
      "Pankow",
      "#3b82f6",
      "Charlottenburg-Wilmersdorf",
      "#a855f7",
      "Spandau",
      "#f59e0b",
      "Steglitz-Zehlendorf",
      "#14b8a6",
      "Tempelhof-Schöneberg",
      "#f97316",
      "Neukölln",
      "#ef4444",
      "Treptow-Köpenick",
      "#8b5cf6",
      "Marzahn-Hellersdorf",
      "#eab308",
      "Lichtenberg",
      "#0ea5e9",
      "Reinickendorf",
      "#10b981",
      "#64748b", // fallback (slate)
    ];

    return {
      colorExpr,
      baseFillOpacity,
      baseLineOpacity,
      hoverFillOpacity,
      hoverLineOpacity,
      baseLineWidth,
      hoverLineWidth,
    };
  }, [resolvedTheme]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/bezirke", { cache: "force-cache" });
        if (!res.ok) return;
        const json = (await res.json()) as GeoJSON;
        if (!cancelled) setData(json);
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!map || !isLoaded || !data) return;

    // Map style changes reset custom sources/layers -> re-add whenever isLoaded flips true.
    const beforeId = getFirstSymbolLayerId(map);

    // Reset hover state whenever the style is rebuilt.
    setHoverId(null);

    if (map.getLayer(FILL_ID)) map.removeLayer(FILL_ID);
    if (map.getLayer(LINE_ID)) map.removeLayer(LINE_ID);
    if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);

    map.addSource(SOURCE_ID, {
      type: "geojson",
      data,
      // Needed for feature-state hover. The GeoJSON has `properties.gml_id`.
      promoteId: "gml_id",
    });

    map.addLayer(
      {
        id: FILL_ID,
        type: "fill",
        source: SOURCE_ID,
        ...(selectedNames.length
          ? {
              filter: [
                "in",
                ["get", "Gemeinde_name"],
                ["literal", selectedNames],
              ],
            }
          : {}),
        paint: {
          "fill-color": style.colorExpr,
          "fill-opacity": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            style.hoverFillOpacity,
            style.baseFillOpacity,
          ],
          "fill-opacity-transition": { duration: 180, delay: 0 },
        },
      },
      beforeId
    );

    map.addLayer(
      {
        id: LINE_ID,
        type: "line",
        source: SOURCE_ID,
        ...(selectedNames.length
          ? {
              filter: [
                "in",
                ["get", "Gemeinde_name"],
                ["literal", selectedNames],
              ],
            }
          : {}),
        paint: {
          "line-color": style.colorExpr,
          "line-opacity": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            style.hoverLineOpacity,
            style.baseLineOpacity,
          ],
          "line-width": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            style.hoverLineWidth,
            style.baseLineWidth,
          ],
          "line-opacity-transition": { duration: 180, delay: 0 },
          "line-width-transition": { duration: 180, delay: 0 },
        },
      },
      beforeId
    );

    return () => {
      if (!map.getStyle()) return;
      if (map.getLayer(FILL_ID)) map.removeLayer(FILL_ID);
      if (map.getLayer(LINE_ID)) map.removeLayer(LINE_ID);
      if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
    };
  }, [map, isLoaded, data, style, selectedNames]);

  // If selection changes without a style reload, update layer filters.
  useEffect(() => {
    if (!map || !isLoaded) return;
    const filter =
      selectedNames.length > 0
        ? ([
            "in",
            ["get", "Gemeinde_name"],
            ["literal", selectedNames],
          ] as any)
        : null;
    try {
      if (map.getLayer(FILL_ID)) map.setFilter(FILL_ID, filter);
      if (map.getLayer(LINE_ID)) map.setFilter(LINE_ID, filter);
    } catch {
      // ignore
    }
  }, [map, isLoaded, selectedNames]);

  // Hover interaction (subtle highlight + cursor)
  useEffect(() => {
    if (!map || !isLoaded) return;

    const setHoverState = (id: string | number | null, hover: boolean) => {
      if (id == null) return;
      try {
        map.setFeatureState({ source: SOURCE_ID, id }, { hover });
      } catch {
        // ignore (can happen during rapid style switches)
      }
    };

    const onMove = (e: any) => {
      const f = e?.features?.[0];
      const id = f?.id as string | number | undefined;
      map.getCanvas().style.cursor = id != null ? "pointer" : "";

      if (id == null) return;
      setHoverId((prev) => {
        if (prev === id) return prev;
        setHoverState(prev, false);
        setHoverState(id, true);
        return id;
      });
    };

    const onLeave = () => {
      map.getCanvas().style.cursor = "";
      setHoverId((prev) => {
        setHoverState(prev, false);
        return null;
      });
    };

    map.on("mousemove", FILL_ID, onMove);
    map.on("mouseleave", FILL_ID, onLeave);

    return () => {
      try {
        map.off("mousemove", FILL_ID, onMove);
        map.off("mouseleave", FILL_ID, onLeave);
      } catch {
        // ignore
      }
      map.getCanvas().style.cursor = "";
    };
  }, [map, isLoaded]);

  return null;
}


