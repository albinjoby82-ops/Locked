import { redirect } from "next/navigation";

/**
 * Dead route: passwords are disabled and accounts create themselves on first
 * Google sign-in, so there is nothing to sign up for or reset.
 */
export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect(`/${locale}/auth/signin`);
}
