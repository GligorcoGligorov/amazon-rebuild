"use client";

import { useActionState } from "react";
import { saveAddressAction, type AddressFormState } from "@/lib/actions/checkout";

const initial: AddressFormState = {};

export function AddressForm() {
  const [state, formAction, pending] = useActionState(saveAddressAction, initial);
  const errorFor = (field: AddressFormState["field"]) =>
    state.error && state.field === field ? state.error : null;

  return (
    <form id="address-form" action={formAction} className="flex flex-col gap-4" noValidate>
      <Field
        id="fullName"
        label="Full name"
        autoComplete="name"
        defaultValue={state.values?.fullName}
        error={errorFor("fullName")}
      />
      <Field
        id="line1"
        label="Street address"
        autoComplete="address-line1"
        defaultValue={state.values?.line1}
        error={errorFor("line1")}
      />
      <Field
        id="line2"
        label="Apartment, suite (optional)"
        autoComplete="address-line2"
        defaultValue={state.values?.line2}
        error={null}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field
          id="city"
          label="City"
          autoComplete="address-level2"
          defaultValue={state.values?.city}
          error={errorFor("city")}
        />
        <Field
          id="region"
          label="State"
          autoComplete="address-level1"
          defaultValue={state.values?.region}
          error={errorFor("region")}
        />
        <Field
          id="postalCode"
          label="ZIP code"
          autoComplete="postal-code"
          defaultValue={state.values?.postalCode}
          error={errorFor("postalCode")}
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="mt-1 rounded-md bg-accent px-6 py-3 text-sm font-semibold text-accent-ink hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60 sm:self-start"
      >
        {pending ? "Saving…" : "Deliver to this address"}
      </button>
    </form>
  );
}

function Field({
  id,
  label,
  autoComplete,
  defaultValue,
  error,
}: {
  id: string;
  label: string;
  autoComplete: string;
  defaultValue?: string;
  error: string | null;
}) {
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type="text"
        autoComplete={autoComplete}
        defaultValue={defaultValue}
        aria-invalid={error ? true : undefined}
        aria-describedby={errorId}
        className={`mt-1 w-full rounded-md border px-3 py-2 text-sm ${
          error ? "border-danger" : "border-border"
        }`}
      />
      {error ? (
        <p id={errorId} role="alert" className="mt-1 text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
