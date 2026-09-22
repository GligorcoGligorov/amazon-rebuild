"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  addToCart,
  addToCartAction,
  type CartActionResult,
} from "@/lib/actions/cart";
import { formatPrice } from "@/lib/format";

type Props = {
  variantId: string;
  priceCents: number;
  inStock: boolean;
  label?: string;
  className?: string;
};

/**
 * D8: adding never leaves the page. Amazon navigates to a full interstitial
 * carrying two sponsored carousels and a credit-card advert — and on mobile it
 * omits a checkout button entirely, so the fastest path to buying is a dead
 * end. This opens a drawer and keeps the shopper where they were.
 *
 * Without JavaScript this still posts a normal form to a Server Action; the
 * drawer is the enhancement, not the mechanism.
 */
export function AddToCartButton({
  variantId,
  priceCents,
  inStock,
  label = "Add to cart",
  className = "",
}: Props) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<CartActionResult | null>(null);
  const router = useRouter();
  const buttonRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => setResult(null), []);

  // Focus returns to the trigger after the drawer closes, in an effect so it
  // runs once React has committed. Two things make the obvious version wrong:
  // storing the element itself does not survive the router.refresh() below
  // (React replaces the node, and focusing a detached one silently does
  // nothing), and focusing synchronously inside the close handler happens
  // before the re-render that removes the drawer.
  const wasOpen = useRef(false);
  useEffect(() => {
    if (result) {
      wasOpen.current = true;
      return;
    }
    // Wait for the router.refresh() transition to settle. Restoring focus
    // before it lands gets clobbered — the re-render drops focus to <body> —
    // and a fixed timeout only hides that on a fast machine.
    if (wasOpen.current && !pending) {
      wasOpen.current = false;
      buttonRef.current?.focus();
    }
  }, [result, pending]);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      const res = await addToCart(variantId, 1);
      setResult(res);
      // Refresh so the header badge and any cart view pick up the change.
      router.refresh();
    });
  }

  return (
    <>
      {/* Without JavaScript this posts to the Server Action and the page
          re-renders with the item in the cart. With it, onSubmit takes over and
          opens the drawer instead — the drawer is the enhancement, not the
          mechanism. */}
      <form action={addToCartAction} onSubmit={onSubmit}>
        <input type="hidden" name="variantId" value={variantId} />
        <input type="hidden" name="quantity" value={1} />
        <button
          ref={buttonRef}
          type="submit"
          disabled={!inStock || pending}
          className={`w-full rounded-md bg-accent px-6 py-3 text-sm font-semibold text-accent-ink transition-opacity hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
        >
          {!inStock ? "Out of stock" : pending ? "Adding…" : label}
        </button>
      </form>

      <AddedDrawer result={result} priceCents={priceCents} onClose={close} />
    </>
  );
}

function AddedDrawer({
  result,
  priceCents,
  onClose,
}: {
  result: CartActionResult | null;
  priceCents: number;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!result) return;

    closeRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab") return;

      // Focus trap: the drawer is a dialog, so Tab must not escape behind it.
      const focusables = panelRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusables?.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [result, onClose]);

  if (!result) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="added-title"
        className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-xl bg-surface p-5 shadow-xl sm:inset-y-0 sm:left-auto sm:right-0 sm:w-96 sm:max-h-none sm:rounded-none sm:rounded-l-xl"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id="added-title" className="text-lg font-semibold">
            {result.ok ? (
              <>
                <span aria-hidden="true" className="text-success">
                  ✓
                </span>{" "}
                Added to cart
              </>
            ) : (
              "Could not add"
            )}
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="-m-2 shrink-0 rounded-md p-2 text-ink-600 hover:text-ink-900"
          >
            <span aria-hidden="true">✕</span>
            <span className="sr-only">Close</span>
          </button>
        </div>

        {result.ok ? (
          <>
            <div className="mt-4 flex gap-3">
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md border border-border bg-surface-sunken">
                <Image
                  src={result.image}
                  alt=""
                  fill
                  sizes="80px"
                  className="object-contain p-1"
                />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium">{result.title}</p>
                {result.optionSummary ? (
                  <p className="mt-0.5 text-sm text-ink-600">{result.optionSummary}</p>
                ) : null}
                <p className="mt-1 text-sm font-semibold">{formatPrice(priceCents)}</p>
              </div>
            </div>

            {/* Both next steps, on every width. Amazon's mobile version offers
                no checkout button at all. */}
            <div className="mt-6 flex flex-col gap-2">
              <Link
                href="/cart"
                className="rounded-md bg-accent px-4 py-3 text-center text-sm font-semibold text-accent-ink hover:bg-accent-hover"
              >
                View cart
              </Link>
              <Link
                href="/checkout"
                className="rounded-md border border-ink-900 px-4 py-3 text-center text-sm font-semibold hover:bg-surface-sunken"
              >
                Checkout
              </Link>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-center text-sm text-ink-600 underline underline-offset-2"
              >
                Keep shopping
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="mt-3 text-sm text-ink-600">{result.error}</p>
            <button
              type="button"
              onClick={onClose}
              className="mt-6 w-full rounded-md border border-border px-4 py-3 text-sm font-semibold hover:border-ink-400"
            >
              Close
            </button>
          </>
        )}
      </div>
    </div>
  );
}
