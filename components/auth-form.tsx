"use client";

import { useActionState } from "react";
import Link from "next/link";
import { DEMO_EMAIL, DEMO_PASSWORD } from "@/lib/demo-account";
import type { AuthFormState } from "@/lib/actions/auth";
import { buttonClass } from "./ui/button";

type Props = {
  mode: "sign-in" | "sign-up";
  action: (state: AuthFormState, formData: FormData) => Promise<AuthFormState>;
  callbackUrl: string;
};

const initial: AuthFormState = {};

export function AuthForm({ mode, action, callbackUrl }: Props) {
  const [state, formAction, pending] = useActionState(action, initial);
  const isSignUp = mode === "sign-up";

  const errorFor = (field: AuthFormState["field"]) =>
    state.error && state.field === field ? state.error : null;

  return (
    <form id="auth-form" action={formAction} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="callbackUrl" value={callbackUrl} />

      {/* Form-level errors sit at the top; field errors sit under their input.
          Both are announced, and each input points at its own message. */}
      {errorFor("form") ? (
        <p
          role="alert"
          className="rounded-md border border-danger px-3 py-2 text-sm text-danger"
        >
          {state.error}
        </p>
      ) : null}

      {isSignUp ? (
        <Field
          id="name"
          name="name"
          label="Name"
          autoComplete="name"
          defaultValue={state.values?.name}
          error={errorFor("name")}
        />
      ) : null}

      <Field
        id="email"
        name="email"
        type="email"
        label="Email"
        autoComplete="email"
        defaultValue={state.values?.email}
        error={errorFor("email")}
      />

      <Field
        id="password"
        name="password"
        type="password"
        label="Password"
        autoComplete={isSignUp ? "new-password" : "current-password"}
        hint={isSignUp ? "At least 8 characters." : undefined}
        error={errorFor("password")}
      />

      <button
        type="submit"
        disabled={pending}
        className={buttonClass({ variant: "ink", className: "mt-2" })}
      >
        {pending ? "…" : isSignUp ? "Create account" : "Sign in"}
      </button>

      {!isSignUp ? <DemoAccount /> : null}

      <p className="text-center text-sm text-ink-600">
        {isSignUp ? "Already have an account? " : "New here? "}
        <Link
          href={`${isSignUp ? "/sign-in" : "/sign-up"}?callbackUrl=${encodeURIComponent(callbackUrl)}`}
          className="font-medium text-ink-900 underline decoration-border underline-offset-4 hover:decoration-ink-900"
        >
          {isSignUp ? "Sign in" : "Create an account"}
        </Link>
      </p>
    </form>
  );
}

function Field({
  id,
  name,
  label,
  type = "text",
  autoComplete,
  defaultValue,
  hint,
  error,
}: {
  id: string;
  name: string;
  label: string;
  type?: string;
  autoComplete?: string;
  defaultValue?: string;
  hint?: string;
  error?: string | null;
}) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        autoComplete={autoComplete}
        defaultValue={defaultValue}
        aria-invalid={error ? true : undefined}
        aria-describedby={[errorId, hintId].filter(Boolean).join(" ") || undefined}
        className={`mt-1.5 h-11 w-full rounded-md border bg-surface px-3 text-[0.9375rem] focus:border-ink-900 ${
          error ? "border-danger" : "border-rule-strong"
        }`}
      />
      {hint ? (
        <p id={hintId} className="mt-1.5 text-xs text-ink-600">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="mt-1 text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/**
 * A reviewer should be able to reach checkout without inventing an account.
 * The button fills the form rather than signing in directly, so what happens
 * next is the same flow anyone else goes through.
 */
function DemoAccount() {
  function fill() {
    // Scoped to the auth form by id: the header's search box is also a <form>,
    // and it comes first in the document.
    const form = document.getElementById("auth-form") as HTMLFormElement | null;
    const email = form?.querySelector<HTMLInputElement>("#email");
    const password = form?.querySelector<HTMLInputElement>("#password");
    if (email) email.value = DEMO_EMAIL;
    if (password) password.value = DEMO_PASSWORD;
    password?.focus();
  }

  return (
    // A ticket, not a banner: dashed edge, credentials in mono.
    <div className="border border-dashed border-rule-strong bg-surface p-4 text-sm">
      <p className="eyebrow text-ink-900">Just looking?</p>
      <p className="mt-2 text-ink-600">Use the demo account:</p>
      <p className="mt-1 font-mono text-[0.8125rem] break-all text-ink-900">
        <span>{DEMO_EMAIL}</span> / <span>{DEMO_PASSWORD}</span>
      </p>
      <button
        type="button"
        onClick={fill}
        className={buttonClass({ variant: "secondary", size: "sm", className: "mt-3" })}
      >
        Use demo account
      </button>
    </div>
  );
}
