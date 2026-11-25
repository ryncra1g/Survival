import type { CatalogItem } from "./types";

/**
 * Row mapping between CatalogItem and the gear_catalog table (migrations 0001 + 0009).
 * Every CatalogItem field round-trips: catOut(catIn(item)) deep-equals item (tests/catalog-db.test.ts), and the
 * Postgres-backed store test re-seeds the whole catalog and compares (tests/store.supabase.test.ts).
 * Optional fields are left out (not set to undefined) when the row has nothing, so a seed item comes back exactly.
 */
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
  /** 0009 (CAT-01): Essential / Standard / Premium within the group. */
  level: "essential" | "standard" | "premium" | null;
  /** 0009 (CAT-01): item ids this item replaces when chosen. Empty array when none. */
  excludes: string[];
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
  models: r.models ?? [],
  priceLow: Number(r.price_low),
  priceHigh: Number(r.price_high),
  tier: r.tier,
  phase: r.phase,
  priority: r.priority,
  qty: /^\d+$/.test(r.qty) ? Number(r.qty) : r.qty,
  tags: r.tags ?? [],
  essential: r.essential,
  ...(r.item_group ? { group: r.item_group } : {}),
  ...(r.level ? { level: r.level } : {}),
  ...(r.excludes?.length ? { excludes: r.excludes } : {}),
  ...(r.requires_group ? { requiresGroup: r.requires_group } : {}),
  ...(r.bundle ? { bundle: true } : {}),
  affiliateUrl: r.affiliate_url,
  notes: r.notes,
  active: r.active,
  reviewedAt: String(r.reviewed_at).slice(0, 10),
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
  level: i.level ?? null,
  excludes: i.excludes ?? [],
  requires_group: i.requiresGroup ?? null,
  bundle: !!i.bundle,
  affiliate_url: i.affiliateUrl,
  notes: i.notes,
  active: i.active,
  reviewed_at: i.reviewedAt,
});
