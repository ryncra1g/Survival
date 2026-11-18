import type { Metadata } from "next";
import { StartButton } from "@/components/StartButton";
import { FirstSteps, PlanView } from "@/components/PlanView";
import { SEED_CATALOG } from "@/lib/catalog/seed";
import { generatePlan } from "@/lib/plan/generate";
import { SAMPLE_HOUSEHOLD } from "@/lib/plan/sample";
import { DEFAULT_CONSTANTS } from "@/lib/rules/constants";

export const metadata: Metadata = { title: "Sample plan", description: "A real ReadyPlan for a Long Island family of four, so you can see what you get." };
export const revalidate = 86400;

/** Public sample so people can see exactly what they get before giving their email. */
export default async function Sample() {
  const { document: doc } = await generatePlan(SAMPLE_HOUSEHOLD, DEFAULT_CONSTANTS, SEED_CATALOG, { useLlm: false });
  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="card p-4 mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="min-w-0 flex-1"><strong>Sample plan:</strong> a Long Island family of four with a dog, gas heat and no generator, planning for 90 days.</p>
        <StartButton label="Build your own" />
      </div>
      <h1 className="text-3xl font-bold">{doc.title}</h1>
      <p className="mt-1 text-muted">{doc.subtitle}</p>
      <p className="mt-1 text-xs text-muted">General guidance, not professional advice. <a href="#about" className="underline">Sources &amp; disclaimers</a></p>
      <FirstSteps doc={doc} />
      <PlanView doc={doc} planId="sample" />
      <div className="card p-5 my-6 text-center">
        <p className="text-lg font-semibold">Want one for your household?</p>
        <div className="mt-3 flex justify-center"><StartButton /></div>
      </div>
    </div>
  );
}
