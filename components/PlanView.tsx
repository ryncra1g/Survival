import type { Block, PlanDocument } from "@/lib/plan/document";
import { Checklist } from "./Checklist";
import { ChecksProvider } from "./ChecksContext";
import { LevelChips } from "./LevelChips";
import { SectionNav } from "./SectionNav";
import { BuyIfNeeded } from "./BuyIfNeeded";
import { Dashboard, type PriorityStep } from "./Dashboard";
import { Chevron } from "./Chevron";
import { groupIntoChapters } from "@/lib/plan/chapters";
import { BRAND } from "@/lib/brand";
import { HelpStrip, productIndex, resolveStep, StepExtras, type StepView } from "./StepExtras";
import { KIND_LABEL, kindLabelsAt, kindOf, type Kind } from "@/lib/plan/kinds";

/** D8: a small label where the kind of content changes: Good to know / To do / To have. */
function KindLabel({ kind }: { kind: Kind }) {
  const tone = kind === "do" ? "text-brand" : kind === "have" ? "text-ink bg-accent/25" : "text-muted";
  return <p className={`mt-4 mb-1 inline-block rounded px-1.5 py-0.5 text-[0.7rem] font-semibold uppercase tracking-wide ${tone}`} data-kind={kind}>{KIND_LABEL[kind]}</p>;
}

const toneCls = { danger: "border-danger text-danger", warning: "border-warn text-warn", info: "border-info text-info" } as const;

type ChooseFn = (group: string, level: "essential" | "standard" | "premium") => void;

/** `affiliate`: some Buy links earn a commission, so the inline disclosure shows. */
type Ctx = { products: ReturnType<typeof productIndex>; href: (itemId: string) => string; affiliate: boolean };

function BlockView({ b, planId, buyHref, sectionId, onChoose, ctx }: { b: Block; planId: string; buyHref?: (itemId: string) => string; sectionId: string; onChoose?: ChooseFn; ctx: Ctx }) {
  switch (b.type) {
    case "help":
      return <HelpStrip b={b} products={ctx.products} href={ctx.href} />;
    case "levelchoice":
      return (
        <div className="my-4">
          <h4 className="font-semibold">{b.caption}</h4>
          <LevelChips planId={planId} group={b.group} levels={b.levels} back={sectionId} onChoose={onChoose} />
        </div>
      );
    case "products":
      return (
        <div className="my-4">
          {b.caption && <h4 className="mt-5 mb-2 font-semibold">{b.caption}</h4>}
          {b.compact && <p className="text-sm text-muted -mt-1 mb-2">What to look for is in <a href="#gear" className="underline">Recommended gear</a>.</p>}
          {ctx.affiliate && b.items.some((i) => i.buyable) && <p className="text-sm text-ink mb-2" data-testid="affiliate-disclosure"><strong>Affiliate links:</strong> {BRAND.name} may earn a commission if you buy through these Buy links, at no extra cost to you. <a href="/sources#affiliate" className="underline">Details</a></p>}
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
                  <BuyIfNeeded itemId={i.itemId}>
                  <a href={buyHref ? buyHref(i.itemId) : `/go/${encodeURIComponent(i.itemId)}?p=${planId}&src=web`} target="_blank" rel="sponsored nofollow noopener" className="btn-ghost shrink-0 text-brand min-h-[40px]" aria-label={`Buy ${i.name} (opens a store, affiliate link)`}>
                    Buy
                  </a>
                  </BuyIfNeeded>
                )}
              </li>
            ))}
          </ul>
        </div>
      );
    case "paragraph":
      return <p className="my-3">{b.text}</p>;
    case "subheading":
      return <h4 className="mt-5 mb-1 font-semibold">{b.text}</h4>;
    case "bullets":
      return (
        <ul className="my-3 list-disc pl-5 space-y-1">
          {b.items.map((t, i) => <li key={i}>{t}</li>)}
        </ul>
      );
    case "checklist":
      return <Checklist items={b.items.map((i) => resolveStep(i, ctx.products, ctx.href))} />;
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

/**
 * Sections that start open. None: the dashboard above carries "what to do now", so the plan below reads as
 * a short index (title + one-line summary) and each section opens on tap or from a link.
 */
