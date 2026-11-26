import type { Metadata } from "next";
import { Subtitle } from "@/components/Subtitle";
import { StartButton } from "@/components/StartButton";
import { PlanView } from "@/components/PlanView";
import { SEED_CATALOG } from "@/lib/catalog/seed";
import { generatePlan } from "@/lib/plan/generate";
import { SAMPLE_HOUSEHOLD } from "@/lib/plan/sample";
import { DEFAULT_CONSTANTS } from "@/lib/rules/constants";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = { title: "Sample plan", description: `A real ${BRAND.name} plan for a Long Island family of four, so you can see what you get.` };
export const revalidate = 86400;

/** Public sample so people can see exactly what they get before giving their email. */
export default async function Sample() {
  const { document: doc } = await generatePlan(SAMPLE_HOUSEHOLD, DEFAULT_CONSTANTS, SEED_CATALOG, { useLlm: false });
  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <PlanView
        doc={doc}
        planId="sample"
        top={
          <>
            <div className="mb-4 flex items-center justify-between gap-3 text-sm text-muted">
              <p className="min-w-0">Sample: a Long Island family of four with a dog, 90 days.</p>
              <StartButton label="Build your own" small secondary />
            </div>
            <h1 className="text-2xl font-bold">{doc.title}</h1>
            <Subtitle text={doc.subtitle} />
            <p className="mt-1 text-xs text-muted">General guidance, not professional advice. <a href="/sources" className="tap-inline underline">Sources &amp; safety</a></p>
          </>
        }
      />
      <div className="card p-5 my-6 text-center">
        <p className="text-lg font-semibold">Want one for your household?</p>
        <div className="mt-3 flex justify-center"><StartButton /></div>
      </div>
    </div>
  );
}
