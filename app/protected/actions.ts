"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

function parseOptionalInt(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return null;
  const s = value.trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function parseOptionalFloat(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return null;
  const s = value.trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function parseOptionalString(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return null;
  const s = value.trim();
  return s ? s : null;
}

function parseStringArrayCsv(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseTime(value: FormDataEntryValue | null) {
  // Accept "HH:MM" or "HH:MM:SS"; store as "HH:MM:SS".
  if (typeof value !== "string") return null;
  const s = value.trim();
  if (!s) return null;
  if (/^\d{1,2}:\d{2}$/.test(s)) return `${s}:00`;
  if (/^\d{1,2}:\d{2}:\d{2}$/.test(s)) return s;
  return null;
}

export async function updateUnterkunft(formData: FormData) {
  const unterkunftId = formData.get("unterkunftId");
  if (typeof unterkunftId !== "string" || !unterkunftId) {
    throw new Error("Missing unterkunftId");
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) redirect("/auth/login");

  const plaetzeFreiAktuell = parseOptionalInt(formData.get("plaetze_frei_aktuell"));
  const kapMaxAllg = parseOptionalInt(formData.get("kapazitaet_max_allgemein"));

  const update = {
    // capacity
    ...(plaetzeFreiAktuell == null
      ? {}
      : { plaetze_frei_aktuell: Math.max(0, plaetzeFreiAktuell) }),
    ...(kapMaxAllg == null
      ? {}
      : { kapazitaet_max_allgemein: Math.max(0, kapMaxAllg) }),

    // location basics
    bezirk: parseOptionalString(formData.get("bezirk")),
    typ: parseOptionalString(formData.get("typ")),
    name: parseOptionalString(formData.get("name")),
    adresse: parseOptionalString(formData.get("adresse")),
    strasse: parseOptionalString(formData.get("strasse")),
    lat: parseOptionalFloat(formData.get("lat")),
    lng: parseOptionalFloat(formData.get("lng")),

    // contact
    website: parseOptionalString(formData.get("website")),
    telefon: parseStringArrayCsv(formData.get("telefon_csv")),
    email: parseStringArrayCsv(formData.get("email_csv")),

    // opening times
    oeffnung_von: parseTime(formData.get("oeffnung_von")),
    oeffnung_bis: parseTime(formData.get("oeffnung_bis")),
    letzter_einlass: parseTime(formData.get("letzter_einlass")),

    // offers
    bietet_essen: formData.get("bietet_essen") === "on",
    bietet_dusche: formData.get("bietet_dusche") === "on",
    bietet_medizin: formData.get("bietet_medizin") === "on",
    bietet_kleidung: formData.get("bietet_kleidung") === "on",
    bietet_betreuung: formData.get("bietet_betreuung") === "on",
    behindertengerecht: formData.get("behindertengerecht") === "on",
  } as const;

  const { error } = await supabase
    .from("unterkuenfte")
    .update(update)
    .eq("id", unterkunftId)
    .eq("owner_user_id", user.id);

  if (error) throw new Error(error.message);

  revalidatePath("/protected");
  revalidatePath("/");
}


