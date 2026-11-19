import type { CatalogItem } from "@/lib/catalog/types";
import { BRAND } from "@/lib/brand";

/** Destination for an item's Buy button, or null when it has none. Amazon search links carry the Associates tag. */
export function buyUrl(item: Pick<CatalogItem, "affiliateUrl" | "models" | "name">, amazonTag: string): string | null {
  if (item.affiliateUrl) return item.affiliateUrl;
  if (!amazonTag) return null;
  const query = item.models[0] && !/^any\b/i.test(item.models[0]) && !/local supplier|device-maker|^local\b|already own/i.test(item.models[0]) ? item.models[0] : item.name;
  return `https://www.amazon.com/s?k=${encodeURIComponent(query)}&tag=${encodeURIComponent(amazonTag)}`;
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
