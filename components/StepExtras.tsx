import { BuyIfNeeded } from "./BuyIfNeeded";
import type { Block, PlanDocument } from "@/lib/plan/document";
import { lowerFirst } from "@/lib/plan/format";
import { BRAND } from "@/lib/brand";

type ChecklistItem = Extract<Block, { type: "checklist" }>["items"][number];
type Product = Extract<Block, { type: "products" }>["items"][number];
export interface StepBuy { itemId: string; name: string; price: string; href: string }
export interface StepView { id: string; text: string; why?: string; buy?: StepBuy; link?: { label: string; url: string }; see?: { label: string; anchor: string } }

/** Every buyable product in this plan, by catalog id. Only these get Buy buttons, so we never sell what a household already has. */
export function productIndex(doc: PlanDocument): Map<string, Product> {
  const m = new Map<string, Product>();
  for (const s of doc.sections) for (const b of s.blocks) if (b.type === "products") for (const i of b.items) if (i.buyable && !m.has(i.itemId)) m.set(i.itemId, i);
  return m;
}

export function resolveStep(it: ChecklistItem, products: Map<string, Product>, href: (itemId: string) => string): StepView {
  const p = it.buy?.map((id) => products.get(id)).find(Boolean);
  return { id: it.id, text: it.text, why: it.why, link: it.link, see: it.see, buy: p ? { itemId: p.itemId, name: p.name, price: p.price, href: href(p.itemId) } : undefined };
}


/**
 * DESIGN.md T4 + T5 (design audit DA-3): one short line next to every group of Buy buttons. Prices are always
 * called estimates; the commission note shows when Buy links can earn one (an affiliate tag is set).
 */
export function BuyNote({ affiliate, className = "" }: { affiliate: boolean; className?: string }) {
  return (
    <p className={`text-xs text-muted ${className}`} data-testid="buy-note">
      Prices are estimates.
      {affiliate && (
        <>
          {" "}Some Buy links earn {BRAND.name} a commission, at no extra cost to you. <a href="/sources#affiliate" className="tap-inline underline">Details</a>
        </>
      )}
    </p>
  );
}

/** "Typical $20–$40 each" → "$20–$40". */
const shortPrice = (p: string) => p.replace(/^Typical\s+/i, "").replace(/\s+each$/i, "");

/** Why line, Buy button and official link under a step. Server-safe (no hooks). */
export function StepExtras({ step }: { step: StepView }) {
  if (!step.why && !step.buy && !step.link && !step.see) return null;
  return (
    <span className="mt-1 block">
      {step.why && <span className="block text-sm text-muted">{step.why}</span>}
      {(step.buy || step.link || step.see) && (
        <span className="mt-2 flex flex-wrap items-center gap-2">
          {step.buy && (
            <BuyIfNeeded itemId={step.buy.itemId}>
            <a href={step.buy.href} target="_blank" rel="sponsored nofollow noopener" className="inline-block min-h-[44px] rounded-lg border border-line bg-surface px-3 py-2.5 text-sm font-semibold text-brand no-underline leading-snug" aria-label={`Buy ${lowerFirst(step.buy.name)}, ${shortPrice(step.buy.price)} (opens a store)`}>
              Buy {lowerFirst(step.buy.name)} <span className="font-normal text-muted whitespace-nowrap">· {shortPrice(step.buy.price)}</span>
            </a>
            </BuyIfNeeded>
          )}
          {step.see && (
            <a href={`#${step.see.anchor}`} className="tap text-sm underline text-brand">
              {step.see.label} →
            </a>
          )}
          {step.link && (
            <a href={step.link.url} target="_blank" rel="noopener" className="tap text-sm underline text-brand">
              {step.link.label} ↗
            </a>
          )}
        </span>
      )}
    </span>
  );
}

/** "What you need" strip at the end of a section. */
export function HelpStrip({ b, products, href, affiliate = false }: { b: Extract<Block, { type: "help" }>; products: Map<string, Product>; href: (itemId: string) => string; affiliate?: boolean }) {
  const items = b.buy.map((id) => products.get(id)).filter((x): x is Product => !!x).slice(0, 6);
  if (!items.length && !b.links.length) return null;
  return (
    <div className="mt-6 rounded-lg border border-line bg-bg p-3 sm:p-4" data-testid="help-strip">
      <h4 className="font-semibold">What you need</h4>
      {items.length > 0 && <BuyNote affiliate={affiliate} className="mt-1" />}
      {items.length > 0 && (
        <ul className="mt-2 divide-y divide-line border-y border-line">
          {items.map((i) => (
            <li key={i.itemId} className="flex items-center justify-between gap-3 py-2">
              <span className="min-w-0">
                <span className="font-medium">{i.name}</span> <span className="text-sm text-muted whitespace-nowrap">{i.price}</span>
              </span>
              <BuyIfNeeded itemId={i.itemId}>
                <a href={href(i.itemId)} target="_blank" rel="sponsored nofollow noopener" className="btn-ghost shrink-0 text-brand min-h-[44px] border border-line bg-surface" aria-label={`Buy ${i.name} (opens a store, affiliate link)`}>
                  Buy
                </a>
              </BuyIfNeeded>
            </li>
          ))}
        </ul>
      )}
      {b.note && <p className="mt-2 text-sm text-muted">{b.note}</p>}
      {b.links.length > 0 && (
        <ul className="mt-2 space-y-1 text-sm">
          {b.links.map((l) => (
            <li key={l.url}><a href={l.url} target="_blank" rel="noopener" className="tap underline text-brand">{l.label} ↗</a></li>
          ))}
        </ul>
      )}
    </div>
  );
}
