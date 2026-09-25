/** The page header every Almanac page opens with: a mono kicker, a serif h1. */
export function PageTitle({
  eyebrow,
  children,
  className = "",
}: {
  eyebrow: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="mt-2 font-display text-5xl leading-none break-words sm:text-6xl">
        {children}
      </h1>
    </div>
  );
}
