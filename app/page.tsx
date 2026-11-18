import Link from "next/link";
import { StartButton } from "@/components/StartButton";

export default function Home() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:py-20">
      <h1 className="text-3xl sm:text-5xl font-bold leading-tight text-balance">Your family&apos;s emergency plan and supply list, built for your home in 5 minutes.</h1>
      <p className="mt-4 text-lg text-muted">Tap through a few questions. Get exactly how much water, food and fuel your household needs, and what to do first.</p>
      <div className="mt-8 flex flex-col sm:flex-row sm:items-center gap-4">
        <StartButton />
        <span className="text-sm text-muted">Free · No account · Takes about 5 minutes</span>
      </div>
      <ul className="mt-10 space-y-3">
        {[
          "Exact amounts for your household: gallons, pounds, diapers, fuel",
          "A week-by-week checklist that fits your budget",
          "Steps for your area's hazards, with generator and CO safety built in",
        ].map((t) => (
          <li key={t} className="flex gap-3"><span aria-hidden className="text-brand font-bold">✓</span><span>{t}</span></li>
        ))}
      </ul>
      <p className="mt-10 text-sm text-muted">Based on guidance from Ready.gov, FEMA, the CDC and the Red Cross. <Link href="/account" className="underline">Already have a plan?</Link></p>
    </div>
  );
}
