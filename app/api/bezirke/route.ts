import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";

export async function GET() {
  const filePath = path.join(process.cwd(), "bezirksgrenzen.geojson");
  const raw = await readFile(filePath, "utf-8");
  const json = JSON.parse(raw) as unknown;
  return NextResponse.json(json, {
    headers: {
      // Helpful when this is called directly from the browser too.
      "cache-control": "public, max-age=86400, s-maxage=86400",
    },
  });
}


