import type { Database } from "@/lib/supabase/database.types";

export type BerlinBezirk = Database["public"]["Enums"]["berlin_bezirk"];
export type UnterkunftTyp = Database["public"]["Enums"]["unterkunft_typ"];

export const BEZIRKE: BerlinBezirk[] = [
  "mitte",
  "friedrichshain_kreuzberg",
  "pankow",
  "charlottenburg_wilmersdorf",
  "spandau",
  "steglitz_zehlendorf",
  "tempelhof_schoeneberg",
  "neukoelln",
  "treptow_koepenick",
  "marzahn_hellersdorf",
  "lichtenberg",
  "reinickendorf",
];

export const BEZIRK_LABELS: Record<BerlinBezirk, string> = {
  mitte: "Mitte",
  friedrichshain_kreuzberg: "Friedrichshain-Kreuzberg",
  pankow: "Pankow",
  charlottenburg_wilmersdorf: "Charlottenburg-Wilmersdorf",
  spandau: "Spandau",
  steglitz_zehlendorf: "Steglitz-Zehlendorf",
  tempelhof_schoeneberg: "Tempelhof-Schöneberg",
  neukoelln: "Neukölln",
  treptow_koepenick: "Treptow-Köpenick",
  marzahn_hellersdorf: "Marzahn-Hellersdorf",
  lichtenberg: "Lichtenberg",
  reinickendorf: "Reinickendorf",
};

export function formatBezirk(bezirk: BerlinBezirk | null | undefined): string {
  if (!bezirk) return "—";
  return BEZIRK_LABELS[bezirk] ?? bezirk;
}

export const UNTERKUNFT_TYPEN: UnterkunftTyp[] = [
  "notuebernachtung",
  "nachtcafe",
  "tagesangebote",
  "essen_verpflegung",
  "medizinische_hilfen",
  "suchtangebote",
  "beratung",
  "hygiene",
  "kleiderkammer",
];

export const UNTERKUNFT_TYP_LABELS: Record<UnterkunftTyp, string> = {
  notuebernachtung: "Notübernachtung",
  nachtcafe: "Nachtcafé",
  tagesangebote: "Tagesangebote",
  essen_verpflegung: "Essen / Verpflegung",
  medizinische_hilfen: "Medizinische Hilfen",
  suchtangebote: "Suchtangebote",
  beratung: "Beratung",
  hygiene: "Hygiene",
  kleiderkammer: "Kleiderkammer",
};

export function formatUnterkunftTyp(typ: UnterkunftTyp | null | undefined): string {
  if (!typ) return "—";
  return UNTERKUNFT_TYP_LABELS[typ] ?? typ;
}


