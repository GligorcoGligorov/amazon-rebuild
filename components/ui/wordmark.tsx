/**
 * The store name as set type. A plain inline element: the anchors around it
 * must not become flex containers, or Chrome splits the accessible name (M7).
 */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-display text-[1.75rem] leading-none tracking-tight ${className}`}>
      Almanac
    </span>
  );
}
