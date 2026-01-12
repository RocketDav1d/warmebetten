export function normalizeWebsiteUrl(url: string) {
  const s = url.trim();
  if (!s) return "";
  if (/^https?:\/\//i.test(s)) return s;
  return `https://${s}`;
}

export function googleMapsDirectionsHref({
  lat,
  lng,
}: {
  lat: number;
  lng: number;
}) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${lat},${lng}`)}`;
}


