import Link from "next/link";

export default function Home() {
  return (
    <div className="mx-auto max-w-3xl px-4">
      <section className="py-12 sm:py-16">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand">Free · about 5 minutes</p>
        <h1 className="mt-3 text-3xl sm:text-4xl font-bold leading-tight">Your family&apos;s emergency plan, built for your home in 5 minutes.</h1>
        <p className="mt-4 text-lg text-muted">Answer a few tap-to-select questions. Get exact water, food, fuel and gear amounts for your household, a step-by-step priority list, and a printable PDF.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/start" className="btn text-lg">Build my plan</Link>
          <Link href="/account" className="btn-ghost">I already have a plan</Link>
        </div>
      </section>

      <section aria-labelledby="what" className="grid gap-4 sm:grid-cols-3 pb-10">
        <h2 id="what" className="sr-only">What you get</h2>
        {[
          ["Real numbers", "Gallons of water, pounds of rice, diapers, generator fuel — calculated for your household, not a generic list."],
          ["Built for your home", "Your ZIP's hazards, your heat source, your well or city water, your pets and your budget."],
          ["Safety first", "Carbon-monoxide and generator safety are built in. We never give medication doses."],
        ].map(([t, d]) => (
          <div key={t} className="card p-5">
            <h3 className="font-semibold">{t}</h3>
            <p className="mt-2 text-sm text-muted">{d}</p>
          </div>
        ))}
      </section>

      <section aria-labelledby="trust" className="card p-6 mb-12">
        <h2 id="trust" className="text-xl font-semibold">Why you can trust it</h2>
        <ul className="mt-3 space-y-2 text-muted list-disc pl-5">
          <li>Based on guidance from Ready.gov, FEMA, the CDC, the American Red Cross and the EPA.</li>
          <li>Every quantity comes from transparent rules you can see in your plan — never guessed by AI.</li>
          <li>We ask for your ZIP code only — no street address, no diagnoses, no ID numbers.</li>
          <li>Export or delete your data any time. Unsubscribe in one click.</li>
        </ul>
        <Link href="/start" className="btn mt-6">Start now</Link>
      </section>
    </div>
  );
}
