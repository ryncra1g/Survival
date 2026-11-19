import type { Block, PlanDocument } from "@/lib/plan/document";

type ChecklistItem = Extract<Block, { type: "checklist" }>["items"][number];
type Product = Extract<Block, { type: "products" }>["items"][number];
export interface StepBuy { itemId: string; name: string; price: string; href: string }
export interface StepView { id: string; text: string; why?: string; buy?: StepBuy; link?: { label: string; url: string } }

/** Every buyable product in this plan, by catalog id. Only these get Buy buttons, so we never sell what a household already has. */
export function productIndex(doc: PlanDocument): Map<string, Product> {
  const m = new Map<string, Product>();
  for (const s of doc.sections) for (const b of s.blocks) if (b.type === "products") for (const i of b.items) if (i.buyable && !m.has(i.itemId)) m.set(i.itemId, i);
  return m;
}

export function resolveStep(it: ChecklistItem, products: Map<string, Product>, href: (itemId: string) => string): StepView {
  const p = it.buy?.map((id) => products.get(id)).find(Boolean);
  return { id: it.id, text: it.text, why: it.why, link: it.link, buy: p ? { itemId: p.itemId, name: p.name, price: p.price, href: href(p.itemId) } : undefined };
}

/** Why line, Buy button and official link under a step. Server-safe (no hooks). */
export function StepExtras({ step }: { step: StepView }) {
  if (!step.why && !step.buy && !step.link) return null;
  return (
    <span className="mt-1 block">
      {step.why && <span className="block text-sm text-muted">{step.why}</span>}
      {(step.buy || step.link) && (
        <span className="mt-2 flex flex-wrap items-center gap-2">
          {step.buy && (
            <a href={step.buy.href} target="_blank" rel="sponsored nofollow noopener" className="btn-ghost min-h-[40px] px-3 text-sm text-brand border border-line gap-1 flex-wrap text-left" aria-label={`Buy ${step.buy.name}, ${step.buy.price} (opens a store, affiliate link)`}>
              <span>Buy: {step.buy.name}</span> <span className="text-muted font-normal whitespace-nowrap">{"· "}{step.buy.price}</span>
            </a>
          )}
          {step.link && (
            <a href={step.link.url} target="_blank" rel="noopener" className="text-sm underline text-brand">
              {step.link.label} ↗
            </a>
          )}
        </span>
      )}
    </span>
  );
}
