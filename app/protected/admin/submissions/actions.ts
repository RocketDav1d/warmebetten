"use server";

import { redirect } from "next/navigation";

import { createAdminClient, getServiceRoleProblem } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import { Constants } from "@/lib/supabase/database.types";

type Payload = {
  typ?: unknown;
  name?: string;
  adresse?: string;
  bezirk?: unknown;
  lat?: number;
  lng?: number;
  strasse?: string | null;
  u_bahn_station?: string | null;
  s_bahn_station?: string | null;
  bus?: string | null;
  telefon?: string[] | string | null;
  email?: string[] | string | null;
  website?: string | null;
  verantwortliche_personen?: string[] | null;
  metadata?: string | null;
  oeffnung_von?: string | null;
  oeffnung_bis?: string | null;
  letzter_einlass?: string | null;
  kaelte_waerme_bus_kann_kommen_von?: string | null;
  kaelte_waerme_bus_kann_kommen_bis?: string | null;
  keine_drogen?: boolean;
  keine_tiere?: boolean;
  keine_gewalt?: boolean;
  bietet_dusche?: boolean;
  bietet_essen?: boolean;
  bietet_betreuung?: boolean;
  bietet_kleidung?: boolean;
  bietet_medizin?: boolean;
  behindertengerecht?: boolean;
  kapazitaet_max_allgemein?: number;
  kapazitaet_max_frauen?: number;
  kapazitaet_max_maenner?: number;
  plaetze_frei_aktuell?: number;
};

type UnterkunftTyp = Database["public"]["Enums"]["unterkunft_typ"];
type BerlinBezirk = Database["public"]["Enums"]["berlin_bezirk"];

function normalizeUnterkunftTyp(value: unknown): UnterkunftTyp | null {
  if (typeof value !== "string") return null;
  return (Constants.public.Enums.unterkunft_typ as readonly string[]).includes(value)
    ? (value as UnterkunftTyp)
    : null;
}

function normalizeBezirk(value: unknown): BerlinBezirk | null {
  if (typeof value !== "string") return null;
  return (Constants.public.Enums.berlin_bezirk as readonly string[]).includes(value)
    ? (value as BerlinBezirk)
    : null;
}

export async function approveSubmission(formData: FormData) {
  const submissionId = formData.get("submissionId");
  if (typeof submissionId !== "string" || !submissionId) {
    throw new Error("submissionId fehlt");
  }

  const serviceRoleProblem = getServiceRoleProblem();
  if (serviceRoleProblem) throw new Error(serviceRoleProblem);

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) redirect("/auth/login");

  // Role check using user-scoped client.
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "admin") {
    throw new Error("Nicht berechtigt");
  }

  const admin = createAdminClient();

  const { data: sub, error: subErr } = await admin
    .from("unterkunft_submissions")
    .select("id,user_id,email,status,payload")
    .eq("id", submissionId)
    .maybeSingle();

  if (subErr) throw new Error(subErr.message);
  if (!sub) throw new Error("Einreichung nicht gefunden");
  if (sub.status !== "pending") throw new Error("Einreichung ist nicht offen");
  if (!sub.user_id) throw new Error("Einreichung ist keinem Benutzer zugeordnet");

  const payload = sub.payload as Payload;
  if (
    !payload?.name ||
    !payload?.adresse ||
    typeof payload.lat !== "number" ||
    typeof payload.lng !== "number"
  ) {
    throw new Error("Einreichung ist unvollständig");
  }

  // Create shelter + connect to user.
  const telefonArr =
    Array.isArray(payload.telefon)
      ? payload.telefon
      : typeof payload.telefon === "string" && payload.telefon.trim()
        ? [payload.telefon.trim()]
        : [];
  const emailArr =
    Array.isArray(payload.email)
      ? payload.email
      : typeof payload.email === "string" && payload.email.trim()
        ? [payload.email.trim()]
        : [];

  const typ = normalizeUnterkunftTyp(payload.typ);
  const bezirk = normalizeBezirk(payload.bezirk);

  const { data: shelter, error: shelterErr } = await admin
    .from("unterkuenfte")
    .insert({
      typ,
      name: payload.name,
      adresse: payload.adresse,
      bezirk,
      lat: payload.lat,
      lng: payload.lng,
      strasse: payload.strasse ?? null,
      u_bahn_station: payload.u_bahn_station ?? null,
      s_bahn_station: payload.s_bahn_station ?? null,
      bus: payload.bus ?? null,
      telefon: telefonArr,
      email: emailArr,
      website: payload.website ?? null,
      verantwortliche_personen: payload.verantwortliche_personen ?? [],
      metadata: payload.metadata ?? null,
      oeffnung_von: payload.oeffnung_von ?? null,
      oeffnung_bis: payload.oeffnung_bis ?? null,
      letzter_einlass: payload.letzter_einlass ?? null,
      kaelte_waerme_bus_kann_kommen_von:
        payload.kaelte_waerme_bus_kann_kommen_von ?? null,
      kaelte_waerme_bus_kann_kommen_bis:
        payload.kaelte_waerme_bus_kann_kommen_bis ?? null,
      keine_drogen: Boolean(payload.keine_drogen),
      keine_tiere: Boolean(payload.keine_tiere),
      keine_gewalt: Boolean(payload.keine_gewalt),
      bietet_dusche: Boolean(payload.bietet_dusche),
      bietet_essen: Boolean(payload.bietet_essen),
      bietet_betreuung: Boolean(payload.bietet_betreuung),
      bietet_kleidung: Boolean(payload.bietet_kleidung),
      bietet_medizin: Boolean(payload.bietet_medizin),
      behindertengerecht: Boolean(payload.behindertengerecht),
      kapazitaet_max_allgemein: Math.max(0, payload.kapazitaet_max_allgemein ?? 0),
      kapazitaet_max_frauen: Math.max(0, payload.kapazitaet_max_frauen ?? 0),
      kapazitaet_max_maenner: Math.max(0, payload.kapazitaet_max_maenner ?? 0),
      plaetze_frei_aktuell: Math.max(
        0,
        payload.plaetze_frei_aktuell ?? payload.kapazitaet_max_allgemein ?? 0,
      ),
      created_by: sub.user_id,
      owner_user_id: sub.user_id,
    })
    .select("id")
    .single();

  if (shelterErr) throw new Error(shelterErr.message);

  // Mark submission approved
  const { error: updErr } = await admin
    .from("unterkunft_submissions")
    .update({
      status: "approved",
      reviewed_by_user_id: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", submissionId);
  if (updErr) throw new Error(updErr.message);

  // Promote user to provider
  await admin.from("profiles").update({ role: "provider" }).eq("id", sub.user_id);

  // (optional) you might store shelter.id back into submission payload in the future
  void shelter;
}


