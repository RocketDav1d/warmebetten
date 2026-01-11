import { redirect } from "next/navigation";
import { Suspense } from "react";

import { createAdminClient, getServiceRoleProblem } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { approveSubmission } from "./actions";

export default function AdminSubmissionsPage() {
  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground">Laden…</div>}>
      <AdminSubmissions />
    </Suspense>
  );
}

async function AdminSubmissions() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") redirect("/protected");

  const serviceRoleProblem = getServiceRoleProblem();
  if (serviceRoleProblem) {
    return (
      <div className="flex-1 w-full flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Admin: Neue Unterkünfte</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
              <div className="font-medium text-foreground">
                Server-Konfiguration fehlt
              </div>
              <div className="mt-1">{serviceRoleProblem}</div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const admin = createAdminClient();
  const { data: subs, error } = await admin
    .from("unterkunft_submissions")
    .select("id,created_at,email,status,payload,user_id")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  return (
    <div className="flex-1 w-full flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Admin: Neue Unterkünfte</CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="text-sm text-red-600">{error.message}</div>
          ) : !subs || subs.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              Keine offenen Einreichungen.
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="p-2 text-left">Unterkunft</th>
                    <th className="p-2 text-left">Email</th>
                    <th className="p-2 text-left">Eingang</th>
                    <th className="p-2 text-left">Aktion</th>
                  </tr>
                </thead>
                <tbody>
                  {subs.map((s: any) => {
                    const p = s.payload ?? {};
                    return (
                      <tr key={s.id} className="border-t">
                        <td className="p-2 align-top">
                          <div className="font-medium">{p.name ?? "—"}</div>
                          <div className="text-xs text-muted-foreground">
                            {p.adresse ?? ""}
                          </div>
                        </td>
                        <td className="p-2 align-top">{s.email}</td>
                        <td className="p-2 align-top">
                          {new Date(s.created_at).toLocaleString()}
                        </td>
                        <td className="p-2 align-top">
                          <form action={approveSubmission}>
                            <input
                              type="hidden"
                              name="submissionId"
                              value={s.id}
                            />
                            <Button type="submit" size="sm">
                              Approve
                            </Button>
                          </form>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


