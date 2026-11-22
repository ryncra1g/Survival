/**
 * Standalone browser demo: the real questionnaire, rules engine, plan builder and safety
 * linter, running entirely in the page. No server, nothing saved or sent.
 * Build: npm run demo  →  demo/dist/demo.html
 */
import { useEffect, useState } from "react";
import { Subtitle } from "@/components/Subtitle";
import { createRoot } from "react-dom/client";
import { Questionnaire } from "@/components/Questionnaire";
import { PlanView } from "@/components/PlanView";
import { SaveBar } from "@/components/SaveBar";
import { StartButton } from "@/components/StartButton";
import { Landing } from "@/components/Landing";
import { withGearChoice, type Answers, type GEAR_SLOTS } from "@/lib/answers/schema";
import { SEED_CATALOG } from "@/lib/catalog/seed";
import { assembleDocument, buildDraft } from "@/lib/plan/build";
import type { PlanDocument } from "@/lib/plan/document";
import { DEFAULT_CONSTANTS } from "@/lib/rules/constants";
import { computePlan } from "@/lib/rules/engine";
import { lintDocument } from "@/lib/safety/linter";
import { buyUrl } from "@/lib/affiliate";
import { SAMPLE_HOUSEHOLD } from "@/lib/plan/sample";
import { BRAND } from "@/lib/brand";
import type { OnStage } from "@/lib/plan/stages";
import { lookupZip } from "@/lib/zip/profile";

// The demo shows Buy buttons as they'd appear with an Associates tag, but links go to a plain Amazon search.
const DEMO_CONSTANTS = { ...DEFAULT_CONSTANTS, affiliate: { amazonTag: "demo" } };
const demoBuyHref = (itemId: string) => {
  const item = SEED_CATALOG.find((i) => i.id === itemId);
  return (item && buyUrl(item, "demo")?.replace(/&tag=demo$/, "")) || "#";
};

/** D11 in the demo: the same three stages, each reported when its work is done (one frame to paint between). */
async function makePlanStaged(a: Answers, onStage: OnStage): Promise<PlanDocument> {
  const frame = () => new Promise((r) => requestAnimationFrame(() => r(null)));
  lookupZip(a.zip);
  await onStage("hazards");
  await frame();
  const cp = computePlan(a, DEMO_CONSTANTS, SEED_CATALOG, new Date());
  await onStage("quantities");
  await frame();
  const draft = buildDraft(cp, DEMO_CONSTANTS);
  const doc = assembleDocument(cp, draft, Object.fromEntries(draft.sections.map((s) => [s.id, s.summaryTemplate])), "template");
  if (lintDocument(doc).length) throw new Error("Safety check failed");
  await onStage("steps");
  await frame();
  return doc;
}

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
  return <Landing cta={<StartButton onStart={onStart} />} sampleLink={<button type="button" className="btn-ghost border border-line text-sm px-4 min-h-[44px]" onClick={onSample}>See a sample plan</button>} />;
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
          <button type="button" className="font-bold text-lg text-brand" onClick={() => setView({ kind: "home" })}>{BRAND.name}</button>
          <span className="text-xs text-muted text-right">Demo · nothing is saved or sent</span>
        </div>
      </header>
      <main id="main">
        {view.kind === "home" && <Home onStart={start} onSample={() => setView({ kind: "plan", doc: makePlan(SAMPLE_HOUSEHOLD), sample: true, answers: SAMPLE_HOUSEHOLD })} />}
        {view.kind === "build" && (
          <Questionnaire key={view.key} id="demo" initial={{}} onGenerate={async (a, onStage) => setView({ kind: "plan", doc: await makePlanStaged(a, onStage), sample: false, answers: a })} />
        )}
        {view.kind === "plan" && (
          <div className="mx-auto max-w-3xl px-4 py-6">
            <div className="mb-4 flex items-center justify-between gap-3 text-sm text-muted">
              <p className="min-w-0">{view.sample ? "Sample: a Long Island family of four with a dog, 90 days." : "Your plan. No sign-up needed."}</p>
              <button type="button" className="btn-ghost shrink-0 border border-line text-sm" onClick={() => setView({ kind: "home" })}>{view.sample ? "Build your own" : "Start over"}</button>
            </div>
            <h1 className="text-3xl font-bold">{view.doc.title}</h1>
            <Subtitle text={view.doc.subtitle} />
            <p className="mt-1 text-xs text-muted">General guidance, not professional advice. <a href="#about" className="underline">Sources &amp; disclaimers</a></p>
            {!view.sample && <div className="mt-5"><SaveBar planId="demo" onSubmit={() => {}} /></div>}
            <PlanView
              doc={view.doc}
              planId={view.sample ? "sample" : "demo"}
              buyHref={demoBuyHref}
              onChoose={(group, level) => {
                const answers = withGearChoice(view.answers, group as (typeof GEAR_SLOTS)[number], level);
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
