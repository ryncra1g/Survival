import type { CatalogItem } from "./types";

/** Row mapping between CatalogItem and the gear_catalog table. */
export interface CatalogDb {
  id: string;
  category: string;
  name: string;
  spec: string;
  models: string[];
  price_low: number;
  price_high: number;
  tier: number;
  phase: 1 | 2 | 3;
  priority: number;
  qty: string;
  tags: string[];
  essential: boolean;
  item_group: string | null;
  requires_group: string | null;
  bundle: boolean;
  affiliate_url: string | null;
  notes: string;
  active: boolean;
  reviewed_at: string;
}
export const catOut = (r: CatalogDb): CatalogItem => ({
  id: r.id,
  category: r.category,
  name: r.name,
  spec: r.spec,
  models: r.models,
  priceLow: Number(r.price_low),
  priceHigh: Number(r.price_high),
  tier: r.tier,
  phase: r.phase,
  priority: r.priority,
  qty: /^\d+$/.test(r.qty) ? Number(r.qty) : r.qty,
  tags: r.tags,
  essential: r.essential,
  group: r.item_group ?? undefined,
  requiresGroup: r.requires_group ?? undefined,
  bundle: r.bundle || undefined,
  affiliateUrl: r.affiliate_url,
  notes: r.notes,
  active: r.active,
  reviewedAt: r.reviewed_at.slice(0, 10),
});
export const catIn = (i: CatalogItem): CatalogDb => ({
  id: i.id,
  category: i.category,
  name: i.name,
  spec: i.spec,
  models: i.models,
  price_low: i.priceLow,
  price_high: i.priceHigh,
  tier: i.tier,
  phase: i.phase,
  priority: i.priority,
  qty: String(i.qty),
  tags: i.tags,
  essential: i.essential,
  item_group: i.group ?? null,
  requires_group: i.requiresGroup ?? null,
  bundle: !!i.bundle,
  affiliate_url: i.affiliateUrl,
  notes: i.notes,
  active: i.active,
  reviewed_at: i.reviewedAt,
});

