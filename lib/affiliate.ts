import type { CatalogItem } from "@/lib/catalog/types";

/** Destination for an item's Buy button, or null when it has none. Amazon search links carry the Associates tag. */
export function buyUrl(item: Pick<CatalogItem, "affiliateUrl" | "models" | "name">, amazonTag: string): string | null {
  if (item.affiliateUrl) return item.affiliateUrl;
  if (!amazonTag) return null;
  const query = item.models[0] && !/^any\b/i.test(item.models[0]) && !/local supplier|device-maker/i.test(item.models[0]) ? item.models[0] : item.name;
  return `https://www.amazon.com/s?k=${encodeURIComponent(query)}&tag=${encodeURIComponent(amazonTag)}`;
}

export const AFFILIATE_DISCLOSURE =
  "ReadyPlan earns a commission when you buy through Buy links, at no extra cost to you. Recommendations come from the specs and your budget, not from commissions.";
