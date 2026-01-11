import { NextResponse } from "next/server";

import { createAdminClient, getServiceRoleProblem } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function POST(request: Request) {
  try {
    const serviceRoleProblem = getServiceRoleProblem();
    if (serviceRoleProblem) {
      return NextResponse.json({ message: serviceRoleProblem }, { status: 500 });
    }

    const body = (await request.json()) as any;
    const submissionId =
      typeof body?.submissionId === "string" ? body.submissionId : null;
    if (!submissionId) {
      return NextResponse.json(
        { message: "submissionId fehlt" },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      return NextResponse.json(
        { message: "Nicht angemeldet" },
        { status: 401 },
      );
    }

    const user = userData.user;
    const email = user.email ? normalizeEmail(user.email) : null;
    if (!email) {
      return NextResponse.json({ message: "E‑Mail-Adresse fehlt" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Ensure profile exists (no SQL trigger dependency).
    await admin.from("profiles").upsert(
      {
        id: user.id,
        full_name: (user.user_metadata as any)?.full_name ?? email,
      },
      { onConflict: "id" },
    );

    // Attach user to draft and move to pending (only if still draft)
    const { data: updated, error: updError } = await admin
      .from("unterkunft_submissions")
      .update({ user_id: user.id, status: "pending" })
      .eq("id", submissionId)
      .eq("email", email)
      .eq("status", "draft")
      .select("id")
      .maybeSingle();

    if (updError) {
      return NextResponse.json({ message: updError.message }, { status: 500 });
    }
    if (!updated?.id) {
      return NextResponse.json(
        {
          message:
            "Einreichung nicht gefunden (oder bereits übernommen). Bitte starte den Ablauf erneut.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({ status: "pending" } as const);
  } catch (e: unknown) {
    return NextResponse.json(
      { message: e instanceof Error ? e.message : "Unbekannter Fehler" },
      { status: 500 },
    );
  }
}


