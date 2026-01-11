"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import {
  BEZIRKE,
  BEZIRK_LABELS,
  UNTERKUNFT_TYPEN,
  UNTERKUNFT_TYP_LABELS,
  type BerlinBezirk,
  type UnterkunftTyp,
} from "@/lib/unterkunft/meta";
import { Button } from "@/components/ui/button";
import {
  Stepper,
  StepperContent,
  StepperIndicator,
  StepperItem,
  StepperNav,
  StepperPanel,
  StepperSeparator,
  StepperTrigger,
} from "@/components/ui/stepper";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Plus } from "lucide-react";

const STEPS = [1, 2, 3, 4] as const;
const STEP_TITLES: Record<(typeof STEPS)[number], string> = {
  1: "Basics",
  2: "Adresse & Kontakt",
  3: "Angebote",
  4: "Kapazität & Account",
};

export function RegisterNewShelterForm() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [step, setStep] = useState<(typeof STEPS)[number]>(1);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // shelter payload (fields match public.unterkuenfte)
  const [typ, setTyp] = useState<UnterkunftTyp>("notuebernachtung");
  const [name, setName] = useState("");
  const [bezirk, setBezirk] = useState<BerlinBezirk>("mitte");

  // address / coords (via Photon)
  const [adresse, setAdresse] = useState(""); // final label saved to DB
  const [strasse, setStrasse] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [selectedPhoton, setSelectedPhoton] = useState<any>(null);

  // Photon search UI state
  const [addressQuery, setAddressQuery] = useState("");
  const [addressResults, setAddressResults] = useState<
    Array<{ label: string; lat: number; lng: number; properties: any }>
  >([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimer = useRef<number | null>(null);

  // transit
  const [uBahnStation, setUBahnStation] = useState("");
  const [sBahnStation, setSBahnStation] = useState("");
  const [bus, setBus] = useState("");

  // contact
  const [telefonNummern, setTelefonNummern] = useState<string[]>([""]);
  const [kontaktEmails, setKontaktEmails] = useState<string[]>([""]);
  const [website, setWebsite] = useState("");
  const [verantwortlichePersonen, setVerantwortlichePersonen] = useState<string[]>([
    "",
  ]);

  // rules
  const [keineDrogen, setKeineDrogen] = useState(false);
  const [keineTiere, setKeineTiere] = useState(false);
  const [keineGewalt, setKeineGewalt] = useState(false);

  // offers
  const [bietetDusche, setBietetDusche] = useState(false);
  const [bietetEssen, setBietetEssen] = useState(false);
  const [bietetBetreuung, setBietetBetreuung] = useState(false);
  const [bietetKleidung, setBietetKleidung] = useState(false);
  const [bietetMedizin, setBietetMedizin] = useState(false);
  const [behindertengerecht, setBehindertengerecht] = useState(false);

  // times (daily)
  const [oeffnungVon, setOeffnungVon] = useState("");
  const [oeffnungBis, setOeffnungBis] = useState("");
  const [letzterEinlass, setLetzterEinlass] = useState("");
  const [busVon, setBusVon] = useState("");
  const [busBis, setBusBis] = useState("");

  // capacity
  const [kapMaxAllg, setKapMaxAllg] = useState<string>("0");
  const [kapMaxFrauen, setKapMaxFrauen] = useState<string>("0");
  const [kapMaxMaenner, setKapMaxMaenner] = useState<string>("0");
  const [plaetzeFreiAktuell, setPlaetzeFreiAktuell] = useState<string>("");

  // misc
  const [metadata, setMetadata] = useState("");

  // account (for signup)
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");

  // Validation used when navigating between steps (should NOT require fields
  // that are only shown in the *target* step, e.g. account fields in step 4).
  function validateForNavigation(targetStep: number): string | null {
    if (targetStep >= 2) {
      if (!name.trim()) return "Bitte den Namen der Unterkunft angeben.";
    }
    if (targetStep >= 3) {
      if (!adresse || lat === null || lng === null) {
        return "Bitte eine Adresse über die Suche auswählen.";
      }
    }
    // Step 4 contains account fields; those are validated on submit only.
    return null;
  }

  function validateForSubmit(): string | null {
    const navErr = validateForNavigation(4);
    if (navErr) return navErr;
    if (!email.trim()) return "Bitte Email angeben.";
    if (!password) return "Bitte Passwort angeben.";
    if (password !== repeatPassword) return "Passwörter stimmen nicht überein.";
    return null;
  }

  const goToStep = (next: (typeof STEPS)[number]) => {
    // Always allow going backwards without blocking.
    if (next < step) {
      setError(null);
      setStep(next);
      return;
    }

    const msg = validateForNavigation(next);
    if (msg) {
      setError(msg);
      return;
    }
    setError(null);
    setStep(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const msg = validateForSubmit();
    if (msg) {
      setError(msg);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const kapMaxAllgNum = Math.max(0, Number(kapMaxAllg) || 0);
      const kapMaxFrauenNum = Math.max(0, Number(kapMaxFrauen) || 0);
      const kapMaxMaennerNum = Math.max(0, Number(kapMaxMaenner) || 0);
      const plaetzeFreiNumRaw =
        plaetzeFreiAktuell.trim() === "" ? kapMaxAllgNum : Number(plaetzeFreiAktuell);
      const plaetzeFreiNum = Math.max(0, Math.min(kapMaxAllgNum, plaetzeFreiNumRaw || 0));

      const telefonArr = telefonNummern.map((s) => s.trim()).filter(Boolean);
      const kontaktEmailArr = kontaktEmails.map((s) => s.trim()).filter(Boolean);
      const verantwortlicheArr = verantwortlichePersonen
        .map((s) => s.trim())
        .filter(Boolean);

      // 1) Create draft submission (server-side, service role)
      const draftRes = await fetch("/api/register/submissions/draft", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email,
          payload: {
            typ,
            name,
            adresse,
            bezirk,
            lat,
            lng,

            strasse: strasse.trim() || null,
            u_bahn_station: uBahnStation.trim() || null,
            s_bahn_station: sBahnStation.trim() || null,
            bus: bus.trim() || null,

            telefon: telefonArr,
            email: kontaktEmailArr,
            website: website.trim() || null,
            verantwortliche_personen: verantwortlicheArr,
            metadata: metadata.trim() || null,

            oeffnung_von: oeffnungVon || null,
            oeffnung_bis: oeffnungBis || null,
            letzter_einlass: letzterEinlass || null,
            kaelte_waerme_bus_kann_kommen_von: busVon || null,
            kaelte_waerme_bus_kann_kommen_bis: busBis || null,

            keine_drogen: keineDrogen,
            keine_tiere: keineTiere,
            keine_gewalt: keineGewalt,

            bietet_dusche: bietetDusche,
            bietet_essen: bietetEssen,
            bietet_betreuung: bietetBetreuung,
            bietet_kleidung: bietetKleidung,
            bietet_medizin: bietetMedizin,
            behindertengerecht,

            kapazitaet_max_allgemein: kapMaxAllgNum,
            kapazitaet_max_frauen: kapMaxFrauenNum,
            kapazitaet_max_maenner: kapMaxMaennerNum,
            plaetze_frei_aktuell: plaetzeFreiNum,

            photon: selectedPhoton,
          },
        }),
      });

      const draftJson = (await draftRes.json()) as
        | { submissionId: string }
        | { message: string };
      if (!draftRes.ok || !("submissionId" in draftJson)) {
        throw new Error(
          "message" in draftJson
            ? draftJson.message
            : `Draft failed (${draftRes.status})`,
        );
      }

      const submissionId = draftJson.submissionId;

      // 2) Sign up; after email confirm we attach user to the draft
      const next = `/register/new/claim?submissionId=${encodeURIComponent(
        submissionId,
      )}`;
      const emailRedirectTo = `${window.location.origin}/auth/confirm?next=${encodeURIComponent(
        next,
      )}`;

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo },
      });
      if (error) throw error;

      router.push("/auth/sign-up-success");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Stepper
        defaultValue={1}
        value={step}
        onValueChange={(v) => goToStep(v as (typeof STEPS)[number])}
        className="space-y-8"
      >
        <StepperNav className="gap-0">
          {STEPS.map((s) => (
            <StepperItem key={s} step={s} className="flex-1">
              <div className="flex flex-col items-center">
                <div className="flex w-full items-center">
                  {/* left connector */}
                  {s !== 1 ? (
                    <div
                      className={cn(
                        "h-px flex-1",
                        step >= s ? "bg-primary" : "bg-muted-foreground/25",
                      )}
                    />
                  ) : (
                    <div className="flex-1" />
                  )}

                  <StepperTrigger className="p-0">
                    <StepperIndicator>{s}</StepperIndicator>
                  </StepperTrigger>

                  {/* right connector */}
                  {s !== 4 ? (
                    <div
                      className={cn(
                        "h-px flex-1",
                        step > s ? "bg-primary" : "bg-muted-foreground/25",
                      )}
                    />
                  ) : (
                    <div className="flex-1" />
                  )}
                </div>

                <div className="mt-2 hidden text-center text-sm font-medium text-foreground sm:block">
                  {STEP_TITLES[s]}
                </div>
              </div>
            </StepperItem>
          ))}
        </StepperNav>

        <StepperPanel className="text-sm">
          <StepperContent value={1} className="space-y-6">
            <div className="text-sm font-semibold">1) Basics</div>

            <div className="grid gap-2">
              <Label htmlFor="typ">Typ</Label>
              <select
                id="typ"
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                value={typ}
                onChange={(e) => setTyp(e.target.value as UnterkunftTyp)}
              >
                {UNTERKUNFT_TYPEN.map((t) => (
                  <option key={t} value={t}>
                    {UNTERKUNFT_TYP_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="bezirk">Bezirk</Label>
              <select
                id="bezirk"
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                value={bezirk}
                onChange={(e) => setBezirk(e.target.value as BerlinBezirk)}
              >
                {BEZIRKE.map((b) => (
                  <option key={b} value={b}>
                    {BEZIRK_LABELS[b]}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end">
              <Button type="button" onClick={() => goToStep(2)}>
                Weiter
              </Button>
            </div>
          </StepperContent>

          <StepperContent value={2} className="space-y-6">
            <div className="text-sm font-semibold">2) Adresse, Kontakt & ÖPNV</div>

            <div className="grid gap-2">
              <Label htmlFor="adresseSearch">Adresse suchen</Label>
              <Input
                id="adresseSearch"
                required
                placeholder="z.B. Oranienburger Str 54, Berlin"
                value={addressQuery}
                onChange={(e) => {
                  const v = e.target.value;
                  setAddressQuery(v);
                  setAdresse("");
                  setLat(null);
                  setLng(null);
                  setSelectedPhoton(null);

                  if (searchTimer.current) {
                    window.clearTimeout(searchTimer.current);
                  }
                  if (v.trim().length < 3) {
                    setAddressResults([]);
                    return;
                  }

                  searchTimer.current = window.setTimeout(async () => {
                    setIsSearching(true);
                    try {
                      const res = await fetch(
                        `/api/geocode/photon?q=${encodeURIComponent(v.trim())}`,
                      );
                      const json = (await res.json()) as {
                        features?: Array<{
                          label: string;
                          lat: number;
                          lng: number;
                          properties: any;
                        }>;
                        message?: string;
                      };
                      if (!res.ok) throw new Error(json.message ?? "Geocoding failed");
                      setAddressResults(json.features ?? []);
                    } catch {
                      setAddressResults([]);
                    } finally {
                      setIsSearching(false);
                    }
                  }, 300);
                }}
              />
              {isSearching && (
                <div className="text-xs text-muted-foreground">Suche…</div>
              )}
              {addressResults.length > 0 && (
                <div className="rounded-md border overflow-hidden">
                  <ul className="divide-y">
                    {addressResults.map((r, idx) => (
                      <li key={`${r.label}-${idx}`}>
                        <button
                          type="button"
                          className="w-full text-left px-3 py-2 text-sm hover:bg-muted/40"
                          onClick={() => {
                            setAdresse(r.label);
                            setLat(r.lat);
                            setLng(r.lng);
                            setSelectedPhoton(r.properties);
                            setAddressQuery(r.label);
                            setAddressResults([]);

                            const street =
                              [r.properties?.street, r.properties?.housenumber]
                                .filter(Boolean)
                                .join(" ") || "";
                            if (street && !strasse) setStrasse(street);
                          }}
                        >
                          <div className="font-medium">{r.label}</div>
                          <div className="text-xs text-muted-foreground tabular-nums">
                            {r.lat.toFixed(5)}, {r.lng.toFixed(5)}
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {adresse && lat !== null && lng !== null && (
                <div className="text-xs text-muted-foreground">
                  Ausgewählt: <span className="font-medium">{adresse}</span> (
                  <span className="tabular-nums">
                    {lat.toFixed(5)}, {lng.toFixed(5)}
                  </span>
                  )
                </div>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="strasse">Straße (optional)</Label>
              <Input
                id="strasse"
                value={strasse}
                onChange={(e) => setStrasse(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label>Telefonnummern</Label>
              <div className="flex flex-wrap gap-2">
                {telefonNummern.map((val, idx) => (
                  <div key={`tel-${idx}`} className="flex items-center gap-2">
                    <Input
                      value={val}
                      onChange={(e) => {
                        const next = [...telefonNummern];
                        next[idx] = e.target.value;
                        setTelefonNummern(next);
                      }}
                      placeholder={idx === 0 ? "+49 …" : "Weitere Nummer"}
                      className="w-[260px]"
                    />
                    {idx === telefonNummern.length - 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        aria-label="Telefonnummer hinzufügen"
                        onClick={() => setTelefonNummern([...telefonNummern, ""])}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Emails (Kontakt)</Label>
              <div className="flex flex-wrap gap-2">
                {kontaktEmails.map((val, idx) => (
                  <div key={`mail-${idx}`} className="flex items-center gap-2">
                    <Input
                      type="email"
                      value={val}
                      onChange={(e) => {
                        const next = [...kontaktEmails];
                        next[idx] = e.target.value;
                        setKontaktEmails(next);
                      }}
                      placeholder={idx === 0 ? "kontakt@…" : "Weitere Email"}
                      className="w-[260px]"
                    />
                    {idx === kontaktEmails.length - 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        aria-label="Email hinzufügen"
                        onClick={() => setKontaktEmails([...kontaktEmails, ""])}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <div className="text-sm font-semibold">Welcher ÖPNV ist in der Nähe?</div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="uBahn">
                  U-Bahn <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  id="uBahn"
                  value={uBahnStation}
                  onChange={(e) => setUBahnStation(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="sBahn">
                  S-Bahn <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  id="sBahn"
                  value={sBahnStation}
                  onChange={(e) => setSBahnStation(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="bus">
                  Bus <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Input id="bus" value={bus} onChange={(e) => setBus(e.target.value)} />
              </div>
              </div>
            </div>

            <div className="flex justify-between">
              <Button type="button" variant="outline" onClick={() => goToStep(1)}>
                Zurück
              </Button>
              <Button type="button" onClick={() => goToStep(3)}>
                Weiter
              </Button>
            </div>
          </StepperContent>

          <StepperContent value={3} className="space-y-6">
            <div className="text-sm font-semibold">3) Regeln, Angebote & Zeiten</div>

            <div className="grid gap-2">
              <Label>Verantwortliche Personen</Label>
              <div className="space-y-2">
                {verantwortlichePersonen.map((val, idx) => (
                  <Input
                    key={`vp-${idx}`}
                    value={val}
                    onChange={(e) => {
                      const next = [...verantwortlichePersonen];
                      next[idx] = e.target.value;
                      setVerantwortlichePersonen(next);
                    }}
                    placeholder={idx === 0 ? "Name" : "Weitere Person"}
                  />
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setVerantwortlichePersonen([...verantwortlichePersonen, ""])
                  }
                >
                  Mehr hinzufügen
                </Button>
              </div>
            </div>

            <div className="grid gap-2">
              <div className="text-sm font-semibold">Regeln</div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={keineDrogen}
                  onChange={(e) => setKeineDrogen(e.target.checked)}
                />
                Keine Drogen
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={keineTiere}
                  onChange={(e) => setKeineTiere(e.target.checked)}
                />
                Keine Tiere
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={keineGewalt}
                  onChange={(e) => setKeineGewalt(e.target.checked)}
                />
                Keine Gewalt
              </label>
            </div>

            <div className="grid gap-2">
              <div className="text-sm font-semibold">Angebote</div>
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={bietetDusche}
                    onChange={(e) => setBietetDusche(e.target.checked)}
                  />
                  Dusche
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={bietetEssen}
                    onChange={(e) => setBietetEssen(e.target.checked)}
                  />
                  Essen
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={bietetBetreuung}
                    onChange={(e) => setBietetBetreuung(e.target.checked)}
                  />
                  Betreuung
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={bietetKleidung}
                    onChange={(e) => setBietetKleidung(e.target.checked)}
                  />
                  Kleidung
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={bietetMedizin}
                    onChange={(e) => setBietetMedizin(e.target.checked)}
                  />
                  Medizin
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={behindertengerecht}
                    onChange={(e) => setBehindertengerecht(e.target.checked)}
                  />
                  Behindertengerecht
                </label>
              </div>
            </div>

            <div className="grid gap-2">
              <div className="text-sm font-semibold">Öffnungszeiten (täglich)</div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="grid gap-2">
                  <Label htmlFor="oeffnungVon">Von</Label>
                  <Input
                    id="oeffnungVon"
                    type="time"
                    value={oeffnungVon}
                    onChange={(e) => setOeffnungVon(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="oeffnungBis">Bis</Label>
                  <Input
                    id="oeffnungBis"
                    type="time"
                    value={oeffnungBis}
                    onChange={(e) => setOeffnungBis(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="letzterEinlass">Letzter Einlass</Label>
                  <Input
                    id="letzterEinlass"
                    type="time"
                    value={letzterEinlass}
                    onChange={(e) => setLetzterEinlass(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-2">
              <div className="text-sm font-semibold">Kälte-/Wärmebus kann kommen</div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="busVon">Von</Label>
                  <Input
                    id="busVon"
                    type="time"
                    value={busVon}
                    onChange={(e) => setBusVon(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="busBis">Bis</Label>
                  <Input
                    id="busBis"
                    type="time"
                    value={busBis}
                    onChange={(e) => setBusBis(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="metadata">Weitere Informationen</Label>
              <Input
                id="metadata"
                value={metadata}
                onChange={(e) => setMetadata(e.target.value)}
                placeholder="Optional: kurze Hinweise (z.B. was man mitbringen muss, besondere Bedingungen, etc.)"
              />
            </div>

            <div className="flex justify-between">
              <Button type="button" variant="outline" onClick={() => goToStep(2)}>
                Zurück
              </Button>
              <Button type="button" onClick={() => goToStep(4)}>
                Weiter
              </Button>
            </div>
          </StepperContent>

          <StepperContent value={4} className="space-y-6">
            <div className="text-sm font-semibold">4) Kapazität & Account</div>

            <div className="text-sm font-semibold">Kapazität</div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="kapMaxAllg">Kapazität max (allgemein)</Label>
                <Input
                  id="kapMaxAllg"
                  inputMode="numeric"
                  value={kapMaxAllg}
                  onChange={(e) => setKapMaxAllg(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="plaetzeFreiAktuell">Plätze frei aktuell</Label>
                <Input
                  id="plaetzeFreiAktuell"
                  inputMode="numeric"
                  value={plaetzeFreiAktuell}
                  onChange={(e) => setPlaetzeFreiAktuell(e.target.value)}
                  placeholder="(leer = max)"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="kapMaxFrauen">Kapazität max (Frauen)</Label>
                <Input
                  id="kapMaxFrauen"
                  inputMode="numeric"
                  value={kapMaxFrauen}
                  onChange={(e) => setKapMaxFrauen(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="kapMaxMaenner">Kapazität max (Männer)</Label>
                <Input
                  id="kapMaxMaenner"
                  inputMode="numeric"
                  value={kapMaxMaenner}
                  onChange={(e) => setKapMaxMaenner(e.target.value)}
                />
              </div>
            </div>

            <Separator />

            <div className="text-sm font-semibold">Account erstellen</div>
            <div className="grid gap-2">
              <Label htmlFor="email">Account Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="password">Passwort</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="repeatPassword">Passwort wiederholen</Label>
              <Input
                id="repeatPassword"
                type="password"
                required
                value={repeatPassword}
                onChange={(e) => setRepeatPassword(e.target.value)}
              />
            </div>

            <div className="flex justify-between">
              <Button type="button" variant="outline" onClick={() => goToStep(3)}>
                Zurück
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Absenden…" : "Absenden"}
              </Button>
            </div>
          </StepperContent>
        </StepperPanel>
      </Stepper>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}


