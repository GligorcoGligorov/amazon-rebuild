import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { signInAction } from "@/lib/actions/auth";
import { AuthForm } from "@/components/auth-form";
import { PageTitle } from "@/components/ui/page-title";

export const metadata: Metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function SignInPage({ searchParams }: Props) {
  const raw = one((await searchParams).callbackUrl);
  const callbackUrl = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";

  if (await auth()) redirect(callbackUrl);

  return (
    <div className="mx-auto w-full max-w-md px-4 pt-8 sm:pt-16">
      <PageTitle eyebrow="Account">Sign in</PageTitle>
      {callbackUrl === "/checkout" ? (
        <p className="mt-3 text-sm text-ink-600">
          Sign in to check out. Your cart is saved and will be waiting.
        </p>
      ) : null}
      <div className="mt-8 border-t border-ink-900 pt-6">
        <AuthForm mode="sign-in" action={signInAction} callbackUrl={callbackUrl} />
      </div>
    </div>
  );
}
