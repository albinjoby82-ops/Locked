import { redirect } from "next/navigation";

/** Dead route: Google has already verified the address. */
export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect(`/${locale}/auth/signin`);
}
