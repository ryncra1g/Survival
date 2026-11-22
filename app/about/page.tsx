import type { Metadata } from "next";
import Link from "next/link";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = { title: "About" };

export default function About() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 space-y-4 leading-relaxed">
      <h1 className="text-2xl font-bold">About {BRAND.name}</h1>
      <p>{BRAND.name} builds a free emergency plan for your household from a short set of questions: how much water, food and fuel to keep, what to do first, and how to stay ready.</p>
      <p>Every amount comes from fixed rules with the math shown, so you can check it. Wording may be smoothed by software, but it never sets or changes a number.</p>
      <p>The questions ask for your ZIP code, never your street address, and never a diagnosis. Your answers are encrypted. An email is optional.</p>
      <p>Read <Link href="/sources" className="underline">Sources &amp; safety</Link> to see where the guidance comes from and how the site is paid for.</p>
      <p><Link href="/start" className="btn">Build my free plan</Link></p>
    </div>
  );
}
