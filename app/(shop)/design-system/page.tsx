import type { Metadata } from "next";
import Image from "next/image";
import { getFeaturedProducts } from "@/lib/db/queries/catalog";
import { ProductCard } from "@/components/product-card";
import { buttonClass } from "@/components/ui/button";
import { CatalogueNo } from "@/components/ui/catalogue-no";
import { Price } from "@/components/ui/price";
import { Receipt, ReceiptLine } from "@/components/ui/receipt";
import { formatPrice } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Design system",
  robots: { index: false },
};

/*
 * A living reference for D36: every swatch, specimen and component on this
 * page is the real token or component, not a picture of it. Unlinked from the
 * store's navigation; it exists for reviewers and for the next session.
 */

const SWATCHES = [
  ["Ink 900", "#141413", "Text, rules that divide sections, the ink button", true],
  ["Ink 600", "#5c5b57", "Secondary text", true],
  ["Ink 400", "#6a6863", "Meta: brands, counts, strike-through prices", true],
  ["Page", "#fafaf8", "Everything sits on it", false],
  ["Surface", "#ffffff", "Inputs, receipts, the drawer", false],
  ["Well", "#f0efeb", "Behind every product photo, in every category", false],
  ["Rule", "#e3e1dc", "Hairlines between rows", false],
  ["Rule strong", "#c9c6bf", "Input borders, receipt leaders", false],
  ["Clay", "#c4411b", "Buy, and only buy", true],
  ["Clay dark", "#a3351a", "Links, focus ring, clay hover", true],
  ["Moss", "#2f6a3e", "In stock, success", true],
  ["Crimson", "#a61b29", "Errors — kept apart from clay", true],
] as const;

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast of a colour against the page, computed rather than claimed. */
function contrastOnPage(hex: string) {
  const [a, b] = [luminance(hex), luminance("#fafaf8")];
  return ((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)).toFixed(1);
}

function Section({
  no,
  title,
  children,
}: {
  no: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-16 sm:mt-24" aria-labelledby={`ds-${no}`}>
      <div className="flex items-baseline gap-4 border-b border-ink-900 pb-3">
        <span aria-hidden="true" className="font-mono text-xs text-ink-400">
          {no}
        </span>
        <h2 id={`ds-${no}`} className="font-display text-3xl leading-none sm:text-4xl">
          {title}
        </h2>
      </div>
      <div className="pt-6">{children}</div>
    </section>
  );
}

