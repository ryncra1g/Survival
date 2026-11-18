import type { Block, PlanDocument } from "@/lib/plan/document";
import { Checklist } from "./Checklist";

const toneCls = { danger: "border-danger text-danger", warning: "border-warn text-warn", info: "border-info text-info" } as const;

function BlockView({ b, planId, buyHref }: { b: Block; planId: string; buyHref?: (itemId: string) => string }) {
  switch (b.type) {
    case "products":
      return (
        <div className="my-4">
          {b.caption && <h3 className="mt-5 mb-2 font-semibold">{b.caption}</h3>}
          <ul className="divide-y divide-line border-y border-line">
            {b.items.map((i) => (
              <li key={i.itemId} className="py-3 flex gap-3 items-start">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    {i.name} {i.qty && <span className="text-muted font-normal whitespace-nowrap">{i.qty}</span>} {i.later && <span className="text-xs align-middle rounded px-1.5 py-0.5 bg-bg border border-line font-normal">later</span>}
                  </p>
                  <p className="text-sm text-muted mt-0.5">{i.spec}</p>
                  <p className="text-sm mt-0.5">{i.price}{i.models.length ? ` · e.g. ${i.models.join("; ")}` : ""}</p>
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
      return <Checklist planId={planId} items={b.items} />;
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

export function PlanView({ doc, planId, buyHref }: { doc: PlanDocument; planId: string; buyHref?: (itemId: string) => string }) {
  return (
    <article>
      <nav aria-label="Plan sections" className="card p-4 my-6 no-print">
        <p className="font-semibold mb-2">In this plan</p>
        <ol className="grid sm:grid-cols-2 gap-x-4 gap-y-1 text-sm">
          {doc.sections.map((s) => (
            <li key={s.id}><a href={`#${s.id}`} className="underline underline-offset-2">{s.number}. {s.title}</a></li>
          ))}
        </ol>
      </nav>
      {doc.sections.map((s) => (
        <section key={s.id} id={s.id} aria-labelledby={`${s.id}-h`} className="card p-4 sm:p-6 my-4 scroll-mt-4">
          <h2 id={`${s.id}-h`} className="text-xl font-bold">{s.number}. {s.title}</h2>
          <p className="mt-2 p-3 rounded bg-brand-soft">{s.summary}</p>
          {s.blocks.map((b, i) => <BlockView key={i} b={b} planId={planId} buyHref={buyHref} />)}
        </section>
      ))}
      <section className="card p-4 sm:p-6 my-4">
        <h2 className="text-lg font-bold">Sources</h2>
        <ul className="mt-2 list-disc pl-5 space-y-1 text-sm">
          {doc.sources.map((s) => <li key={s.url}><a href={s.url} className="underline" rel="noopener">{s.name}</a></li>)}
        </ul>
        <p className="mt-4 text-sm text-muted">{doc.disclaimer}</p>
        {doc.affiliateDisclosure && <p className="mt-2 text-sm text-muted"><strong>Affiliate disclosure:</strong> {doc.affiliateDisclosure}</p>}
      </section>
    </article>
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
