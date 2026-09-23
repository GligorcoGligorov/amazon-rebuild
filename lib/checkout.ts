import type { Address } from "@/lib/db/schema";

export const CHECKOUT_STEPS = ["address", "delivery", "payment", "review"] as const;
export type CheckoutStep = (typeof CHECKOUT_STEPS)[number];

export function isCheckoutStep(value: string | undefined): value is CheckoutStep {
  return value !== undefined && (CHECKOUT_STEPS as readonly string[]).includes(value);
}

export const STEP_LABELS: Record<CheckoutStep, string> = {
  address: "Delivery address",
  delivery: "Delivery speed",
  payment: "Payment method",
  review: "Review and place order",
};

export type DeliveryMethod = "standard" | "express";

/**
 * Flat-rate delivery and tax, stated as such in the UI. A real rate engine and
 * a tax API are both on the cut list — inventing numbers and calling them
 * "estimated" would be worse than saying plainly what the rule is.
 */
export const FREE_SHIPPING_THRESHOLD_CENTS = 3500;
export const TAX_RATE = 0.08;

export const DELIVERY_OPTIONS: {
  id: DeliveryMethod;
  label: string;
  description: string;
  costCents: number;
  businessDays: number;
}[] = [
  {
    id: "standard",
    label: "Standard",
    description: "Free on orders over $35",
    costCents: 499,
    businessDays: 5,
  },
  {
    id: "express",
    label: "Express",
    description: "Priority handling",
    costCents: 1299,
    businessDays: 2,
  },
];

export function isDeliveryMethod(value: string | undefined): value is DeliveryMethod {
  return value === "standard" || value === "express";
}

export function shippingCentsFor(
  method: DeliveryMethod,
  subtotalCents: number,
): number {
  const option = DELIVERY_OPTIONS.find((o) => o.id === method)!;
  if (method === "standard" && subtotalCents >= FREE_SHIPPING_THRESHOLD_CENTS) {
    return 0;
  }
  return option.costCents;
}

export function taxCentsFor(subtotalCents: number): number {
  return Math.round(subtotalCents * TAX_RATE);
}

/** A weekday-only delivery estimate, so "in 2 days" never lands on a Sunday. */
export function deliveryEta(method: DeliveryMethod, from = new Date()): string {
  const option = DELIVERY_OPTIONS.find((o) => o.id === method)!;
  const date = new Date(from);
  let remaining = option.businessDays;
  while (remaining > 0) {
    date.setDate(date.getDate() + 1);
    const day = date.getDay();
    if (day !== 0 && day !== 6) remaining -= 1;
  }
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

/**
 * The order summary. `null` means "not knowable yet" and renders as `--`,
 * which is the whole point of D11: shipping and tax genuinely cannot be
 * computed before the destination is known, and a placeholder beats a number
 * that silently changes later.
 */
export type OrderTotals = {
  subtotalCents: number;
  shippingCents: number | null;
  taxCents: number | null;
  totalCents: number;
};

export function totalsFor(
  subtotalCents: number,
  address: Address | null,
  method: DeliveryMethod | null,
): OrderTotals {
  if (!address) {
    return { subtotalCents, shippingCents: null, taxCents: null, totalCents: subtotalCents };
  }
  const tax = taxCentsFor(subtotalCents);
  // Before a speed is chosen we know tax but not carriage.
  if (!method) {
    return {
      subtotalCents,
      shippingCents: null,
      taxCents: tax,
      totalCents: subtotalCents + tax,
    };
  }
  const shipping = shippingCentsFor(method, subtotalCents);
  return {
    subtotalCents,
    shippingCents: shipping,
    taxCents: tax,
    totalCents: subtotalCents + shipping + tax,
  };
}

export function formatAddress(address: Address): string {
  return [
    address.line1,
    address.line2,
    `${address.city}, ${address.region} ${address.postalCode}`,
    address.country,
  ]
    .filter(Boolean)
    .join(", ");
}

/** Unambiguous characters only — this gets read aloud and typed into support. */
export function generateOrderNumber(): string {
  const alphabet = "ACDEFGHJKLMNPQRTUVWXY3456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `8X-${code}`;
}

/** The single demo payment method. We never collect card details — see D31. */
export const DEMO_PAYMENT_LABEL = "Demo card ending 4242";
