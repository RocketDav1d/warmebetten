import type { Database } from "@/lib/supabase/database.types";

export type KaeltehilfeCapacityStatus =
  Database["public"]["Enums"]["kaeltehilfe_capacity_status"];

export type KaeltehilfeCapacityFields = {
  kaeltehilfe_capacity_status: KaeltehilfeCapacityStatus | null;
  kaeltehilfe_capacity_status_men: KaeltehilfeCapacityStatus | null;
  kaeltehilfe_capacity_status_women: KaeltehilfeCapacityStatus | null;
  kaeltehilfe_capacity_status_diverse: KaeltehilfeCapacityStatus | null;
};

export type DerivedKaeltehilfeStatus = KaeltehilfeCapacityStatus | null;

/**
 * Derive a single traffic-light status from the (overall + gender-specific) Kaeltehilfe fields.
 *
 * Rules (per product decision):
 * - If ANY of the 4 is "plenty" -> green
 * - Else if ANY is "little" -> orange
 * - Else if ANY is "none" -> red
 * - Else -> unknown (null)
 */
export function deriveKaeltehilfeStatus(
  u: KaeltehilfeCapacityFields
): DerivedKaeltehilfeStatus {
  const vals = [
    u.kaeltehilfe_capacity_status,
    u.kaeltehilfe_capacity_status_men,
    u.kaeltehilfe_capacity_status_women,
    u.kaeltehilfe_capacity_status_diverse,
  ].filter(Boolean) as KaeltehilfeCapacityStatus[];

  if (vals.length === 0) return null;
  if (vals.includes("plenty")) return "plenty";
  if (vals.includes("little")) return "little";
  return "none";
}

export function kaeltehilfeStatusLabel(s: DerivedKaeltehilfeStatus): string {
  switch (s) {
    case "plenty":
      return "Viele Plätze";
    case "little":
      return "Wenige Plätze";
    case "none":
      return "Keine Plätze";
    default:
      return "Kapazität unbekannt";
  }
}


