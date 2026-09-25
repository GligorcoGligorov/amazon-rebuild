import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { signUpAction } from "@/lib/actions/auth";
import { AuthForm } from "@/components/auth-form";
import { PageTitle } from "@/components/ui/page-title";

export const metadata: Metadata = { title: "Create account" };
export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function SignUpPage({ searchParams }: Props) {
  const raw = one((await searchParams).callbackUrl);
  const callbackUrl = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";

  if (await auth()) redirect(callbackUrl);

  return (
    <div className="mx-auto w-full max-w-md px-4 pt-8 sm:pt-16">
      <PageTitle eyebrow="New account">Create account</PageTitle>
      <p className="mt-3 text-sm text-ink-600">
        Demo data only — do not use a real password.
      </p>
      <div className="mt-8 border-t border-ink-900 pt-6">
        <AuthForm mode="sign-up" action={signUpAction} callbackUrl={callbackUrl} />
      </div>
    </div>
  );
}
