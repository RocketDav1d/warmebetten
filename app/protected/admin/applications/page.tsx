import { redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { approveApplication } from "./actions";

export default async function AdminApplicationsPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) redirect("/auth/login");

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    redirect("/protected");
  }

  const { data: apps, error } = await admin
    .from("unterkunft_applications")
    .select(
      "id,created_at,email,status,unterkunft_id,user_id,unterkuenfte:unterkunft_id(id,name,adresse)",
    )
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  return (
    <div className="flex-1 w-full flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Admin: Freischaltungen</CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="text-sm text-red-600">{error.message}</div>
          ) : !apps || apps.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              Keine offenen Anfragen.
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
                  {apps.map((a: any) => (
                    <tr key={a.id} className="border-t">
                      <td className="p-2 align-top">
                        <div className="font-medium">
                          {a.unterkuenfte?.name ?? a.unterkunft_id}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {a.unterkuenfte?.adresse ?? ""}
                        </div>
                      </td>
                      <td className="p-2 align-top">{a.email}</td>
                      <td className="p-2 align-top">
                        {new Date(a.created_at).toLocaleString()}
                      </td>
                      <td className="p-2 align-top">
                        <form action={approveApplication}>
                          <input type="hidden" name="applicationId" value={a.id} />
                          <Button type="submit" size="sm">
                            Approve
                          </Button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


