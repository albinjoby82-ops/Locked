"use client";
import { useSearchParams } from "next/navigation";

import { ProviderButton } from "@/features/auth/ui/ProviderButton";
import { Alert, AlertDescription } from "@/components/ui/alert";

/**
 * Sign in.
 *
 * Google only — passwords are disabled in the better-auth config, so the email
 * and password fields that used to live here would submit into a closed door.
 * The name is kept so the route and its imports stay put.
 */
export function CredentialsLoginForm() {
  const searchParams = useSearchParams();

  // ProviderButton sends a refused account back here with this flag. The
  // allowlist rejection happens inside the OAuth callback, so this is the only
  // place we get to explain it.
  const wasRefused = searchParams.get("error") === "not_allowed";

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold">Locked In</h1>
        <p className="text-muted-foreground text-balance text-sm">Private. Two accounts, no more.</p>
      </div>

      {wasRefused && (
        <Alert variant="error">
          <AlertDescription>That Google account isn&apos;t on the allowlist, so it can&apos;t be used here.</AlertDescription>
        </Alert>
      )}

      <ProviderButton action="signin" className="w-full" providerId="google" variant="outline" />
    </div>
  );
}
