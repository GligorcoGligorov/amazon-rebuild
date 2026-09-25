/**
 * Almanac's signature surface (D36): the cart drawer, the checkout summary and
 * order totals are set as a receipt — a torn top edge and dotted leaders
 * running from each label to its figure. An unknown figure is `--` on a
 * leader, which reads as a line still to be filled in (D11).
 */
export function Receipt({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <div aria-hidden="true" className="perforation h-2" />
      <div className="bg-surface px-5 pb-5 pt-4">{children}</div>
    </div>
  );
}

export function ReceiptLine({
  label,
  value,
  strong = false,
  note,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  strong?: boolean;
  note?: string;
}) {
  return (
    <div className={strong ? "text-base font-semibold" : "text-sm"}>
      <div className="flex items-baseline gap-2">
        <span className={strong ? "" : "text-ink-600"}>{label}</span>
        <span aria-hidden="true" className="min-w-4 flex-1 translate-y-[-0.2em] border-b border-dotted border-rule-strong" />
        <span className="font-mono tabular-nums">{value}</span>
      </div>
      {note ? <p className="mt-0.5 text-xs text-ink-400">{note}</p> : null}
    </div>
  );
}
