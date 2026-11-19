import type { CatalogItem } from "@/lib/catalog/types";
import { BRAND } from "@/lib/brand";

/**
 * Destination for an item's Buy button. An item's own affiliate URL wins; otherwise an Amazon search for its
 * example model. The search carries the Associates tag when one is set at /admin; until then it's a plain
 * search (no commission), so every recommendation still has somewhere to buy it.
 */
export function buyUrl(item: Pick<CatalogItem, "affiliateUrl" | "models" | "name">, amazonTag: string): string | null {
  if (item.affiliateUrl) return item.affiliateUrl;
  // "Use what you own" or "buy locally" items get no store link: the plan never sells what someone already has.
  if (item.models.length && item.models.every((m) => NOT_A_PRODUCT.test(m))) return null;
  const specific = item.models.find((m) => !GENERIC.test(m) && !NOT_A_PRODUCT.test(m));
  const query = specific ?? item.name;
  return `https://www.amazon.com/s?k=${encodeURIComponent(query)}${amazonTag ? `&tag=${encodeURIComponent(amazonTag)}` : ""}`;
}

/** Example "models" that are advice, not products (reuse what you own, buy locally). */
const NOT_A_PRODUCT = /already own|use old|match current|rotate favorites|local supplier|local shed builder|^local\b/i;
/** Generic examples ("Any store brand"): search by the item's name instead. */
const GENERIC = /^any\b|device-maker/i;

/** True when buying through this item's link earns a commission (its own affiliate URL, or a tagged Amazon search). */
export function earnsCommission(item: Pick<CatalogItem, "affiliateUrl">, amazonTag: string): boolean {
  return !!item.affiliateUrl || !!amazonTag;
}

export const AFFILIATE_DISCLOSURE =
  `${BRAND.name} earns a commission when you buy through Buy links, at no extra cost to you. Recommendations come from the specs and your budget, not from commissions.`;

/**
 * Amazon's Associates agreement doesn't allow its links in email or offline material (PDFs).
 * Only non-Amazon affiliate URLs may appear in emails; Amazon items link back to the plan page instead.
 */
export function isAmazon(url: string): boolean {
  try {
    const h = new URL(url).hostname.toLowerCase();
    return /(^|\.)amazon\.[a-z.]+$/.test(h) || h === "amzn.to" || h.endsWith(".amzn.to");
  } catch {
    return false;
  }
}
export function emailSafeBuyUrl(item: Pick<CatalogItem, "affiliateUrl" | "models" | "name">, amazonTag: string): boolean {
  const u = buyUrl(item, amazonTag);
  return !!u && !isAmazon(u);
}
