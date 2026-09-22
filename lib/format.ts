const priceFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

/** Money is integer cents everywhere. Format only at the render edge. */
export function formatPrice(cents: number): string {
  return priceFormatter.format(cents / 100);
}

/** Ratings are stored ×100 — 283 is 2.83 stars. */
export function formatRating(rating: number | null): string | null {
  return rating === null ? null : (rating / 100).toFixed(1);
}

/** "Size" → "size", so option labels can become URL params. */
export function optionParam(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}
