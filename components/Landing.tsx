import type { ReactNode } from "react";

/** Front page copy, shared by the app and the standalone demo. */
export function Landing({ form, footer }: { form: ReactNode; footer?: ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:py-16">
      <h1 className="text-[1.75rem] sm:text-5xl font-bold leading-tight text-balance">Your family&apos;s emergency plan and supply list, built for your home in 5 minutes.</h1>
      <p className="mt-3 sm:mt-4 sm:text-lg text-muted">Tap through a few questions. Get exactly how much water, food and fuel your household needs, and what to do first.</p>
      <div className="mt-6 sm:mt-8 grid gap-8 sm:grid-cols-[1.1fr_1fr] sm:items-start">
        <div className="min-w-0">{form}</div>
        <ul className="space-y-3 sm:pt-2">
          {[
            "Exact amounts for your household: gallons, pounds, diapers, fuel",
            "A week-by-week checklist that fits your budget",
            "Steps for your area's hazards, with generator and CO safety built in",
            "A printable PDF and a fridge checklist",
          ].map((t) => (
            <li key={t} className="flex gap-3"><span aria-hidden className="text-brand font-bold">✓</span><span>{t}</span></li>
          ))}
        </ul>
      </div>
      <p className="mt-10 text-sm text-muted">Based on guidance from Ready.gov, FEMA, the CDC, the American Red Cross and the EPA. {footer}</p>
    </div>
  );
}
