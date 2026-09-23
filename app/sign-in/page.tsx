import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { signInAction } from "@/lib/actions/auth";
import { AuthForm } from "@/components/auth-form";

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
    <div className="mx-auto w-full max-w-sm px-4 py-10 sm:py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
      {callbackUrl === "/checkout" ? (
        <p className="mt-2 text-sm text-ink-600">
          Sign in to check out. Your cart is saved and will be waiting.
        </p>
      ) : null}
      <div className="mt-6">
        <AuthForm mode="sign-in" action={signInAction} callbackUrl={callbackUrl} />
      </div>
    </div>
  );
}
