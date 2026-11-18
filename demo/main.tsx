/**
 * Standalone browser demo: the real questionnaire, rules engine, plan builder and safety
 * linter, running entirely in the page. No server, nothing saved or sent.
 * Build: npm run demo  →  demo/dist/readyplan-demo.html
 */
import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Questionnaire } from "@/components/Questionnaire";
import { FirstSteps, PlanView } from "@/components/PlanView";
import { EmailMyPlan } from "@/components/EmailMyPlan";
import { StartButton } from "@/components/StartButton";
import { Landing } from "@/components/Landing";
import type { Answers } from "@/lib/answers/schema";
import { SEED_CATALOG } from "@/lib/catalog/seed";
import { assembleDocument, buildDraft } from "@/lib/plan/build";
import type { PlanDocument } from "@/lib/plan/document";
import { DEFAULT_CONSTANTS } from "@/lib/rules/constants";
import { computePlan } from "@/lib/rules/engine";
import { lintDocument } from "@/lib/safety/linter";
import { buyUrl } from "@/lib/affiliate";
import { SAMPLE_HOUSEHOLD } from "@/lib/plan/sample";

// The demo shows Buy buttons as they'd appear with an Associates tag, but links go to a plain Amazon search.
const DEMO_CONSTANTS = { ...DEFAULT_CONSTANTS, affiliate: { amazonTag: "demo" } };
const demoBuyHref = (itemId: string) => {
  const item = SEED_CATALOG.find((i) => i.id === itemId);
  return (item && buyUrl(item, "demo")?.replace(/&tag=demo$/, "")) || "#";
};

function makePlan(a: Answers): PlanDocument {
  const cp = computePlan(a, DEMO_CONSTANTS, SEED_CATALOG, new Date());
  const draft = buildDraft(cp, DEMO_CONSTANTS);
  const doc = assembleDocument(cp, draft, Object.fromEntries(draft.sections.map((s) => [s.id, s.summaryTemplate])), "template");
  const v = lintDocument(doc);
  if (v.length) throw new Error("Safety check failed");
  return doc;
}

type View = { kind: "home" } | { kind: "build"; key: number } | { kind: "plan"; doc: PlanDocument; sample: boolean; answers: Answers };

function Home({ onStart, onSample }: { onStart: () => void; onSample: () => void }) {
  return <Landing cta={<StartButton onStart={onStart} />} footer={<button type="button" className="underline" onClick={onSample}>See a sample plan</button>} />;
}

function App() {
  const [view, setView] = useState<View>({ kind: "home" });
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [view.kind]);

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
        {view.kind === "home" && <Home onStart={start} onSample={() => setView({ kind: "plan", doc: makePlan(SAMPLE_HOUSEHOLD), sample: true, answers: SAMPLE_HOUSEHOLD })} />}
        {view.kind === "build" && (
          <Questionnaire key={view.key} id="demo" initial={{}} onGenerate={async (a) => setView({ kind: "plan", doc: makePlan(a), sample: false, answers: a })} />
        )}
        {view.kind === "plan" && (
          <div className="mx-auto max-w-3xl px-4 py-6">
            <div className="card p-4 mb-5 flex flex-wrap items-center justify-between gap-3">
              <p className="min-w-0 flex-1">
                {view.sample ? (
                  <><strong>Sample plan:</strong> a Long Island family of four with a dog, gas heat and no generator, planning for 90 days.</>
                ) : (
                  <><strong>Your plan.</strong> No sign-up needed. Emailing it is optional (the box below is simulated in this demo).</>
                )}
              </p>
              <button type="button" className="btn" onClick={() => setView({ kind: "home" })}>{view.sample ? "Build your own plan" : "Start over"}</button>
            </div>
            <h1 className="text-3xl font-bold">{view.doc.title}</h1>
            <p className="mt-1 text-muted">{view.doc.subtitle}</p>
            <p className="mt-1 text-xs text-muted">General guidance, not professional advice. <a href="#about" className="underline">Sources &amp; disclaimers</a></p>
            <FirstSteps doc={view.doc} />
            {!view.sample && <div className="mt-5"><EmailMyPlan planId="demo" onSubmit={() => {}} /></div>}
            <PlanView
              doc={view.doc}
              planId={view.sample ? "sample" : "demo"}
              buyHref={demoBuyHref}
              onChoose={(group, level) => {
                const answers = { ...view.answers, gearChoices: { ...(view.answers.gearChoices ?? {}), [group]: level } } as Answers;
                setView({ ...view, answers, doc: makePlan(answers) });
              }}
            />
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
