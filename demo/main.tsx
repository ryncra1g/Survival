/**
 * Standalone browser demo: the real questionnaire, rules engine, plan builder and safety
 * linter, running entirely in the page. No server, nothing saved or sent.
 * Build: npm run demo  →  demo/dist/readyplan-demo.html
 */
import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Questionnaire } from "@/components/Questionnaire";
import { FirstSteps, PlanView } from "@/components/PlanView";
import type { Answers } from "@/lib/answers/schema";
import { SEED_CATALOG } from "@/lib/catalog/seed";
import { assembleDocument, buildDraft } from "@/lib/plan/build";
import type { PlanDocument } from "@/lib/plan/document";
import { DEFAULT_CONSTANTS } from "@/lib/rules/constants";
import { computePlan } from "@/lib/rules/engine";
import { lintDocument } from "@/lib/safety/linter";
import { SAMPLE_HOUSEHOLD } from "@/tests/fixtures/households";

function makePlan(a: Answers): PlanDocument {
  const cp = computePlan(a, DEFAULT_CONSTANTS, SEED_CATALOG, new Date());
  const draft = buildDraft(cp, DEFAULT_CONSTANTS);
  const doc = assembleDocument(cp, draft, Object.fromEntries(draft.sections.map((s) => [s.id, s.summaryTemplate])), "template");
  const v = lintDocument(doc);
  if (v.length) throw new Error("Safety check failed");
  return doc;
}

type View = { kind: "home" } | { kind: "build"; key: number } | { kind: "plan"; doc: PlanDocument; sample: boolean; email?: string };

function Home({ onStart, onSample }: { onStart: () => void; onSample: () => void }) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:py-20">
      <h1 className="text-3xl sm:text-5xl font-bold leading-tight text-balance">Your family&apos;s emergency plan and supply list, built for your home in 5 minutes.</h1>
      <p className="mt-4 text-lg text-muted">Tap through a few questions. Get exactly how much water, food and fuel your household needs, and what to do first.</p>
      <div className="mt-8 flex flex-col sm:flex-row sm:items-center gap-4">
        <button type="button" className="btn text-lg" onClick={onStart}>Build my free plan</button>
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
      <p className="mt-10 text-sm text-muted">
        Based on guidance from Ready.gov, FEMA, the CDC and the Red Cross.{" "}
        <button type="button" className="underline" onClick={onSample}>See a sample plan</button>
      </p>
    </div>
  );
}

function App() {
  const [view, setView] = useState<View>({ kind: "home" });
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [view]);

  const start = () => {
    try {
      localStorage.removeItem("rp_q_demo");
    } catch {}
    setView({ kind: "build", key: Date.now() });
  };

  return (
    <>
      <header className="border-b border-line bg-surface">
        <div className="mx-auto max-w-3xl px-4 h-14 flex items-center justify-between gap-3">
          <button type="button" className="font-bold text-lg text-brand" onClick={() => setView({ kind: "home" })}>ReadyPlan</button>
          <span className="text-xs text-muted text-right">Demo · nothing is saved or sent</span>
        </div>
      </header>
      <main id="main">
        {view.kind === "home" && <Home onStart={start} onSample={() => setView({ kind: "plan", doc: makePlan(SAMPLE_HOUSEHOLD), sample: true })} />}
        {view.kind === "build" && (
          <Questionnaire
            key={view.key}
            id="demo"
            initial={{}}
            needsEmail
            onGenerate={async (a, contact) => setView({ kind: "plan", doc: makePlan(a), sample: false, email: contact?.email })}
          />
        )}
        {view.kind === "plan" && (
          <div className="mx-auto max-w-3xl px-4 py-6">
            <div className="card p-4 mb-5 flex flex-wrap items-center justify-between gap-3">
              <p className="min-w-0 flex-1">
                {view.sample ? (
                  <><strong>Sample plan:</strong> a Long Island family of four with a dog, gas heat and no generator, planning for 90 days.</>
                ) : (
                  <>In the live app, this plan and a printable PDF would now be emailed to <strong className="break-all">{view.email}</strong>. This demo doesn&apos;t send anything.</>
                )}
              </p>
              <button type="button" className="btn" onClick={start}>{view.sample ? "Build your own plan" : "Start over"}</button>
            </div>
            <h1 className="text-3xl font-bold">{view.doc.title}</h1>
            <p className="mt-1 text-muted">{view.doc.subtitle}</p>
            <FirstSteps doc={view.doc} />
            <p className="mt-4 text-sm text-muted border border-line rounded p-3">{view.doc.disclaimer}</p>
            <PlanView doc={view.doc} planId={view.sample ? "sample" : "demo"} />
          </div>
        )}
      </main>
      <footer className="border-t border-line text-sm text-muted">
        <div className="mx-auto max-w-3xl px-4 py-6">General preparedness guidance, not professional advice. Follow official instructions in an emergency.</div>
      </footer>
    </>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
