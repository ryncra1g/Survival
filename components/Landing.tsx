import type { ReactNode } from "react";
import { sampleSummary } from "@/lib/plan/sampleSummary";

const CHAPTER_CARDS = [
  { id: "do-now", title: "Do now", outcome: "Your first steps this week, in order, and a Day 0 checklist for when it happens." },
  { id: "supplies", title: "Supplies", outcome: "How much water and food to keep, worked out for your household, and what to buy first." },
  { id: "power-heat", title: "Power & heat", outcome: "Staying warm and powered in an outage, with generator and CO safety." },
  { id: "people-plans", title: "People & plans", outcome: "Kids, pets, medical needs, contacts and when you must leave." },
] as const;

function ChapterIcon({ id }: { id: (typeof CHAPTER_CARDS)[number]["id"] }) {
  const d = {
    "do-now": "M9 11l3 3 8-8M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9",
    supplies: "M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z",
    "power-heat": "M13 2L4 14h7l-1 8 9-12h-7l1-8z",
    "people-plans": "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8",
  }[id];
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

/** Front page, shared by the app and the standalone demo. */
export function Landing({ cta, footer, sampleLink }: { cta: ReactNode; footer?: ReactNode; sampleLink?: ReactNode }) {
  const sample = sampleSummary();
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:py-14">
      {/* LP-02: no eyebrow line. LP-03 / LP-04: owner's headline direction (working copy). */}
      <h1 className="text-[2.1rem] sm:text-6xl font-bold leading-tight text-balance">Get what you need. Know what to do.</h1>
      <p className="mt-3 sm:text-lg text-muted max-w-2xl">Take the guesswork out of getting prepared. Know what to keep on hand, what to do first and how to stay ready.</p>
      <div className="mt-6 flex flex-col sm:flex-row sm:items-center gap-3">
        {cta}
        {sampleLink}
      </div>
      {/* DA-9: in the first five seconds, how long it takes and what you leave with. */}
      <p className="mt-3 text-sm text-muted">About 5 minutes. Free, no sign-up. You&apos;ll get a short list of what to do first, with every amount worked out for your household.</p>

      <section aria-labelledby="how-h" className="mt-10">
        <h2 id="how-h" className="text-xl font-bold">How it works</h2>
        <ol className="mt-3 grid gap-3 sm:grid-cols-3">
          {[
            ["About 5 minutes of questions", "Your ZIP, who lives with you, your home, heat, water and budget. No sign-up."],
            ["Get your plan right away", "Amounts worked out for your household, with the math shown, plus a week-by-week checklist and steps for your area's hazards."],
            ["Buy only what you're missing", "A shopping list in priority order that skips what you already have and fits your budget, from Essential to Premium."],
          ].map(([t, d], i) => (
            <li key={t} className="card p-4">
              <p className="text-sm font-semibold text-brand">Step {i + 1}</p>
              <p className="font-semibold">{t}</p>
              <p className="mt-1 text-sm text-muted">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* D10 / LP-06: four chapter cards with example values from the real engine (sample household). */}
      <section aria-labelledby="whats-h" className="mt-10">
        <h2 id="whats-h" className="text-xl font-bold">What&apos;s in your plan</h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2" data-testid="chapter-cards">
          {CHAPTER_CARDS.map((c) => (
            <li key={c.id} className="card p-4">
              <p className="flex items-center gap-2 font-semibold text-brand">
                <ChapterIcon id={c.id} />
                {c.title}
              </p>
              <p className="mt-1">{c.outcome}</p>
              <ul className="mt-2 flex flex-wrap gap-1.5 text-sm tabular" aria-label={`${c.title}: examples`}>
                {sample.chapters[c.id].slice(0, 3).map((v) => (
                  <li key={v} className="rounded-full bg-brand-soft px-2.5 py-1">{v}</li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-muted">Examples from a sample household: {sample.household}.</p>
      </section>

      <p className="mt-10 text-sm text-muted">
        Based on guidance from Ready.gov, FEMA, the CDC, the American Red Cross and the EPA. It&apos;s free: we may earn a small commission if you buy through our links,
        at no extra cost to you. Recommendations come from the specs and your budget, not from commissions. {footer}
      </p>
    </div>
  );
}
