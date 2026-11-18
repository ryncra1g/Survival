import type { ReactNode } from "react";

/** Front page copy, shared by the app and the standalone demo. */
export function Landing({ cta, footer }: { cta: ReactNode; footer?: ReactNode }) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:py-16">
      <h1 className="text-[1.75rem] sm:text-5xl font-bold leading-tight text-balance">Your family&apos;s emergency plan and supply list, built for your home in 5 minutes.</h1>
      <p className="mt-3 sm:mt-4 sm:text-lg text-muted">Tap through a few questions. Get exactly how much water, food and fuel your household needs, and what to do first.</p>
      <div className="mt-7 flex flex-col sm:flex-row sm:items-center gap-3">
        {cta}
        <span className="text-sm text-muted text-center sm:text-left">Free · No sign-up · About 5 minutes</span>
      </div>
      <ul className="mt-10 space-y-3">
        {[
          "Exact amounts for your household: gallons, pounds, diapers, fuel",
          "A week-by-week checklist and shopping list that fit your budget",
          "Steps for your area's hazards, with generator and CO safety built in",
          "Optional: a printable PDF and fridge checklist by email",
        ].map((t) => (
          <li key={t} className="flex gap-3"><span aria-hidden className="text-brand font-bold">✓</span><span>{t}</span></li>
        ))}
      </ul>
      <p className="mt-10 text-sm text-muted">Based on guidance from Ready.gov, FEMA, the CDC, the American Red Cross and the EPA. {footer}</p>
    </div>
  );
}
