/** Plain form POST: starts a plan without JavaScript or an email. */
export function StartButton({ label = "Build my free plan", className = "btn text-lg" }: { label?: string; className?: string }) {
  return (
    <form action="/api/start" method="post">
      <button className={className}>{label}</button>
    </form>
  );
}
