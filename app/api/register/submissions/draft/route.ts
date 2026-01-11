import { NextResponse } from "next/server";

import { createAdminClient, getServiceRoleProblem } from "@/lib/supabase/admin";

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
    const email =
      typeof body?.email === "string" ? normalizeEmail(body.email) : null;
    const payload = body?.payload;

    if (!email) {
      return NextResponse.json({ message: "E‑Mail-Adresse fehlt" }, { status: 400 });
    }
    if (!payload || typeof payload !== "object") {
      return NextResponse.json({ message: "Daten (payload) fehlen" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("unterkunft_submissions")
      .insert({
        email,
        status: "draft",
        payload,
      })
      .select("id")
      .single();

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    return NextResponse.json({ submissionId: data.id });
  } catch (e: unknown) {
    return NextResponse.json(
      { message: e instanceof Error ? e.message : "Unbekannter Fehler" },
      { status: 500 },
    );
  }
}


