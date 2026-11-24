import type { Metadata } from "next";
import Link from "next/link";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = { title: "Help" };

export default function Help() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 space-y-5 leading-relaxed">
      <h1 className="text-2xl font-bold">Help</h1>
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Where is my plan saved?</h2>
        <p>Without an email, your plan and your ticks are saved on this device for 30 days. Confirm your email to keep it and use it on any device.</p>
      </section>
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">How do I open my plan on another phone or computer?</h2>
        <p>Confirm your email from the plan page. After that, <Link href="/account" className="underline">sign in</Link> with a one-time link from any device. There are no passwords.</p>
      </section>
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Can I change an answer?</h2>
        <p>Yes. Use &quot;Change an answer&quot; on your plan. Your ticks carry over.</p>
      </section>
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Do I need to buy everything?</h2>
        <p>No. In your shopping list, tick what you already have, and the plan stops suggesting it. Safety items come first.</p>
      </section>
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Do I need an email for the PDF or printing?</h2>
        <p>No. The plan, PDF, fridge checklist and print view never need an email.</p>
      </section>
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">How do I delete my data?</h2>
        <p>Signed in, go to <Link href="/account#data" className="underline">Privacy &amp; data</Link>. Plans without an email are deleted automatically after 30 days.</p>
      </section>
      <p className="text-sm text-muted">{BRAND.name} gives general guidance. In an emergency, follow official instructions.</p>
    </div>
  );
}
