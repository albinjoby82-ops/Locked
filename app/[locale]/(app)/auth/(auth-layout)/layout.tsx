import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getI18n } from "locales/server";

import type { LayoutParams } from "@/shared/types/next";

import { paths } from "@/shared/constants/paths";
import { auth } from "@/features/auth/lib/better-auth";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


export default async function AuthLayout(props: LayoutParams<{}>) {
  const t = await getI18n();

  const headerStore = await headers();
  const searchParams = Object.fromEntries(new URLSearchParams(headerStore.get("searchParams") || ""));

  // `not_allowed` is ours: the sign-in form explains the allowlist refusal in
  // its own words, so this generic banner would only duplicate it — badly, since
  // there is no translation key for it and "check your credentials" is wrong
  // advice for an account that will never be allowed in.
  const error = searchParams.error === "not_allowed" ? undefined : searchParams.error;
  const translatedError = error ? t(`next_auth_errors.${error}` as keyof typeof t) : "";

  const user = await auth.api.getSession({ headers: headerStore });

  if (user) {
    redirect(`/${paths.root}`);
  }

  return (
    <>
      <div className="h-full flex">
        {error && (
          <Alert className="mb-4" variant="error">
            <AlertTitle>{translatedError}</AlertTitle>
            <AlertDescription>{t("signin_error_subtitle")}</AlertDescription>
          </Alert>
        )}

        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-md">{props.children}</div>
        </div>
      </div>
    </>
  );
}
