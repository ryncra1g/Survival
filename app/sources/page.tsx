import type { Metadata } from "next";
import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { DISCLAIMER, SOURCES } from "@/lib/plan/document";

export const metadata: Metadata = { title: "Sources & safety", description: `Where ${BRAND.name}'s guidance comes from, and its general disclaimers.` };

/** D9: full sources and general disclaimers live here; the plan keeps the one-line notice and the safety warnings. */
export default function Sources() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 space-y-5 leading-relaxed">
      <h1 className="text-2xl font-bold">Sources &amp; safety</h1>
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">General guidance, not professional advice</h2>
        <p>{DISCLAIMER}</p>
        <p>In an emergency, follow official instructions from local emergency management. Official evacuation orders override any plan.</p>
      </section>
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Where the guidance comes from</h2>
        <p>Every amount in your plan is worked out by fixed rules from your answers, with the math shown in the plan. The safety guidance follows these official sources:</p>
        <ul className="list-disc pl-5 space-y-1">
          {SOURCES.map((s) => (
            <li key={s.url}><a href={s.url} className="underline" rel="noopener">{s.name}</a></li>
          ))}
        </ul>
      </section>
      <section id="affiliate" className="space-y-2 scroll-mt-20">
        <h2 className="text-lg font-semibold">How {BRAND.name} is paid</h2>
        <p>The plan is free. Some Buy links are affiliate links: {BRAND.name} may earn a commission if you buy through them, at no extra cost to you. Commission never changes which items are recommended or their order. Emails and PDFs never contain Amazon links.</p>
      </section>
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Safety rules every plan follows</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Never run a generator, grill, camp stove or fuel-burning heater indoors, in a garage or near open windows.</li>
          <li>Never plug a generator into a wall outlet or dryer outlet.</li>
          <li>The plan never gives medication doses. Ask your doctor or pharmacist.</li>
          <li>For water treatment, follow the product label and CDC/EPA guidance.</li>
        </ul>
      </section>
      <p className="text-sm text-muted">See also the <Link href="/terms" className="underline">Terms</Link> and <Link href="/privacy" className="underline">Privacy policy</Link>.</p>
    </div>
  );
}
