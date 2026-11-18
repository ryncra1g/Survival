/**
 * Standalone browser demo: the real questionnaire, rules engine, plan builder and safety
 * linter, running entirely in the page. No server, nothing saved or sent.
 * Build: npm run demo  →  demo/dist/readyplan-demo.html
 */
import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Questionnaire } from "@/components/Questionnaire";
import { FirstSteps, PlanView } from "@/components/PlanView";
import { EmailStart } from "@/components/EmailStart";
import { Landing } from "@/components/Landing";
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

type View = { kind: "home" } | { kind: "build"; key: number; email: string } | { kind: "plan"; doc: PlanDocument; sample: boolean; email?: string };

function Home({ onStart, onSample }: { onStart: (email: string) => void; onSample: () => void }) {
  return (
    <Landing
      form={<EmailStart onStart={onStart} />}
      footer={<button type="button" className="underline" onClick={onSample}>See a sample plan</button>}
    />
  );
}

function App() {
  const [view, setView] = useState<View>({ kind: "home" });
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [view]);

  const start = (email: string) => {
    try {
      localStorage.removeItem("rp_q_demo");
    } catch {}
    setView({ kind: "build", key: Date.now(), email });
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
          <>
            <p className="mx-auto max-w-xl px-4 pt-4 text-sm text-muted">In the live app, a confirmation email would now be on its way to <strong className="break-all">{view.email}</strong>.</p>
            <Questionnaire
              key={view.key}
              id="demo"
              initial={{}}
              onGenerate={async (a) => setView({ kind: "plan", doc: makePlan(a), sample: false, email: view.email })}
            />
          </>
        )}
        {view.kind === "plan" && (
          <div className="mx-auto max-w-3xl px-4 py-6">
            <div className="card p-4 mb-5 flex flex-wrap items-center justify-between gap-3">
              <p className="min-w-0 flex-1">
                {view.sample ? (
                  <><strong>Sample plan:</strong> a Long Island family of four with a dog, gas heat and no generator, planning for 90 days.</>
                ) : (
                  <>In the live app, this plan, a printable PDF and a fridge checklist would be emailed to <strong className="break-all">{view.email}</strong>. This demo doesn&apos;t send anything.</>
                )}
              </p>
              <button type="button" className="btn" onClick={() => setView({ kind: "home" })}>{view.sample ? "Build your own plan" : "Start over"}</button>
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
