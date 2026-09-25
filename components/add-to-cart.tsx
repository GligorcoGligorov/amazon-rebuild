"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import {
  addToCart,
  addToCartAction,
  type CartActionResult,
} from "@/lib/actions/cart";
import { catalogueNo, formatPrice } from "@/lib/format";
import { buttonClass } from "./ui/button";
import { Receipt, ReceiptLine } from "./ui/receipt";

type Props = {
  variantId: string;
  priceCents: number;
  inStock: boolean;
  label?: string;
  /** The grid uses a quieter outline button; clay is for the product page. */
  variant?: "primary" | "secondary";
  size?: "md" | "sm";
  /** The product's slug, so the receipt can print its catalogue number. */
  slug?: string;
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
  variant = "primary",
  size = "md",
  slug,
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
          className={buttonClass({ variant, size, className: `w-full ${className}` })}
        >
          {!inStock ? "Out of stock" : pending ? "Adding…" : label}
        </button>
      </form>

      <AddedDrawer result={result} priceCents={priceCents} slug={slug} onClose={close} />
    </>
  );
}

function AddedDrawer({
  result,
  priceCents,
  slug,
  onClose,
}: {
  result: CartActionResult | null;
  priceCents: number;
  slug?: string;
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

  const no = slug ? catalogueNo(slug) : null;

  // D36's signature: the confirmation is a receipt. A bottom sheet with a torn
  // top edge on mobile; a receipt laid on the page in a side panel from 640px.
  //
  // Portalled to <body>: the buttons that open it live inside sticky elements
  // (the mobile buy bar, the desktop buying column), and a sticky element is a
  // stacking context — rendered in place, the drawer's z-index is trapped
  // beneath the sticky header, which then covers its top edge and Close button.
  return createPortal(
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-ink-900/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="added-title"
        className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto sm:inset-y-0 sm:right-0 sm:left-auto sm:max-h-none sm:w-[26rem] sm:border-l sm:border-ink-900 sm:bg-page sm:px-6 sm:pt-6"
      >
        <Receipt>
          <div className="flex items-center justify-between gap-4">
            <h2 id="added-title" className="eyebrow flex items-center gap-2 text-ink-900">
              {result.ok ? (
                <>
                  <span aria-hidden="true" className="size-2 rounded-full bg-success" />
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
              className="-mr-2 flex size-11 shrink-0 items-center justify-center text-ink-600 hover:text-ink-900"
            >
              <span aria-hidden="true">✕</span>
              <span className="sr-only">Close</span>
            </button>
          </div>

          {result.ok ? (
            <>
              <div className="mt-3 flex gap-4">
                <div className="relative size-20 shrink-0 bg-well">
                  <Image
                    src={result.image}
                    alt=""
                    fill
                    sizes="80px"
                    className="object-contain p-2"
                  />
                </div>
                <div className="min-w-0">
                  {no ? <p className="eyebrow">{no}</p> : null}
                  <p className="text-[0.9375rem] leading-snug font-medium">{result.title}</p>
                  {result.optionSummary ? (
                    <p className="mt-0.5 text-sm text-ink-600">{result.optionSummary}</p>
                  ) : null}
                </div>
              </div>

              <div className="mt-5 space-y-2 border-t border-dashed border-rule-strong pt-4">
                <ReceiptLine label="Item" value={formatPrice(priceCents)} />
                <ReceiptLine label="Shipping" value="--" />
                <ReceiptLine
                  label="Tax"
                  value="--"
                  note="Both are worked out at checkout, once there is an address."
                />
              </div>

              {/* Both next steps, on every width (D8), and a way back. */}
              <div className="mt-6 grid gap-2">
                <Link href="/checkout" className={buttonClass()}>
                  Checkout
                </Link>
                <Link href="/cart" className={buttonClass({ variant: "secondary" })}>
                  View cart
                </Link>
                <button
                  type="button"
                  onClick={onClose}
                  className={buttonClass({ variant: "quiet", className: "min-h-11 self-center text-sm" })}
                >
                  Keep shopping
                </button>
              </div>

              <p className="eyebrow mt-4 flex justify-between border-t border-dashed border-rule-strong pt-3">
                <span>Almanac</span>
                <span>{stamp()}</span>
              </p>
            </>
          ) : (
            <>
              <p className="mt-3 text-sm text-ink-600">{result.error}</p>
              <button
                type="button"
                onClick={onClose}
                className={buttonClass({ variant: "secondary", className: "mt-6 w-full" })}
              >
                Close
              </button>
            </>
          )}
        </Receipt>
      </div>
    </div>,
    document.body,
  );
}

/** "25 SEP 2026 · 14:02" — printed at the foot, like a till receipt. */
function stamp() {
  const now = new Date();
  const months = "JAN FEB MAR APR MAY JUN JUL AUG SEP OCT NOV DEC".split(" ");
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(now.getDate())} ${months[now.getMonth()]} ${now.getFullYear()} · ${pad(now.getHours())}:${pad(now.getMinutes())}`;
}
