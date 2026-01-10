import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as unknown;
    const unterkunftId =
      typeof (body as any)?.unterkunftId === "string"
        ? ((body as any).unterkunftId as string)
        : null;

    if (!unterkunftId) {
      return NextResponse.json(
        { status: "error", message: "Missing unterkunftId" },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      return NextResponse.json(
        { status: "error", message: "Not authenticated" },
        { status: 401 },
      );
    }

    const user = userData.user;
    const email = user.email ? normalizeEmail(user.email) : null;
    if (!email) {
      return NextResponse.json(
        { status: "error", message: "Missing user email" },
        { status: 400 },
      );
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

    // Whitelist check
    const { data: wl, error: wlError } = await admin
      .from("unterkunft_email_whitelist")
      .select("id")
      .eq("unterkunft_id", unterkunftId)
      .eq("email", email)
      .maybeSingle();

    if (wlError) {
      return NextResponse.json(
        { status: "error", message: wlError.message },
        { status: 500 },
      );
    }

    const isWhitelisted = !!wl?.id;

    if (isWhitelisted) {
      // Claim the shelter (only if unclaimed)
      const { data: updated, error: updError } = await admin
        .from("unterkuenfte")
        .update({ owner_user_id: user.id, created_by: user.id })
        .eq("id", unterkunftId)
        .is("owner_user_id", null)
        .select("id")
        .maybeSingle();

      if (updError) {
        return NextResponse.json(
          { status: "error", message: updError.message },
          { status: 500 },
        );
      }
      if (!updated?.id) {
        return NextResponse.json(
          {
            status: "error",
            message:
              "Diese Unterkunft ist bereits mit einem anderen Account verbunden.",
          },
          { status: 409 },
        );
      }

      await admin
        .from("profiles")
        .update({ role: "provider" })
        .eq("id", user.id);

      return NextResponse.json({ status: "claimed" } as const);
    }

    // Not whitelisted -> create pending application (admin approval)
    const { error: appError } = await admin.from("unterkunft_applications").upsert(
      {
        unterkunft_id: unterkunftId,
        user_id: user.id,
        email,
        status: "pending",
      },
      { onConflict: "user_id,unterkunft_id" },
    );

    if (appError) {
      return NextResponse.json(
        { status: "error", message: appError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ status: "pending" } as const);
  } catch (e: unknown) {
    return NextResponse.json(
      { status: "error", message: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 },
    );
  }
}


