"use client";

import { useMemo, useState } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

type FilterId =
  | "shelters"
  | "emergency"
  | "meals"
  | "showers"
  | "counseling"
  | "women"
  | "families";

const DEFAULT_FILTERS: Record<FilterId, boolean> = {
  shelters: true,
  emergency: true,
  meals: false,
  showers: false,
  counseling: false,
  women: false,
  families: false,
};

export function FiltersPanel() {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  const isDirty = useMemo(() => {
    if (query.trim().length > 0) return true;
    return Object.entries(filters).some(([k, v]) => v !== DEFAULT_FILTERS[k as FilterId]);
  }, [filters, query]);

  function toggle(id: FilterId) {
    setFilters((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function reset() {
    setQuery("");
    setFilters(DEFAULT_FILTERS);
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="search">Suche</Label>
        <Input
          id="search"
          placeholder="Name, Adresse, Angebot…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <div className="text-sm font-medium">Angebote</div>
        <div className="grid grid-cols-1 gap-2">
          <label className="flex items-center gap-2">
            <Checkbox checked={filters.shelters} onCheckedChange={() => toggle("shelters")} />
            <span className="text-sm">Unterkünfte</span>
          </label>
          <label className="flex items-center gap-2">
            <Checkbox
              checked={filters.emergency}
              onCheckedChange={() => toggle("emergency")}
            />
            <span className="text-sm">Notübernachtung</span>
          </label>
          <label className="flex items-center gap-2">
            <Checkbox checked={filters.meals} onCheckedChange={() => toggle("meals")} />
            <span className="text-sm">Mahlzeiten</span>
          </label>
          <label className="flex items-center gap-2">
            <Checkbox checked={filters.showers} onCheckedChange={() => toggle("showers")} />
            <span className="text-sm">Dusche</span>
          </label>
          <label className="flex items-center gap-2">
            <Checkbox
              checked={filters.counseling}
              onCheckedChange={() => toggle("counseling")}
            />
            <span className="text-sm">Beratung</span>
          </label>
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-sm font-medium">Zielgruppen</div>
        <div className="grid grid-cols-1 gap-2">
          <label className="flex items-center gap-2">
            <Checkbox checked={filters.women} onCheckedChange={() => toggle("women")} />
            <span className="text-sm">Frauen*</span>
          </label>
          <label className="flex items-center gap-2">
            <Checkbox checked={filters.families} onCheckedChange={() => toggle("families")} />
            <span className="text-sm">Familien</span>
          </label>
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


