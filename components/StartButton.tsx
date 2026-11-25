/**
 * Plain form POST: starts a plan with no email and no JavaScript required. `onStart` replaces it in the demo.
 * `secondary` (DA-7): a page has one amber button (docs/DESIGN.md C5); a second way to start is a plain button.
 */
export function StartButton({ label = "Build my free plan", onStart, small = false, secondary = false }: { label?: string; onStart?: () => void; small?: boolean; secondary?: boolean }) {
  const base = secondary ? "btn-ghost" : "btn";
  const cls = small ? `${base} shrink-0 whitespace-nowrap px-4 text-base` : `${base} w-full sm:w-auto text-lg px-8`;
  if (onStart)
    return (
      <button type="button" className={cls} onClick={onStart}>
        {label}
      </button>
    );
  return (
    <form action="/api/start" method="post">
      <button className={cls}>{label}</button>
    </form>
  );
}
