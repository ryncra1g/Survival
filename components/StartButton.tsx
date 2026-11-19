/** Plain form POST: starts a plan with no email and no JavaScript required. `onStart` replaces it in the demo. */
export function StartButton({ label = "Build my free plan", onStart, small = false }: { label?: string; onStart?: () => void; small?: boolean }) {
  const cls = small ? "btn shrink-0 whitespace-nowrap px-4 text-base" : "btn w-full sm:w-auto text-lg px-8";
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
