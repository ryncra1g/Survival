/**
 * Visual calm pass (item 6): two small inline illustrations, home-themed and abstract. No disaster imagery, no faces.
 * Colors come from the theme tokens, so they follow light and dark mode. Decorative: hidden from screen readers.
 */

/** Front page: a small house with a warm lit window, a checklist and a water jug, on a soft round ground. */
export function HomeIllustration({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 240 180" className={className} data-testid="home-illustration">
      <ellipse cx="120" cy="160" rx="110" ry="14" fill="var(--brand-soft)" />
      {/* house */}
      <path d="M52 92 L110 46 L168 92" fill="none" stroke="var(--brand)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="64" y="88" width="92" height="70" rx="6" fill="var(--surface)" stroke="var(--brand)" strokeWidth="4" />
      <rect x="78" y="104" width="26" height="24" rx="3" fill="var(--accent)" opacity="0.9" />
      <path d="M91 104 V128 M78 116 H104" stroke="var(--surface)" strokeWidth="2.5" />
      <rect x="118" y="114" width="24" height="44" rx="3" fill="var(--brand-soft)" stroke="var(--brand)" strokeWidth="3" />
      <circle cx="137" cy="137" r="2.2" fill="var(--brand)" />
      <rect x="140" y="56" width="12" height="24" rx="2" fill="var(--brand)" />
      {/* checklist */}
      <rect x="176" y="96" width="44" height="58" rx="6" fill="var(--surface)" stroke="var(--brand)" strokeWidth="3" />
      <path d="M184 111 l4 4 l7 -8 M184 127 l4 4 l7 -8" fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M200 112 H212 M200 128 H212 M186 143 H212" stroke="var(--brand)" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
      {/* water jug */}
      <path d="M22 124 h18 a4 4 0 0 1 4 4 v26 a4 4 0 0 1 -4 4 h-18 a4 4 0 0 1 -4 -4 v-26 a4 4 0 0 1 4 -4 z" fill="var(--brand-soft)" stroke="var(--brand)" strokeWidth="3" />
      <path d="M26 124 v-6 h10 v6" fill="none" stroke="var(--brand)" strokeWidth="3" strokeLinejoin="round" />
      <path d="M22 140 h22" stroke="var(--brand)" strokeWidth="2" opacity="0.5" />
    </svg>
  );
}

/** "Your plan is ready": a round mark with a small house and a tick. */
export function ReadyMark({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 56 56" className={className} data-testid="ready-mark">
      <circle cx="28" cy="28" r="27" fill="var(--brand-soft)" />
      <path d="M15 28 L28 17 L41 28" fill="none" stroke="var(--brand)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M19 26 V40 H37 V26" fill="var(--surface)" stroke="var(--brand)" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M23 33 l4 4 l7 -8" fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
