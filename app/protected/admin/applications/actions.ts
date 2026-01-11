"use server";

import { redirect } from "next/navigation";

import { createAdminClient, getServiceRoleProblem } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function approveApplication(formData: FormData) {
  const applicationId = formData.get("applicationId");
  if (typeof applicationId !== "string" || !applicationId) {
    throw new Error("applicationId fehlt");
  }

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

  const serviceRoleProblem = getServiceRoleProblem();
  if (serviceRoleProblem) throw new Error(serviceRoleProblem);

  const admin = createAdminClient();
  const { data: app, error: appErr } = await admin
    .from("unterkunft_applications")
    .select("id,unterkunft_id,user_id,status")
    .eq("id", applicationId)
    .maybeSingle();

  if (appErr) throw new Error(appErr.message);
  if (!app) throw new Error("Anfrage nicht gefunden");
  if (app.status !== "pending") throw new Error("Anfrage ist nicht offen");

  // Claim shelter if still unclaimed
  const { data: updated, error: updErr } = await admin
    .from("unterkuenfte")
    .update({ owner_user_id: app.user_id })
    .eq("id", app.unterkunft_id)
    .is("owner_user_id", null)
    .select("id")
    .maybeSingle();

  if (updErr) throw new Error(updErr.message);
  if (!updated?.id) {
    throw new Error("Unterkunft ist bereits verbunden");
  }

  const { error: updAppErr } = await admin
    .from("unterkunft_applications")
    .update({
      status: "approved",
      reviewed_by_user_id: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", applicationId);

  if (updAppErr) throw new Error(updAppErr.message);

  await admin.from("profiles").update({ role: "provider" }).eq("id", app.user_id);
}


