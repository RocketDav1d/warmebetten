"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { UnterkunftForMap } from "@/components/map/unterkuenfte-layer";

function typLabel(typ: UnterkunftForMap["typ"]) {
  switch (typ) {
    case "notuebernachtung":
      return "Notübernachtung";
    case "nachtcafe":
      return "Nachtcafé";
    case "tagesangebote":
      return "Tagesangebote";
    case "essen_verpflegung":
      return "Essen & Verpflegung";
    case "medizinische_hilfen":
      return "Medizinische Hilfen";
    case "suchtangebote":
      return "Suchtangebote";
    case "beratung":
      return "Beratung";
    case "hygiene":
      return "Hygiene";
    case "kleiderkammer":
      return "Kleiderkammer";
    default:
      return "Angebot";
  }
}

export function MobileOffersIsland({ unterkuenfte }: { unterkuenfte: UnterkunftForMap[] }) {
  if (unterkuenfte.length === 0) return null;

  return (
    <Card className="pointer-events-auto w-[calc(100vw-1.5rem)] sm:w-[420px] md:w-[460px] max-h-[40dvh] overflow-auto bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70 shadow-lg">
      <CardHeader className="space-y-1">
        <CardTitle className="text-base leading-none">🚙 Mobile Angebote</CardTitle>
        <div className="text-xs text-muted-foreground">{unterkuenfte.length} Einträge</div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {unterkuenfte.map((u, idx) => (
          <div key={u.id} className="space-y-1">
            <div className="flex items-start justify-between gap-3">
              <div className="font-medium leading-snug">{u.name}</div>
              {u.typ ? (
                <Badge variant="secondary" className="text-[11px]">
                  {typLabel(u.typ)}
                </Badge>
              ) : null}
            </div>

            <div className="text-xs text-muted-foreground">
              {u.website ? (
                <a
                  href={u.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  Website
                </a>
              ) : null}
              {u.website && (u.telefon?.length || u.email?.length) ? " • " : null}
              {u.telefon?.length ? <span>Tel: {u.telefon.join(", ")}</span> : null}
              {u.telefon?.length && u.email?.length ? " • " : null}
              {u.email?.length ? <span>E‑Mail: {u.email.join(", ")}</span> : null}
            </div>

            {idx < unterkuenfte.length - 1 ? <Separator /> : null}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}


