import { z } from "zod";

/**
 * Conditions under which a catalog item is relevant. The rules engine computes the set of
 * active tags for a household; an item is a candidate when ALL of its `tags` are active
 * (an item with no tags applies to everyone). Tags prefixed with "!" must NOT be active.
 */
export const CATALOG_TAGS = [
  "house_or_townhouse",
  "apartment",
  "recommend_generator",
  "has_generator",
  "owns_generator",
  "owns_solar",
  "earthquake",
  "wildfire",
  "flood",
  "tornado",
  "mobility",
  "fuel_furnace",
  "needs_backup_heat",
  "wood_heat",
  "winter",
  "hot_climate",
  "hurricane",
  "flood_basement",
  "well",
  "medical_device",
  "diapers",
  "infant",
  "children",
  "pets",
  "evacuation",
  "raw_land",
  "vehicles",
  "ev",
  "needs_alt_cooking",
  "long_scenario",
  "needs_filter",
  "large_storage",
] as const;

export const CatalogItemSchema = z.object({
  id: z.string().min(1),
  category: z.string().min(1),
  name: z.string().min(1),
  spec: z.string().min(1),
  models: z.array(z.string()).max(3),
  priceLow: z.number().nonnegative(),
  priceHigh: z.number().nonnegative(),
  /** 1 = fits <$500 budgets … 4 = $5,000+ only. */
  tier: z.number().int().min(1).max(4),
  phase: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  /** Lower number = bought first within a phase. */
  priority: z.number().int().min(1).max(99),
  /** How quantity is determined. A number is a fixed count; a string names a rules-engine quantity. */
  qty: z.union([z.number().int().positive(), z.string()]),
  tags: z.array(z.string()),
  essential: z.boolean().default(false),
  /** Items sharing a group are alternatives (a "slot"): the engine picks one level; people can switch à la carte. */
  group: z.string().optional(),
  /** Level within a group: essential (cheapest that does the job), standard, premium. */
  level: z.enum(["essential", "standard", "premium"]).optional(),
  /** Item ids that no longer apply when this item is chosen (e.g. a standby generator replaces gas cans). */
  excludes: z.array(z.string()).optional(),
  /** Only include this item if an item from this group was included (e.g. gas cans need a generator). */
  requiresGroup: z.string().optional(),
  /** With requiresGroup: bought together with the group item (budget-checked as one bundle). */
  bundle: z.boolean().optional(),
  affiliateUrl: z.string().url().nullable().default(null),
  notes: z.string().default(""),
  active: z.boolean().default(true),
  reviewedAt: z.string(), // ISO date
});

export type CatalogItem = z.infer<typeof CatalogItemSchema>;
export const LEVELS = ["essential", "standard", "premium"] as const;
export type Level = (typeof LEVELS)[number];
export const LEVEL_LABEL: Record<Level, string> = { essential: "Essential", standard: "Standard", premium: "Premium" };