export default async function DesignSystemPage() {
  const products = await getFeaturedProducts(4);
  const sample = products[0];
  const itemCents = sample?.minPriceCents ?? 0;

  return (
    <div className="mx-auto max-w-7xl px-4 pt-8 pb-8 sm:px-6 sm:pt-14">
      <p className="eyebrow">Almanac · Design system · Vol. 01</p>
      <h1 className="mt-3 font-display text-5xl leading-[0.95] tracking-[-0.02em] sm:text-8xl">
        A catalogue, <em>set</em> for screens.
      </h1>
      <p className="mt-6 max-w-xl text-ink-600 sm:text-lg">
        Print-inspired, not print-imitating. One neutral page, hairline rules
        instead of boxes and shadows, near-square corners, one clay accent kept
        for buying, and every number in mono.
      </p>

      <Section no="01" title="Colour">
        <ul className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
          {SWATCHES.map(([name, hex, role, isText]) => (
            <li key={hex}>
              <div
                className="h-20 border border-border sm:h-24"
                style={{ backgroundColor: hex }}
              />
              <p className="mt-2 text-sm font-medium">{name}</p>
              <p className="font-mono text-xs text-ink-600">
                {hex.toUpperCase()}
                {isText ? <> · {contrastOnPage(hex)}:1</> : null}
              </p>
              <p className="mt-1 text-xs text-ink-600">{role}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section no="02" title="Type">
        <div className="grid gap-10 lg:grid-cols-3">
          <div>
            <p className="eyebrow">Display · Instrument Serif</p>
            <p className="mt-3 font-display text-7xl leading-none">
              Aa <em>Aa</em>
            </p>
            <p className="mt-3 text-sm text-ink-600">
              Mastheads, section titles, department names. Never below 24px, never
              for body copy. Italic is the one flourish — used for emphasis and on
              hover in the index.
            </p>
          </div>
          <div>
            <p className="eyebrow">Text · Instrument Sans</p>
            <p className="mt-3 text-7xl leading-none font-medium tracking-tight">Aa</p>
            <p className="mt-3 text-sm text-ink-600">
              Everything read or clicked: product titles, descriptions, forms,
              buttons. 15–16px body, 500 for titles and controls.
            </p>
          </div>
          <div>
            <p className="eyebrow">Figures · Geist Mono</p>
            <p className="mt-3 font-mono text-7xl leading-none tracking-tight">0123</p>
            <p className="mt-3 text-sm text-ink-600">
              Every number a shopper compares: prices, totals, quantities,
              counts, catalogue and order numbers. Figures line up in columns.
            </p>
          </div>
        </div>

        <dl className="mt-12 divide-y divide-border border-y border-border">
          {[
            ["Display XL", "font-display text-[3.25rem] sm:text-8xl leading-[0.95]", "Everyday goods"],
            ["Display L", "font-display text-4xl sm:text-5xl leading-none", "Shop by category"],
            ["Display M", "font-display text-2xl sm:text-[1.75rem] leading-tight", "Men's Watches"],
            ["Title", "text-[0.9375rem] font-medium", "Apple MacBook Pro 14 Inch Space Grey"],
            ["Body", "text-base text-ink-600", "Each size, colour and storage tier carries its own price."],
            ["Eyebrow", "eyebrow", "Selected by rating"],
          ].map(([label, cls, text]) => (
            <div key={label} className="grid gap-1 py-4 sm:grid-cols-[10rem_1fr] sm:items-baseline">
              <dt className="eyebrow">{label}</dt>
              <dd className={`${cls} truncate`}>{text}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section no="03" title="Numbers">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="eyebrow">Price</p>
            <Price cents={129999} className="mt-2 text-3xl" />
          </div>
          <div>
            <p className="eyebrow">Range and sale</p>
            <p className="mt-2 flex flex-col gap-1 text-xl">
              <Price cents={2499} from />
              <Price cents={1999} compareAt={2499} />
            </p>
          </div>
          <div>
            <p className="eyebrow">Catalogue number</p>
            <p className="mt-2 flex flex-col gap-1">
              <CatalogueNo slug="apple-macbook-pro-14-inch-space-grey-78" className="text-ink-900" />
              <span className="text-sm text-ink-600">
                Read off the product slug — display only, no schema change.
              </span>
            </p>
          </div>
          <div>
            <p className="eyebrow">Not yet known</p>
            <p className="mt-2 font-mono text-3xl">--</p>
            <p className="text-sm text-ink-600">Shipping and tax before an address.</p>
          </div>
        </div>
      </Section>

      <Section no="04" title="Space, rules, corners">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <p className="eyebrow">8px base · generous vertical rhythm</p>
            <ul className="mt-4 space-y-2">
              {[4, 8, 12, 16, 24, 32, 48, 64, 96].map((px) => (
                <li key={px} className="flex items-center gap-3">
                  <span className="w-8 font-mono text-xs text-ink-600">{px}</span>
                  <span className="h-2 bg-ink-900" style={{ width: px * 2 }} />
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-6">
            <div>
              <p className="eyebrow">Section rule · 1px ink</p>
              <div className="mt-3 border-t border-ink-900" />
            </div>
            <div>
              <p className="eyebrow">Row hairline · 1px rule</p>
              <div className="mt-3 border-t border-border" />
            </div>
            <div>
              <p className="eyebrow">Corners · 2px, pills never</p>
              <div className="mt-3 flex gap-3">
                <span className="size-16 rounded-md border border-ink-900" />
                <span className="size-16 rounded-md bg-well" />
                <span className="size-16 rounded-md bg-accent" />
              </div>
            </div>
            <div>
              <p className="eyebrow">Depth · none</p>
              <p className="mt-2 text-sm text-ink-600">
                No drop shadows. Structure comes from rules, the well and white
                space. The only overlay is the drawer&apos;s scrim.
              </p>
            </div>
          </div>
        </div>
      </Section>

      <Section no="05" title="Controls">
        <div className="grid gap-10 lg:grid-cols-2">
          <div className="space-y-6">
            <div>
              <p className="eyebrow">Buttons</p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button type="button" className={buttonClass()}>Add to cart</button>
                <button type="button" className={buttonClass({ variant: "ink" })}>Browse all goods</button>
                <button type="button" className={buttonClass({ variant: "secondary", size: "sm" })}>Add to cart</button>
                <button type="button" className={buttonClass({ variant: "quiet" })}>See all</button>
                <button type="button" disabled className={buttonClass({ size: "sm" })}>Out of stock</button>
              </div>
              <p className="mt-3 text-sm text-ink-600">
                Clay moves money forward. Ink navigates. Outline is the quiet add
                on a grid card. 48px tall, 40px for dense rows.
              </p>
            </div>
            <div>
              <p className="eyebrow">Options · preview</p>
              {/* Static preview of the variant selector's three states. */}
              <div className="mt-3 flex flex-wrap gap-2" aria-hidden="true">
                <span className="flex min-h-11 items-center border border-ink-900 bg-ink-900 px-4 font-mono text-sm text-white">
                  256 GB
                </span>
                <span className="flex min-h-11 items-center border border-rule-strong bg-surface px-4 font-mono text-sm">
                  512 GB
                </span>
                <span className="flex min-h-11 items-center border border-dashed border-rule-strong px-4 font-mono text-sm text-ink-400 line-through">
                  1 TB
                </span>
              </div>
              <p className="mt-3 text-sm text-ink-600">
                Selected, available, sold out — told apart by fill and strike, not
                colour alone.
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <label htmlFor="ds-email" className="text-sm font-medium">
                Email
              </label>
              <input
                id="ds-email"
                type="email"
                defaultValue="demo@8xstore.dev"
                className="mt-1.5 h-11 w-full rounded-md border border-rule-strong bg-surface px-3 text-[0.9375rem] focus:border-ink-900"
              />
            </div>
            <div>
              <label htmlFor="ds-postcode" className="text-sm font-medium">
                Postcode
              </label>
              <input
                id="ds-postcode"
                aria-invalid="true"
                aria-describedby="ds-postcode-error"
                defaultValue="12"
                className="mt-1.5 h-11 w-full rounded-md border border-danger bg-surface px-3 text-[0.9375rem]"
              />
              <p id="ds-postcode-error" className="mt-1.5 text-sm text-danger">
                Enter a full postcode.
              </p>
            </div>
          </div>
        </div>
      </Section>

      <Section no="06" title="Product card">
        <p className="mb-6 max-w-xl text-sm text-ink-600">
          No box and no shadow. The photo sits on the well — the same neutral for
          a laptop as for a dress — then the catalogue number, title, and a mono
          price.
        </p>
        <ul className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-4">
          {products.map((p) => (
            <li key={p.id}>
              <ProductCard product={p} />
            </li>
          ))}
        </ul>
      </Section>

      <Section no="07" title="The receipt">
        <div className="grid gap-10 lg:grid-cols-[1fr_24rem]">
          <p className="max-w-xl text-sm text-ink-600">
            The signature surface. The cart drawer, the checkout summary and every
            order total are set as a receipt: a torn top edge, dotted leaders from
            label to figure, and <span className="font-mono text-ink-900">--</span>{" "}
            on a leader where a figure cannot be known yet. Shown here on the
            drawer&apos;s scrim.
          </p>

          <div className="bg-ink-900/40 p-4 sm:p-6">
            <Receipt>
              <p className="eyebrow">Added to cart</p>
              {sample ? (
                <div className="mt-4 flex gap-3">
                  <div className="relative size-16 shrink-0 bg-well">
                    <Image src={sample.image} alt="" fill sizes="64px" className="object-contain p-1.5" />
                  </div>
                  <div className="min-w-0">
                    <CatalogueNo slug={sample.slug} />
                    <p className="text-sm leading-snug font-medium">{sample.title}</p>
                  </div>
                </div>
              ) : null}
              <div className="mt-5 space-y-2 border-t border-dashed border-rule-strong pt-4">
                <ReceiptLine label="Item" value={formatPrice(itemCents)} />
                <ReceiptLine label="Shipping" value="--" />
                <ReceiptLine label="Tax" value="--" />
                <ReceiptLine label="Subtotal · 1 item" value={formatPrice(itemCents)} strong />
              </div>
              <div className="mt-5 grid gap-2">
                <button type="button" className={buttonClass()}>Checkout</button>
                <button type="button" className={buttonClass({ variant: "secondary" })}>View cart</button>
              </div>
            </Receipt>
          </div>
        </div>
      </Section>
    </div>
  );
}
