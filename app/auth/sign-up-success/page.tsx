import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import { ResendConfirmationClient } from "./resend-confirmation-client";

export default function Page({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const emailRaw = searchParams?.email;
  const email = Array.isArray(emailRaw) ? emailRaw[0] : emailRaw;

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">
                Danke für deine Registrierung!
              </CardTitle>
              <CardDescription>Bitte E‑Mail prüfen und bestätigen</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Du hast dich erfolgreich registriert. Bitte bestätige deine
                E‑Mail-Adresse, bevor du dich anmeldest.
              </p>
              <ResendConfirmationClient initialEmail={email ?? null} />

              <div className="mt-4 text-center text-sm">
                Schon bestätigt?{" "}
                <Link href="/auth/login" className="underline underline-offset-4">
                  Anmelden
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