const OPEN_SECTIONS = new Set<string>();
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
  afterDashboard,
}: {
  /** Shown right under the dashboard (e.g. email, PDF, change an answer), before the plan chapters. */
  afterDashboard?: React.ReactNode;
  doc: PlanDocument;
  planId: string;
  buyHref?: (itemId: string) => string;
  checks?: Record<string, boolean>;
  sync?: boolean;
  /** Demo only: switch a level without a server. */
  onChoose?: ChooseFn;
}) {
  const chapters = groupIntoChapters(doc.sections);
  const ctx: Ctx = { products: productIndex(doc), href: (id) => (buyHref ? buyHref(id) : `/go/${encodeURIComponent(id)}?p=${planId}&src=web`), affiliate: !!doc.affiliateDisclosure };
  return (
    <ChecksProvider planId={planId} initial={checks} sync={sync}>
      <article>
        <Dashboard
          overview={doc.overview}
          priority={prioritySteps(doc, ctx)}
          allStepIds={doc.sections.flatMap((s) => s.blocks.flatMap((b) => (b.type === "checklist" && kindOf(b) === "do" ? b.items.map((i) => i.id) : [])))}
          buyHref={Object.fromEntries([...ctx.products.keys()].map((id) => [id, ctx.href(id)]))}
        />
        {afterDashboard}
        <SectionNav chapters={chapters.map((ch) => ({ id: ch.id, title: ch.title, short: ch.short, sections: ch.items.map((x) => ({ id: x.id, title: SHORT[x.id] ?? x.title })) }))} />
        {chapters.map((ch) => (
          <section key={ch.id} id={`ch-${ch.id}`} data-chapter={ch.id} aria-labelledby={`ch-${ch.id}-h`} className="scroll-mt-16 pt-4">
            <h2 id={`ch-${ch.id}-h`} className="text-2xl font-bold text-brand mt-4">{ch.title}</h2>
            {ch.items.length > 1 && (
              <p className="mt-2 flex flex-wrap gap-2 no-print" aria-label={`${ch.title}: sections`}>
                {ch.items.map((x) => (
                  <a key={x.id} href={`#${x.id}`} className="rounded-full border border-line bg-surface px-3 py-1.5 text-sm no-underline">{SHORT[x.id] ?? x.title}</a>
                ))}
              </p>
            )}
            {ch.items.map((s) => (
              <details key={s.id} id={s.id} data-section open={OPEN_SECTIONS.has(s.id)} className="group card my-3 scroll-mt-20">
                <summary className="list-none cursor-pointer p-4 sm:p-5 [&::-webkit-details-marker]:hidden">
                  <span className="flex items-start justify-between gap-3">
                    <h3 id={`${s.id}-h`} className="text-lg font-bold">{s.title}</h3>
                    <Chevron />
                  </span>
                  {/* Summary: plain text when collapsed (a scannable index); the tinted box once opened. */}
                  <span className="mt-1 block text-muted group-open:mt-3 group-open:rounded group-open:bg-brand-soft group-open:p-3 group-open:text-ink">{s.summary}</span>
                </summary>
                <div className="px-4 sm:px-6 pb-5">
                  {(() => {
                    // The dashboard's shopping list replaces the compact shopping list inside the Priority list on the web
                    // (email and PDF keep it).
                    const blocks = s.blocks.filter((b) => !(doc.overview && s.id === "priorities" && b.type === "products" && b.compact));
                    const labels = kindLabelsAt(blocks);
                    return blocks.map((b, i) => (
                      <div key={i}>
                        {labels[i] && <KindLabel kind={labels[i]} />}
                        <BlockView b={b} planId={planId} buyHref={buyHref} sectionId={s.id} onChoose={onChoose} ctx={ctx} />
                      </div>
                    ));
                  })()}
                </div>
              </details>
            ))}
          </section>
        ))}
        <section id="about" className="card p-4 my-4 scroll-mt-24 text-sm text-muted">
          <p>{doc.disclaimer}</p>
          {doc.affiliateDisclosure && <p className="mt-2"><strong>Affiliate disclosure:</strong> {doc.affiliateDisclosure}</p>}
          <p className="mt-2"><a href="/sources" className="underline">Sources &amp; safety</a>: where this guidance comes from.</p>
        </section>
      </article>
    </ChecksProvider>
  );
}

/** Stages of the Priority list, in order; "Skills to practice" isn't a to-do stage. */
const STAGES = ["This week", "This month", "Within 60 days", "Within 90 days"];

/** Every Priority-list step with its stage, in plan order, for the dashboard's "Next up". */
function prioritySteps(doc: PlanDocument, ctx: Ctx): PriorityStep[] {
  const out: PriorityStep[] = [];
  let stage = "";
  for (const b of doc.sections.find((s) => s.id === "priorities")?.blocks ?? []) {
    if (b.type === "subheading") stage = b.text;
    else if (b.type === "checklist" && STAGES.includes(stage)) for (const i of b.items) out.push({ stage, step: resolveStep(i, ctx.products, ctx.href) });
  }
  return out;
}
