import type { Block, PlanDocument } from "@/lib/plan/document";
import { Checklist } from "./Checklist";
import { ChecksProvider } from "./ChecksContext";
import { LevelChips } from "./LevelChips";
import { SectionNav } from "./SectionNav";
import { BRAND } from "@/lib/brand";

const toneCls = { danger: "border-danger text-danger", warning: "border-warn text-warn", info: "border-info text-info" } as const;

type ChooseFn = (group: string, level: "essential" | "standard" | "premium") => void;

function BlockView({ b, planId, buyHref, sectionId, onChoose }: { b: Block; planId: string; buyHref?: (itemId: string) => string; sectionId: string; onChoose?: ChooseFn }) {
  switch (b.type) {
    case "levelchoice":
      return (
        <div className="my-4">
          <h3 className="font-semibold">{b.caption}</h3>
          <LevelChips planId={planId} group={b.group} levels={b.levels} back={sectionId} onChoose={onChoose} />
        </div>
      );
    case "products":
      return (
        <div className="my-4">
          {b.caption && <h3 className="mt-5 mb-2 font-semibold">{b.caption}</h3>}
          {b.compact && <p className="text-sm text-muted -mt-1 mb-2">What to look for is in <a href="#gear" className="underline">Recommended gear</a>.</p>}
          {b.items.some((i) => i.buyable) && <p className="text-sm text-ink mb-2" data-testid="affiliate-disclosure"><strong>Affiliate links:</strong> {BRAND.name} may earn a commission if you buy through these Buy links, at no extra cost to you. <a href="#about" className="underline">Details</a></p>}
          <ul className="divide-y divide-line border-y border-line">
            {b.items.map((i) => (
              <li key={i.itemId} className={`${b.compact ? "py-2 items-center" : "py-3 items-start"} flex gap-3`}>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    {i.name} {i.qty && <span className="text-muted font-normal whitespace-nowrap">{i.qty}</span>} {i.later && <span className="text-xs align-middle rounded px-1.5 py-0.5 bg-bg border border-line font-normal">later</span>}
                  </p>
                  {!b.compact && <p className="text-sm text-muted mt-0.5">{i.spec}</p>}
                  <p className="text-sm mt-0.5">{i.price}{!b.compact && i.models.length ? ` · e.g. ${i.models.join("; ")}` : ""}</p>
                  {!b.compact && i.levels && i.group && <LevelChips planId={planId} group={i.group} levels={i.levels} back={sectionId} onChoose={onChoose} />}
                </div>
                {i.buyable && (
                  <a href={buyHref ? buyHref(i.itemId) : `/go/${encodeURIComponent(i.itemId)}?p=${planId}&src=web`} target="_blank" rel="sponsored nofollow noopener" className="btn-ghost shrink-0 text-brand min-h-[40px]" aria-label={`Buy ${i.name} (opens a store, affiliate link)`}>
                    Buy
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      );
    case "paragraph":
      return <p className="my-3">{b.text}</p>;
    case "subheading":
      return <h3 className="mt-5 mb-1 font-semibold">{b.text}</h3>;
    case "bullets":
      return (
        <ul className="my-3 list-disc pl-5 space-y-1">
          {b.items.map((t, i) => <li key={i}>{t}</li>)}
        </ul>
      );
    case "checklist":
      return <Checklist items={b.items} />;
    case "table":
      return (
        <div className="my-4 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <table className="w-full text-sm border-collapse">
            {b.caption && <caption className="text-left text-muted font-semibold pb-1">{b.caption}</caption>}
            <thead>
              <tr>{b.columns.map((c, i) => <th key={i} scope="col" className="text-left p-2 border-b-2 border-line bg-bg font-semibold">{c}</th>)}</tr>
            </thead>
            <tbody>
              {b.rows.map((r, ri) => (
                <tr key={ri} className="align-top">
                  {r.map((cell, ci) => <td key={ci} className={`p-2 border-b border-line ${cell.startsWith("  ") ? "pl-5" : ""} ${r.slice(1).every((x) => !x) ? "font-semibold" : ""}`}>{cell.trim()}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "ifthen":
      return (
        <div className="my-4 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                <th scope="col" className="text-left p-2 border-b-2 border-line bg-bg w-[45%]">If…</th>
                <th scope="col" className="text-left p-2 border-b-2 border-line bg-bg">Then…</th>
              </tr>
            </thead>
            <tbody>
              {b.rows.map((r, i) => (
                <tr key={i} className="align-top">
                  <td className="p-2 border-b border-line">{r.if}</td>
                  <td className="p-2 border-b border-line">{r.then}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "callout":
      return (
        <div className={`my-4 border-l-4 bg-bg p-3 rounded-r ${toneCls[b.tone]}`} role={b.tone === "danger" ? "note" : undefined}>
          <p className="font-semibold">{b.title}</p>
          <p className="text-ink mt-1">{b.text}</p>
        </div>
      );
  }
}

/** Sections that start open: the ones people act on now. The rest show title + one-line summary. */
const OPEN_SECTIONS = new Set(["priorities", "hazards", "day0"]);
const SHORT: Record<string, string> = {
  snapshot: "Your household",
  priorities: "Priority list",
  day0: "Day 0",
  hazards: "Your hazards",
  heat: "Heat",
  power: "Power & fuel",
  cooking: "Cooking",
  sanitation: "Sanitation",
  firstaid: "First aid",
  comms: "Comms & cash",
  security: "Security",
  kids: "Kids",
  evacuation: "Evacuation",
  budget: "Budget",
  gear: "Gear",
  maintenance: "Maintenance",
};

export function PlanView({
  doc,
  planId,
  buyHref,
  checks,
  sync = false,
  onChoose,
}: {
  doc: PlanDocument;
  planId: string;
  buyHref?: (itemId: string) => string;
  checks?: Record<string, boolean>;
  sync?: boolean;
  /** Demo only: switch a level without a server. */
  onChoose?: ChooseFn;
}) {
  return (
    <ChecksProvider planId={planId} initial={checks} sync={sync}>
      <article>
        <SectionNav sections={doc.sections.map((s) => ({ id: s.id, title: SHORT[s.id] ?? s.title }))} />
        {doc.sections.map((s) => (
          <details key={s.id} id={s.id} data-section open={OPEN_SECTIONS.has(s.id)} className="group card my-3 scroll-mt-24">
            <summary className="list-none cursor-pointer p-4 sm:p-5 [&::-webkit-details-marker]:hidden">
              <span className="flex items-start justify-between gap-3">
                <h2 id={`${s.id}-h`} className="text-xl font-bold">{s.number}. {s.title}</h2>
                <span aria-hidden className="mt-1 text-muted transition-transform group-open:rotate-180">▾</span>
              </span>
              <span className="mt-2 block p-3 rounded bg-brand-soft">{s.summary}</span>
            </summary>
            <div className="px-4 sm:px-6 pb-5">
              {s.blocks.map((b, i) => <BlockView key={i} b={b} planId={planId} buyHref={buyHref} sectionId={s.id} onChoose={onChoose} />)}
            </div>
          </details>
        ))}
        <section id="about" className="card p-4 sm:p-6 my-4 scroll-mt-24">
          <h2 className="text-lg font-bold">Sources &amp; disclaimers</h2>
          <p className="mt-2 text-sm text-muted">{doc.disclaimer}</p>
          {doc.affiliateDisclosure && <p className="mt-2 text-sm text-muted"><strong>Affiliate disclosure:</strong> {doc.affiliateDisclosure}</p>}
          <h3 className="mt-4 font-semibold">Sources</h3>
          <ul className="mt-2 list-disc pl-5 space-y-1 text-sm">
            {doc.sources.map((src) => <li key={src.url}><a href={src.url} className="underline" rel="noopener">{src.name}</a></li>)}
          </ul>
        </section>
      </article>
    </ChecksProvider>
  );
}

/** The three most important actions, up top, so the plan starts with something doable today. */
export function FirstSteps({ doc }: { doc: PlanDocument }) {
  const pr = doc.sections.find((s) => s.id === "priorities");
  const week = pr?.blocks.find((b) => b.type === "checklist");
  if (!week || week.type !== "checklist") return null;
  return (
    <section aria-labelledby="first-steps" className="mt-5 rounded-xl border-2 border-brand p-4 sm:p-5">
      <h2 id="first-steps" className="text-lg font-bold">Start here: your first 3 steps</h2>
      <ol className="mt-3 space-y-2 list-decimal pl-5">
        {week.items.slice(0, 3).map((i) => <li key={i.id}>{i.text}</li>)}
      </ol>
      <a href="#priorities" className="mt-3 inline-block text-sm underline no-print">See the full priority list</a>
    </section>
  );
}
