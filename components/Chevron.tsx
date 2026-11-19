/** Open/close arrow for <details> summaries. Drawn as SVG so it looks the same on every device's fonts. */
export function Chevron() {
  return (
    <svg aria-hidden viewBox="0 0 20 20" className="mt-1 size-5 shrink-0 text-brand transition-transform group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 7.5l5 5 5-5" />
    </svg>
  );
}
