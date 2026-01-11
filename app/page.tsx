import { BerlinMap } from "@/components/map/berlin-map";
import { LeftIsland } from "@/components/map/left-island";
import type { UnterkunftForMap } from "@/components/map/unterkuenfte-layer";
import { getSupabaseEnv, hasEnvVars } from "@/lib/utils";

export default async function Home() {
  // NOTE: We intentionally do a public PostgREST fetch here (instead of the SSR
  // supabase client which calls `cookies()` / `connection()`), so the "/" route
  // doesn't become a blocking dynamic route in Next.
  const unterkuenfte = await (async () => {
    if (!hasEnvVars) return [];

    const { url, key } = getSupabaseEnv();
    if (!url || !key) return [];

    const select =
      "id,name,adresse,bezirk,typ,lat,lng,betten_frei,plaetze_frei,plaetze_frei_aktuell,capacity_updated_at,telefon,email,website,oeffnung_von,oeffnung_bis,letzter_einlass,bietet_dusche,bietet_essen,bietet_betreuung,bietet_kleidung,bietet_medizin,behindertengerecht";

    const params = new URLSearchParams({
      select,
      order: "name.asc",
    });

    const res = await fetch(`${url}/rest/v1/unterkuenfte?${params.toString()}`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
      next: { revalidate: 60 },
    });

    if (!res.ok) return [];
    return (await res.json()) as UnterkunftForMap[];
  })();

  return (
    <main className="h-dvh w-screen overflow-hidden">
      <div className="relative h-full w-full">
        {/* Full-screen map */}
        <BerlinMap unterkuenfte={unterkuenfte ?? []} />

        {/* Hovering UI (doesn't block map except where needed) */}
        <div className="pointer-events-none absolute inset-0 z-20 p-3 sm:p-4">
          <LeftIsland />
        </div>
      </div>
    </main>
  );
}
