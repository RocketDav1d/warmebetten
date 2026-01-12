import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RegisterNewShelterClaimClient } from "./register-new-shelter-claim-client";

export default function RegisterNewShelterClaimPage({
  searchParams,
}: {
  searchParams: { submissionId?: string };
}) {
  const submissionId = searchParams?.submissionId ?? null;

  return (
    <div className="flex min-h-svh w-full items-start justify-center px-4 py-6 sm:px-6 sm:py-10">
      <div className="w-full max-w-xl space-y-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Einreichung abschließen</CardTitle>
          </CardHeader>
          <CardContent>
            <RegisterNewShelterClaimClient submissionId={submissionId} />
          </CardContent>
        </Card>

        <div className="text-sm text-muted-foreground sm:text-xs">
          Zurück:{" "}
          <Link className="underline underline-offset-4" href="/register">
            /register
          </Link>
        </div>
      </div>
    </div>
  );
}


