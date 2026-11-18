/**
 * Standalone browser demo: the real questionnaire, rules engine, plan builder and safety
 * linter, running entirely in the page. No server, nothing saved or sent.
 * Build: npm run demo  →  demo/dist/readyplan-demo.html
 */
import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Questionnaire } from "@/components/Questionnaire";
import { PlanView } from "@/components/PlanView";
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

type View = { kind: "plan"; doc: PlanDocument; sample: boolean } | { kind: "build"; key: number };

function App() {
  const [view, setView] = useState<View>(() => ({ kind: "plan", doc: makePlan(SAMPLE_HOUSEHOLD), sample: true }));
  const [buildCount, setBuildCount] = useState(0);
  useEffect(() => {
    const route = () => {
      if (location.hash === "#build") setView((v) => (v.kind === "build" ? v : { kind: "build", key: Date.now() }));
    };
    route();
    window.addEventListener("hashchange", route);
    return () => window.removeEventListener("hashchange", route);
  }, []);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [view]);

  const start = () => {
    try {
      localStorage.removeItem("rp_q_demo");
    } catch {}
    setBuildCount((n) => n + 1);
    setView({ kind: "build", key: Date.now() });
  };

  return (
    <>
      <header className="border-b border-line bg-surface">
        <div className="mx-auto max-w-3xl px-4 h-14 flex items-center justify-between gap-3">
          <span className="font-bold text-lg text-brand">ReadyPlan</span>
          <span className="text-xs text-muted text-right">Demo · runs in your browser · nothing is saved or sent</span>
        </div>
      </header>
      <main id="main">
        {view.kind === "build" ? (
          <Questionnaire
            key={`${view.key}-${buildCount}`}
            id="demo"
            initial={{}}
            onGenerate={async (a) => {
              setView({ kind: "plan", doc: makePlan(a), sample: false });
              history.replaceState(null, "", location.pathname);
            }}
          />
        ) : (
          <div className="mx-auto max-w-3xl px-4 py-6">
            <div className="card p-4 mb-5 flex flex-wrap items-center justify-between gap-3">
              <p className="min-w-0 flex-1">
                {view.sample ? (
                  <><strong>Sample plan:</strong> a Long Island family of four with a dog, gas heat and no generator, planning for 90 days.</>
                ) : (
                  <><strong>Your plan</strong>, built from your answers. In the real app it's also emailed with a PDF.</>
                )}
              </p>
              <button type="button" className="btn" onClick={start}>{view.sample ? "Build your own plan" : "Start over"}</button>
            </div>
            <h1 className="text-3xl font-bold">{view.doc.title}</h1>
            <p className="mt-1 text-muted">{view.doc.subtitle}</p>
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
