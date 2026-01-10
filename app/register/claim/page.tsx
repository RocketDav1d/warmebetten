import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RegisterClaimClient } from "./register-claim-client";

export default function RegisterClaimPage({
  searchParams,
}: {
  searchParams: { unterkunftId?: string };
}) {
  const unterkunftId = searchParams?.unterkunftId ?? null;

  return (
    <div className="flex min-h-svh w-full items-start justify-center p-6 md:p-10">
      <div className="w-full max-w-xl space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Unterkunft verbinden</CardTitle>
          </CardHeader>
          <CardContent>
            <RegisterClaimClient unterkunftId={unterkunftId} />
          </CardContent>
        </Card>

        <div className="text-xs text-muted-foreground">
          Zurück zur Karte:{" "}
          <Link className="underline underline-offset-4" href="/">
            warmebetten.berlin
          </Link>
        </div>
      </div>
    </div>
  );
}


