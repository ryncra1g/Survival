import { SEED_CATALOG } from "./seed";
import type { CatalogItem } from "./types";

/**
 * One catalog order for every store (docs/review/08_STORE_AUDIT.md). The rules engine keeps catalog order for items
 * that tie on phase and priority, so the order changes plans. Seed items come in seed order (the order the tests
 * use); items added later in the admin come after them, by id.
 */
const SEED_INDEX = new Map(SEED_CATALOG.map((i, n) => [i.id, n]));
export function canonicalCatalogOrder(items: CatalogItem[]): CatalogItem[] {
  const rank = (i: CatalogItem) => SEED_INDEX.get(i.id) ?? Number.MAX_SAFE_INTEGER;
  return [...items].sort((a, b) => rank(a) - rank(b) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}
