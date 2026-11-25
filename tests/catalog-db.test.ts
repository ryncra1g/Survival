import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { catIn, catOut } from "@/lib/catalog/db";
import { SEED_CATALOG } from "@/lib/catalog/seed";
import { CatalogItemSchema, type CatalogItem } from "@/lib/catalog/types";

/**
 * CAT-01: every catalog field must survive the database. If a new field is added to CatalogItemSchema and not to
 * the gear_catalog mapping (lib/catalog/db.ts + a migration), the "every field" test fails here, before production.
 */
describe("gear_catalog mapping (CAT-01)", () => {
  it("every seed item round-trips exactly", () => {
    for (const item of SEED_CATALOG) expect(catOut(catIn(item)), item.id).toStrictEqual(item);
  });

  it("an item with every schema field set round-trips, and no schema field is left unmapped", () => {
    const full: CatalogItem = {
      id: "x-full", category: "Test", name: "Every field", spec: "spec", models: ["A", "B"], priceLow: 10.5, priceHigh: 20, tier: 2, phase: 2,
      priority: 7, qty: "water_jugs", tags: ["mobility", "!apartment"], essential: true, group: "water", level: "premium", excludes: ["gas-cans"],
      requiresGroup: "generator", bundle: true, affiliateUrl: "https://example.com/x", notes: "n", active: false, reviewedAt: "2026-11-25",
    };
    expect(Object.keys(full).sort()).toEqual(Object.keys(CatalogItemSchema.shape).sort());
    expect(catOut(catIn(full))).toStrictEqual(full);
    expect(catOut(catIn({ ...full, qty: 3 })).qty).toBe(3);
  });

  it("migration 0009's backfill sets exactly the seed's levels and excludes", () => {
    const sql = readFileSync("supabase/migrations/0009_catalog_fields.sql", "utf8");
    const rows = [...sql.matchAll(/^update gear_catalog set (.+) where id = '([^']+)' and level is null and excludes = '\{\}';$/gm)];
    const got = new Map(rows.map((m) => {
      const level = /level = '([a-z]+)'/.exec(m[1])?.[1];
      const ex = /excludes = array\[(.+)\]::text\[\]/.exec(m[1])?.[1];
      return [m[2], { level, excludes: ex ? ex.split(", ").map((x) => x.replace(/'/g, "")) : undefined }];
    }));
    const want = SEED_CATALOG.filter((i) => i.level || i.excludes?.length);
    expect(got.size).toBe(want.length);
    for (const i of want) expect(got.get(i.id), i.id).toEqual({ level: i.level, excludes: i.excludes });
  });
});
