import { redirect } from "next/navigation";

import { updateUnterkunft } from "@/app/protected/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/server";

function formatDateTime(value: string | null) {
  if (!value) return null;
  try {
    return new Date(value).toLocaleString("de-DE", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

export default async function ProtectedPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) redirect("/auth/login");

  const { data: shelters, error } = await supabase
    .from("unterkuenfte")
    .select(
      "id,name,is_mobile,adresse,bezirk,typ,lat,lng,kapazitaet_max_allgemein,plaetze_frei_aktuell,betten_frei,capacity_updated_at,telefon,email,website,oeffnung_von,oeffnung_bis,letzter_einlass,bietet_essen,bietet_dusche,bietet_medizin,bietet_kleidung,bietet_betreuung,behindertengerecht"
    )
    .eq("owner_user_id", user.id)
    .order("name", { ascending: true });

  if (error) {
    return (
      <div className="w-full max-w-5xl space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Kapazität verwalten</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-red-600">
            Fehler beim Laden deiner Unterkünfte: {error.message}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl space-y-4">
      <Card>
        <CardHeader className="space-y-2">
          <CardTitle className="text-xl">Kapazität verwalten</CardTitle>
          <p className="text-sm text-muted-foreground">
            Als Betreiber kannst du deine Unterkunftsdaten bearbeiten. Die
            Kapazität (aktuell frei) sollte regelmäßig aktualisiert werden.
          </p>
        </CardHeader>
      </Card>

      {(shelters ?? []).length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            Du hast aktuell keine Unterkunft, die dir zugeordnet ist. Falls du
            gerade erst registriert hast: warte auf die Freischaltung durch den
            Admin oder claim deine Unterkunft im Registrierungsflow.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {(shelters ?? []).map((u) => (
            <Card key={u.id}>
              <CardHeader className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <CardTitle className="text-base leading-none">
                      {u.name}
                    </CardTitle>
                    <div className="text-xs text-muted-foreground">
                      {u.is_mobile ? "Mobil" : u.adresse ?? "—"}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant={u.betten_frei ? "default" : "secondary"}>
                      {u.betten_frei ? "Betten frei" : "Keine Betten frei"}
                    </Badge>
                    <div className="text-[11px] text-muted-foreground">
                      Kapazität aktualisiert:{" "}
                      {formatDateTime(u.capacity_updated_at) ?? "—"}
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <form action={updateUnterkunft} className="space-y-4">
                  <input type="hidden" name="unterkunftId" value={u.id} />

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <label className="flex items-center gap-2 text-sm sm:col-span-3">
                      <input
                        type="checkbox"
                        name="is_mobile"
                        defaultChecked={Boolean(u.is_mobile)}
                      />
                      Mobile Unterkunft (keine feste Adresse)
                    </label>
                    <div className="space-y-2">
                      <Label htmlFor={`plaetze-${u.id}`}>Plätze frei (aktuell)</Label>
                      <Input
                        id={`plaetze-${u.id}`}
                        name="plaetze_frei_aktuell"
                        type="number"
                        min={0}
                        defaultValue={u.plaetze_frei_aktuell ?? 0}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`kapmax-${u.id}`}>Kapazität max (allgemein)</Label>
                      <Input
                        id={`kapmax-${u.id}`}
                        name="kapazitaet_max_allgemein"
                        type="number"
                        min={0}
                        defaultValue={u.kapazitaet_max_allgemein ?? 0}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`website-${u.id}`}>Website</Label>
                      <Input
                        id={`website-${u.id}`}
                        name="website"
                        placeholder="https://..."
                        defaultValue={u.website ?? ""}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor={`telefon-${u.id}`}>Telefon (kommagetrennt)</Label>
                      <Input
                        id={`telefon-${u.id}`}
                        name="telefon_csv"
                        placeholder="030..., 0176..."
                        defaultValue={(u.telefon ?? []).join(", ")}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`email-${u.id}`}>E‑Mail (kommagetrennt)</Label>
                      <Input
                        id={`email-${u.id}`}
                        name="email_csv"
                        placeholder="info@..., kontakt@..."
                        defaultValue={(u.email ?? []).join(", ")}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor={`von-${u.id}`}>Öffnung von</Label>
                      <Input
                        id={`von-${u.id}`}
                        name="oeffnung_von"
                        type="time"
                        defaultValue={(u.oeffnung_von ?? "").slice(0, 5)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`bis-${u.id}`}>Öffnung bis</Label>
                      <Input
                        id={`bis-${u.id}`}
                        name="oeffnung_bis"
                        type="time"
                        defaultValue={(u.oeffnung_bis ?? "").slice(0, 5)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`einlass-${u.id}`}>Letzter Einlass</Label>
                      <Input
                        id={`einlass-${u.id}`}
                        name="letzter_einlass"
                        type="time"
                        defaultValue={(u.letzter_einlass ?? "").slice(0, 5)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        name="bietet_essen"
                        defaultChecked={Boolean(u.bietet_essen)}
                      />
                      Essen
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        name="bietet_dusche"
                        defaultChecked={Boolean(u.bietet_dusche)}
                      />
                      Dusche
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        name="bietet_medizin"
                        defaultChecked={Boolean(u.bietet_medizin)}
                      />
                      Medizin
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        name="bietet_kleidung"
                        defaultChecked={Boolean(u.bietet_kleidung)}
                      />
                      Kleidung
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        name="bietet_betreuung"
                        defaultChecked={Boolean(u.bietet_betreuung)}
                      />
                      Betreuung
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        name="behindertengerecht"
                        defaultChecked={Boolean(u.behindertengerecht)}
                      />
                      Barrierefrei
                    </label>
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit">Speichern</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
