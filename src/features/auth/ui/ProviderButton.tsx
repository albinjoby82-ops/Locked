"use client";

import { toast } from "sonner";
import { useSearchParams } from "next/navigation";
import { useI18n } from "locales/client";
import { useMutation } from "@tanstack/react-query";

import type { ReactNode } from "react";

import { getServerUrl } from "@/shared/lib/server-url";
import { authClient } from "@/features/auth/lib/auth-client";
import { Loader } from "@/components/ui/loader";
import { Button, ButtonProps } from "@/components/ui/button";
import { GoogleSvg } from "@/components/svg/GoogleSvg";


const ProviderData: Record<string, { icon: ReactNode; name: string }> = {
  google: {
    icon: <GoogleSvg size={16} />,
    name: "Google",
  },
};

type ProviderButtonProps = {
  providerId: string;
  variant: ButtonProps["variant"];
  action: "signin" | "signup";
  className?: string;
};

export const ProviderButton = (props: ProviderButtonProps) => {
  const t = useI18n();

  const searchParams = useSearchParams();

  const authMutation = useMutation({
    mutationFn: async () => {
      const redirectUrl = searchParams.get("redirect");
      const callbackUrl = searchParams.get("callbackUrl");
      const defaultAction = props.action === "signup" ? "signup" : "signin";
      const defaultCallback = `${getServerUrl()}/?${defaultAction}=true`;
      
      const { error } = await authClient.signIn.social({
        provider: "google",
        callbackURL: redirectUrl || callbackUrl || defaultCallback,
        // The allowlist hook throws inside the OAuth callback, and better-auth
        // answers that with a redirect rather than JSON. Without somewhere of
        // our own to send it, a refused account lands on a bare better-auth
        // error page instead of being told why.
        errorCallbackURL: `${getServerUrl()}/auth/signin?error=not_allowed`,
      });

      if (error) throw new Error(error.message ?? "Sign-in failed.");
    },
    // Without this a failure is completely silent: the spinner stops and
    // nothing else happens.
    onError: (error: Error) => toast.error(error.message || "Could not sign in with Google."),
  });

  const data = ProviderData[props.providerId];

  const traduction =
    props.action === "signin" ? t("commons.signin_with", { provider: data.name }) : t("commons.signup_with", { provider: data.name });

  return (
    <Button
      className={props.className}
      onClick={() => {
        authMutation.mutate();
      }}
      size="large"
      variant="outline"
    >
      {authMutation.isPending ? <Loader size={16} /> : data.icon}
      <span className="ml-2 text-base">{traduction}</span>
    </Button>
  );
};
