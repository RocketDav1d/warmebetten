import { NextRequest, NextResponse } from "next/server";

// Berlin bounding box: minLon,minLat,maxLon,maxLat
const BERLIN_BBOX = "13.0884,52.3383,13.7611,52.6755";

type PhotonFeature = {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: Record<string, unknown>;
};

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 3) {
    return NextResponse.json({ features: [] });
  }

  const url = new URL("https://photon.komoot.io/api/");
  url.searchParams.set("q", q);
  url.searchParams.set("lang", "de");
  url.searchParams.set("limit", "6");
  url.searchParams.set("bbox", BERLIN_BBOX);

  const res = await fetch(url, {
    // This runs server-side; set a clear UA for fair-use.
    headers: {
      "user-agent": "warmebetten.berlin (photon geocoding)",
      "accept-language": "de",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    return NextResponse.json(
      { message: `Photon-Fehler (${res.status})` },
      { status: 502 },
    );
  }

  const json = (await res.json()) as { features?: PhotonFeature[] };
  const features = (json.features ?? []).map((f) => {
    const [lng, lat] = f.geometry.coordinates;
    const p = f.properties ?? {};

    // Build a human-readable label.
    const parts = [
      p["name"],
      p["street"],
      p["housenumber"],
      p["postcode"],
      p["city"],
      p["country"],
    ]
      .filter((x) => typeof x === "string" && x.trim().length > 0)
      .map((x) => (x as string).trim());

    const label = parts.join(" ");

    return {
      label: label || (typeof p["name"] === "string" ? p["name"] : q),
      lat,
      lng,
      properties: p,
    };
  });

  return NextResponse.json({ features });
}


