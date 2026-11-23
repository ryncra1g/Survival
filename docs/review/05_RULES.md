# Rules

## Diff of lib/rules/constants.ts and lib/rules/engine.ts (PRs #7–#10)

````diff
diff --git a/lib/rules/constants.ts b/lib/rules/constants.ts
index aefe332..ee67c58 100644
--- a/lib/rules/constants.ts
+++ b/lib/rules/constants.ts
@@ -103,6 +103,12 @@ export const DEFAULT_CONSTANTS = {
     /** Days of food bought in Phase 2; the rest is built up gradually in Phase 3. */
     phase2Days: 30,
   },
+  foodMix: {
+    /** D7: planning cost of ready-to-eat food (canned meals, soups, pouches), USD per 1,000 kcal. A price estimate, not a safety amount. */
+    readyCostPer1000Kcal: 3,
+    /** Pounds of dry staples (rice, beans, oats) one food-grade 5-gallon bucket holds. Sizes the containers. */
+    bucketLbs: 30,
+  },
   cash: {
     /** Suggested cash on hand per adult by scenario length (USD). */
     perAdult: { 3: 100, 14: 250, 30: 400, 90: 600 } as Record<string, number>,
@@ -217,6 +223,7 @@ export const RuleConstantsSchema = z.object({
   }),
   evacuation: z.object({ assumedMpg: z.number().positive(), fuelReserveFactor: num, evRangeBufferPct: num }),
   foodBuild: z.object({ phase2Days: z.number().positive() }),
+  foodMix: z.object({ readyCostPer1000Kcal: z.number().positive(), bucketLbs: z.number().positive() }),
   cash: z.object({ perAdult: z.record(z.string(), num) }),
   budget: z.object({
     planningAmount: z.record(z.string(), num),
diff --git a/lib/rules/engine.ts b/lib/rules/engine.ts
index ed728f9..4c87163 100644
--- a/lib/rules/engine.ts
+++ b/lib/rules/engine.ts
@@ -1,4 +1,4 @@
-import type { Answers } from "@/lib/answers/schema";
+import { hasHouseholdFilter, hasPersonalFilter, isDrive, type Answers, type DriveDestination } from "@/lib/answers/schema";
 import type { CatalogItem } from "@/lib/catalog/types";
 import { atLeast, lookupZip, type ZipProfile } from "@/lib/zip/profile";
 import type { RuleConstants } from "./constants";
@@ -153,6 +153,66 @@ export function computeFood(a: Answers, c: RuleConstants): FoodResult {
   };
 }
 
+// ---------------------------------------------------------------- food approaches (D7)
+export type FoodApproach = "bulk" | "ready" | "kits";
+export interface FoodMixResult {
+  /** "mix" = the recommended mix from the household's answers; otherwise the one approach they chose. */
+  choice: "mix" | FoodApproach;
+  shares: Record<FoodApproach, number>;
+  /** Calories from each approach. Always sums to the household's total (never changed by the choice). */
+  kcal: Record<FoodApproach, number>;
+  /** Bulk staples for their share, and food-grade buckets sized to those pounds (none without bulk). */
+  bulk: { staples: FoodResult["staples"]; totalLbs: number; cost: number; buckets: number };
+  readyCost: number;
+}
+
+/** gearChoices.food → approach: essential = bulk staples, standard = ready-to-eat, premium = ration & freeze-dried kits. */
+export const FOOD_LEVEL: Record<SlotLevel, FoodApproach> = { essential: "bulk", standard: "ready", premium: "kits" };
+
+/**
+ * D7: the recommended mix, from answers the household already gave.
+ * It follows the plan's eating order: ready-to-eat (pantry, canned, pouches) for the first 14 days,
+ * bulk staples after that.
+ * - No suitable storage, or no way to cook without grid power (apartment, non-gas stove, no backup power):
+ *   all ready-to-eat (bulk staples need storage and cooking).
+ * - Otherwise ready-to-eat covers min(days, 14) of the days; bulk staples the rest.
+ * - A $5,000+ budget moves a quarter of the bulk share to ration & freeze-dried kits.
+ */
+export const READY_DAYS = 14;
+export function defaultFoodMix(a: Answers): Record<FoodApproach, number> {
+  const canCook = a.cooking === "gas" || a.backupPower !== "none" || a.homeType !== "apartment";
+  if (a.storage.includes("none") || !canCook) return { bulk: 0, ready: 1, kits: 0 };
+  const ready = Math.min(a.scenarioDays, READY_DAYS) / a.scenarioDays;
+  const bulk = 1 - ready;
+  if (a.budget === "5000_plus" && bulk > 0) return { bulk: bulk * 0.75, ready, kits: bulk * 0.25 };
+  return { bulk, ready, kits: 0 };
+}
+
+export function computeFoodMix(a: Answers, c: RuleConstants, food: FoodResult): FoodMixResult {
+  const chosen = a.gearChoices?.food;
+  const choice: FoodMixResult["choice"] = chosen ? FOOD_LEVEL[chosen] : "mix";
+  const shares = choice === "mix" ? defaultFoodMix(a) : { bulk: 0, ready: 0, kits: 0, [choice]: 1 };
+  const kcalOf = (k: FoodApproach) => Math.round(food.totalKcal * shares[k]);
+  const kcal = { bulk: kcalOf("bulk"), ready: kcalOf("ready"), kits: 0 };
+  kcal.kits = food.totalKcal - kcal.bulk - kcal.ready; // exact total, no rounding drift
+  const staples = shares.bulk > 0
+    ? c.staples.map((s) => {
+        const k = food.totalKcal * shares.bulk * s.share;
+        const lbs = ceil(round(k / s.kcalPerLb, 4));
+        const units = ceil(round(lbs / s.unitLbs, 4));
+        return { key: s.key, name: s.name, kcal: Math.round(k), lbs, units, unit: s.unit, cost: round(units * s.costPerUnit, 0) };
+      })
+    : [];
+  const totalLbs = staples.reduce((t, s) => t + s.lbs, 0);
+  return {
+    choice,
+    shares,
+    kcal,
+    bulk: { staples, totalLbs, cost: staples.reduce((t, s) => t + s.cost, 0), buckets: totalLbs ? ceil(totalLbs / c.foodMix.bucketLbs) : 0 },
+    readyCost: round((kcal.ready / 1000) * c.foodMix.readyCostPer1000Kcal, 0),
+  };
+}
+
 // ---------------------------------------------------------------- diapers / formula
 export interface DiaperResult {
   children: number;
@@ -350,7 +410,8 @@ export function heatStrategy(a: Answers, profile: ZipProfile, power: PowerResult
 
 // ---------------------------------------------------------------- evacuation
 export interface EvacResult {
-  locationType: "friends_family" | "second_property" | "raw_land";
+  /** Where they'd drive to (D4 Q2). Public shelter and "not sure yet" have no drive, so no fuel math. */
+  locationType: DriveDestination;
   distanceMiles: number;
   oneWayGalPerVehicle: number;
   reserveGalPerVehicle: number;
@@ -359,11 +420,12 @@ export interface EvacResult {
   vehicles: number;
 }
 export function computeEvac(a: Answers, c: RuleConstants): EvacResult | null {
-  if (a.evacuation.mode !== "fallback" || !a.evacuation.locationType || !a.evacuation.distanceMiles) return null;
+  const dest = a.evacuation.destination;
+  if (!isDrive(dest) || !a.evacuation.distanceMiles) return null;
   const d = a.evacuation.distanceMiles;
   const oneWay = round(d / c.evacuation.assumedMpg, 1);
   return {
-    locationType: a.evacuation.locationType,
+    locationType: dest,
     distanceMiles: d,
     oneWayGalPerVehicle: oneWay,
     reserveGalPerVehicle: round(oneWay * c.evacuation.fuelReserveFactor, 1),
@@ -401,13 +463,20 @@ export function computeTags(a: Answers, profile: ZipProfile, power: PowerResult,
   if (h.infants) t.add("infant");
   if (h.children) t.add("children");
   if (a.pets.length) t.add("pets");
-  if (a.evacuation.mode === "fallback") t.add("evacuation");
-  if (a.evacuation.locationType === "raw_land") t.add("raw_land");
+  if (isDrive(a.evacuation.destination) && a.evacuation.distanceMiles) t.add("evacuation");
+  if (a.evacuation.destination === "raw_land") t.add("raw_land");
+  if (a.evacuation.destination === "hotel") t.add("evac_hotel");
+  if (a.evacuation.destination === "public_shelter") t.add("evac_shelter");
+  if (hasPersonalFilter(a)) t.add("has_personal_filter");
+  // D6 water kit: spare elements for a household filter they own or are told to buy.
+  if (hasHouseholdFilter(a) || a.scenarioDays > 14) t.add("filter_kit");
+  if (a.storage.includes("none")) t.add("no_storage");
   if (a.vehicleFuels.length) t.add("vehicles");
   if (a.vehicleFuels.includes("ev")) t.add("ev");
   if (a.cooking !== "gas") t.add("needs_alt_cooking");
   if (a.scenarioDays > 14) t.add("long_scenario");
-  if (a.scenarioDays > 14 && !a.hasFiltration) t.add("needs_filter");
+  // A personal (straw or bottle) filter is for the go-bag; only a household filter covers the household (D6).
+  if (a.scenarioDays > 14 && !hasHouseholdFilter(a)) t.add("needs_filter");
   if (a.storage.some((s) => s === "garage" || s === "basement" || s === "shed")) t.add("large_storage");
   return t;
 }
@@ -441,7 +510,8 @@ export interface BudgetPhase {
 export type SlotLevel = "essential" | "standard" | "premium";
 const LEVEL_RANK: Record<SlotLevel, number> = { essential: 0, standard: 1, premium: 2 };
 export interface SlotOption {
-  level: SlotLevel;
+  /** "mix" only for the food slot: the recommended mix of approaches (D7). */
+  level: SlotLevel | "mix";
   itemId: string;
   name: string;
   qty: number;
@@ -452,7 +522,7 @@ export interface SlotOption {
 export interface Slot {
   group: string;
   chosen: string | null;
-  chosenLevel: SlotLevel | null;
+  chosenLevel: SlotLevel | "mix" | null;
   byChoice: boolean;
   options: SlotOption[];
 }
@@ -474,7 +544,7 @@ export function isStale(item: CatalogItem, now: Date, c: RuleConstants): boolean
   return (now.getTime() - reviewed.getTime()) / 86_400_000 > c.catalog.staleAfterDays;
 }
 
-export function resolveQty(item: CatalogItem, ctx: { water: WaterResult; power: PowerResult; h: Household; a: Answers; foodKcal: number }): number {
+export function resolveQty(item: CatalogItem, ctx: { water: WaterResult; power: PowerResult; h: Household; a: Answers; foodKcal: number; foodBuckets?: number }): number {
   if (typeof item.qty === "number") return item.qty;
   switch (item.qty) {
     case "co_alarms":
@@ -483,6 +553,8 @@ export function resolveQty(item: CatalogItem, ctx: { water: WaterResult; power:
       return ctx.water.jugs;
     case "water_bricks":
       return Math.ceil(Math.max(0, ctx.water.storedGal - ctx.water.drums * 55) / 3.5);
+    case "food_buckets":
+      return ctx.foodBuckets ?? 0;
     case "freeze_dried_units":
       return Math.ceil(ctx.foodKcal / (2000 * 30));
     case "water_gallons":
@@ -511,9 +583,11 @@ export function computeBudget(
   c: RuleConstants,
   catalog: CatalogItem[],
   tags: Set<string>,
-  ctx: { water: WaterResult; power: PowerResult; h: Household; a: Answers; foodKcal: number },
+  ctx: { water: WaterResult; power: PowerResult; h: Household; a: Answers; foodKcal: number; foodBuckets?: number },
   consumables: ConsumableLine[],
   now: Date,
+  /** D7: include ration & freeze-dried kits as gear (the food mix has a kits share). */
+  kitsWanted = false,
 ): BudgetResult {
   const planningAmount = c.budget.planningAmount[a.budget];
   const tier = c.budget.tierByBudget[a.budget];
@@ -530,7 +604,7 @@ export function computeBudget(
       staleHidden.push(it.id);
       return false;
     }
-    if (it.group === "food") return choices.food === "premium";
+    if (it.group === "food") return kitsWanted; // kits are gear when the food mix includes them (D7)
     if (it.group) return true; // every level of a slot is listed; the default level depends on the budget
     if (it.tier > tier && !it.essential && it.phase === 1) aboveTier.push(it);
     return it.tier <= tier || it.essential;
@@ -665,7 +739,18 @@ export function computeBudget(
   const ongoingCost = consumables.filter((l) => l.ongoing).reduce((t, l) => t + l.cost, 0);
   // Excluded items (e.g. gas cans with a standby generator) never show as picks or next purchases.
   const keep = (p: GearPick) => !excluded.has(p.item.id);
-  return { planningAmount, totalMid: round(spent, 0), phases, consumables, ongoingCost, picks: picks.filter(keep), deferred: deferred.filter(keep), staleHidden, cutFirst, slots };
+  // D3: safety items always come first (CO alarms, then water, then first aid). The sort is stable and uses
+  // only the item's role, never price or commission, so everything else keeps the engine's order.
+  const ordered = [...picks].sort((x, y) => safetyRank(x) - safetyRank(y));
+  return { planningAmount, totalMid: round(spent, 0), phases, consumables, ongoingCost, picks: ordered.filter(keep), deferred: deferred.filter(keep), staleHidden, cutFirst, slots };
+}
+
+/** D3: CO alarms, water and first aid lead the shopping list. Everything else ranks after them, unchanged. */
+export function safetyRank(p: { item: Pick<CatalogItem, "id" | "group"> }): number {
+  if (p.item.id === "co-alarm") return 0;
+  if (p.item.group === "water") return 1; // stored-water containers (the water slot)
+  if (p.item.id === "first-aid") return 2;
+  return 3;
 }
 
 // ---------------------------------------------------------------- top level
@@ -690,6 +775,8 @@ export interface ComputedPlan {
   tags: string[];
   water: WaterResult;
   food: FoodResult;
+  /** D7: how the calories are supplied (bulk / ready-to-eat / kits) and the containers bulk needs. */
+  foodMix: FoodMixResult;
   diapers: DiaperResult | null;
   formula: FormulaResult | null;
   sanitation: SanitationResult;
@@ -731,32 +818,43 @@ export function computePlan(a: Answers, c: RuleConstants, catalog: CatalogItem[]
   consumables.push({ key: "sanitation", label: `Toilet paper (${sanitation.toiletPaperRolls} rolls) + waste bags (${sanitation.wasteBags})`, phase: 1, cost: sanitation.cost });
   if (diapers) consumables.push({ key: "diapers", label: `Diapers (${diapers.total}) + wipes (${diapers.wipesPacks} packs)`, phase: 1, cost: diapers.cost });
   if (formula) consumables.push({ key: "formula", label: `Infant formula (${formula.cans} cans)`, phase: 1, cost: formula.cost });
+  // D7: food comes from a mix of approaches (bulk staples, ready-to-eat, ration & freeze-dried kits).
+  // The calorie total never changes; only how it's supplied. Bulk + ready-to-eat are grocery consumables;
+  // kits are catalog gear (freeze-dried units sized to the kits' calories).
+  const foodMix = computeFoodMix(a, c, food);
+  const groceryCost = foodMix.bulk.cost + foodMix.readyCost;
   const p2Days = Math.min(a.scenarioDays, c.foodBuild.phase2Days);
-  const p2Cost = round((food.cost * p2Days) / a.scenarioDays, 0);
-  consumables.push({ key: "food", label: `Food staples, first ${p2Days} days`, phase: 2, cost: p2Cost });
-  if (a.scenarioDays > p2Days)
-    consumables.push({ key: "food_rest", label: `Food staples, days ${p2Days + 1}–${a.scenarioDays} (build up with each grocery trip)`, phase: 3, cost: food.cost - p2Cost, ongoing: true });
+  const p2Cost = round((groceryCost * p2Days) / a.scenarioDays, 0);
+  if (groceryCost > 0) {
+    consumables.push({ key: "food", label: `Food, first ${p2Days} days`, phase: 2, cost: p2Cost });
+    if (a.scenarioDays > p2Days)
+      consumables.push({ key: "food_rest", label: `Food, days ${p2Days + 1}–${a.scenarioDays} (build up with each grocery trip)`, phase: 3, cost: groceryCost - p2Cost, ongoing: true });
+  }
   if (pets) consumables.push({ key: "pet_food", label: `Pet food (${pets.foodLbs} lb)`, phase: 2, cost: pets.cost });
 
-  // Food slot: DIY bulk staples (default) or freeze-dried long-term food (premium, by choice only).
-  const freezeDried = a.gearChoices?.food === "premium";
-  const cons = freezeDried ? consumables.filter((l) => l.key !== "food" && l.key !== "food_rest") : consumables;
-  const ctx = { water, power, h, a, foodKcal: food.totalKcal };
-  const budget = computeBudget(a, c, catalog, tags, ctx, cons, now);
+  const ctx = { water, power, h, a, foodKcal: foodMix.kcal.kits, foodBuckets: foodMix.bulk.buckets };
+  const budget = computeBudget(a, c, catalog, tags, ctx, consumables, now, foodMix.kcal.kits > 0);
   const fd = catalog.find((i) => i.id === "food-freeze-dried" && i.active);
   if (fd) {
-    const qty = resolveQty(fd, ctx);
-    const others = budget.slots.filter((s) => s.group !== "food");
+    // Every approach priced for the whole supply, so "Compare food options" shows real differences.
+    const all = computeFoodMix({ ...a, gearChoices: { ...a.gearChoices, food: "essential" } }, c, food);
+    const ready = computeFoodMix({ ...a, gearChoices: { ...a.gearChoices, food: "standard" } }, c, food);
+    const kitQty = Math.ceil(food.totalKcal / (2000 * 30));
+    const mixLow = groceryCost + (foodMix.kcal.kits ? fd.priceLow * resolveQty(fd, ctx) : 0);
+    const mixHigh = groceryCost + (foodMix.kcal.kits ? fd.priceHigh * resolveQty(fd, ctx) : 0);
+    const chosenLevel: SlotLevel | "mix" = foodMix.choice === "mix" ? "mix" : foodMix.choice === "bulk" ? "essential" : foodMix.choice === "ready" ? "standard" : "premium";
     budget.slots = [
-      ...others,
+      ...budget.slots.filter((s) => s.group !== "food"),
       {
         group: "food",
-        chosen: freezeDried ? fd.id : "food-diy",
-        chosenLevel: freezeDried ? "premium" : "essential",
-        byChoice: freezeDried,
+        chosen: { mix: "food-mix", essential: "food-diy", standard: "food-ready", premium: fd.id }[chosenLevel],
+        chosenLevel,
+        byChoice: foodMix.choice !== "mix",
         options: [
-          { level: "essential", itemId: "food-diy", name: "Bulk staples you store yourself", qty: 1, low: food.cost, high: food.cost },
-          { level: "premium", itemId: fd.id, name: fd.name, qty, low: fd.priceLow * qty, high: fd.priceHigh * qty },
+          { level: "mix", itemId: "food-mix", name: `Recommended mix: ${mixLabel(foodMix.shares)}`, qty: 1, low: mixLow, high: mixHigh },
+          { level: "essential", itemId: "food-diy", name: "Bulk staples you store yourself", qty: 1, low: all.bulk.cost, high: all.bulk.cost },
+          { level: "standard", itemId: "food-ready", name: "Ready-to-eat: canned meals and pouches", qty: 1, low: ready.readyCost, high: ready.readyCost },
+          { level: "premium", itemId: fd.id, name: "Ration & freeze-dried kits", qty: kitQty, low: fd.priceLow * kitQty, high: fd.priceHigh * kitQty },
         ],
       },
     ];
@@ -772,6 +870,7 @@ export function computePlan(a: Answers, c: RuleConstants, catalog: CatalogItem[]
     tags: [...tags].sort(),
     water,
     food,
+    foodMix,
     diapers,
     formula,
     sanitation,
@@ -783,3 +882,10 @@ export function computePlan(a: Answers, c: RuleConstants, catalog: CatalogItem[]
     budget,
   };
 }
+
+/** "half bulk staples, half ready-to-eat" style label for a food mix. */
+export function mixLabel(s: Record<FoodApproach, number>): string {
+  const name = { bulk: "bulk staples", ready: "ready-to-eat", kits: "ration & freeze-dried kits" };
+  const parts = (Object.keys(name) as FoodApproach[]).filter((k) => s[k] > 0).map((k) => `${Math.round(s[k] * 100)}% ${name[k]}`);
+  return parts.length === 1 ? `all ${parts[0].replace(/^100% /, "")}` : parts.join(", ");
+}
````

## foodMix

`lib/rules/constants.ts:106-111`

````ts
  foodMix: {
    /** D7: planning cost of ready-to-eat food (canned meals, soups, pouches), USD per 1,000 kcal. A price estimate, not a safety amount. */
    readyCostPer1000Kcal: 3,
    /** Pounds of dry staples (rice, beans, oats) one food-grade 5-gallon bucket holds. Sizes the containers. */
    bucketLbs: 30,
  },
````

`lib/rules/engine.ts:155-225`

````ts

// ---------------------------------------------------------------- food approaches (D7)
export type FoodApproach = "bulk" | "ready" | "kits";
export interface FoodMixResult {
  /** "mix" = the recommended mix from the household's answers; otherwise the one approach they chose. */
  choice: "mix" | FoodApproach;
  shares: Record<FoodApproach, number>;
  /** Calories from each approach. Always sums to the household's total (never changed by the choice). */
  kcal: Record<FoodApproach, number>;
  /** Bulk staples for their share, and food-grade buckets sized to those pounds (none without bulk). */
  bulk: { staples: FoodResult["staples"]; totalLbs: number; cost: number; buckets: number };
  readyCost: number;
}

/** gearChoices.food → approach: essential = bulk staples, standard = ready-to-eat, premium = ration & freeze-dried kits. */
export const FOOD_LEVEL: Record<SlotLevel, FoodApproach> = { essential: "bulk", standard: "ready", premium: "kits" };

/**
 * D7: the recommended mix, from answers the household already gave.
 * It follows the plan's eating order: ready-to-eat (pantry, canned, pouches) for the first 14 days,
 * bulk staples after that.
 * - No suitable storage, or no way to cook without grid power (apartment, non-gas stove, no backup power):
 *   all ready-to-eat (bulk staples need storage and cooking).
 * - Otherwise ready-to-eat covers min(days, 14) of the days; bulk staples the rest.
 * - A $5,000+ budget moves a quarter of the bulk share to ration & freeze-dried kits.
 */
export const READY_DAYS = 14;
export function defaultFoodMix(a: Answers): Record<FoodApproach, number> {
  const canCook = a.cooking === "gas" || a.backupPower !== "none" || a.homeType !== "apartment";
  if (a.storage.includes("none") || !canCook) return { bulk: 0, ready: 1, kits: 0 };
  const ready = Math.min(a.scenarioDays, READY_DAYS) / a.scenarioDays;
  const bulk = 1 - ready;
  if (a.budget === "5000_plus" && bulk > 0) return { bulk: bulk * 0.75, ready, kits: bulk * 0.25 };
  return { bulk, ready, kits: 0 };
}

export function computeFoodMix(a: Answers, c: RuleConstants, food: FoodResult): FoodMixResult {
  const chosen = a.gearChoices?.food;
  const choice: FoodMixResult["choice"] = chosen ? FOOD_LEVEL[chosen] : "mix";
  const shares = choice === "mix" ? defaultFoodMix(a) : { bulk: 0, ready: 0, kits: 0, [choice]: 1 };
  const kcalOf = (k: FoodApproach) => Math.round(food.totalKcal * shares[k]);
  const kcal = { bulk: kcalOf("bulk"), ready: kcalOf("ready"), kits: 0 };
  kcal.kits = food.totalKcal - kcal.bulk - kcal.ready; // exact total, no rounding drift
  const staples = shares.bulk > 0
    ? c.staples.map((s) => {
        const k = food.totalKcal * shares.bulk * s.share;
        const lbs = ceil(round(k / s.kcalPerLb, 4));
        const units = ceil(round(lbs / s.unitLbs, 4));
        return { key: s.key, name: s.name, kcal: Math.round(k), lbs, units, unit: s.unit, cost: round(units * s.costPerUnit, 0) };
      })
    : [];
  const totalLbs = staples.reduce((t, s) => t + s.lbs, 0);
  return {
    choice,
    shares,
    kcal,
    bulk: { staples, totalLbs, cost: staples.reduce((t, s) => t + s.cost, 0), buckets: totalLbs ? ceil(totalLbs / c.foodMix.bucketLbs) : 0 },
    readyCost: round((kcal.ready / 1000) * c.foodMix.readyCostPer1000Kcal, 0),
  };
}

// ---------------------------------------------------------------- diapers / formula
export interface DiaperResult {
  children: number;
  perDay: number;
  total: number;
  currentSize: number;
  nextSize: number;
  packs: number;
  wipes: number;
  wipesPacks: number;
````

`lib/rules/engine.ts:886-891`

````ts
/** "half bulk staples, half ready-to-eat" style label for a food mix. */
export function mixLabel(s: Record<FoodApproach, number>): string {
  const name = { bulk: "bulk staples", ready: "ready-to-eat", kits: "ration & freeze-dried kits" };
  const parts = (Object.keys(name) as FoodApproach[]).filter((k) => s[k] > 0).map((k) => `${Math.round(s[k] * 100)}% ${name[k]}`);
  return parts.length === 1 ? `all ${parts[0].replace(/^100% /, "")}` : parts.join(", ");
}
````

## Bucket / container calculation

One value for every bulk staple: `foodMix.bucketLbs = 30` lb per food-grade 5-gallon bucket (an estimate; logged in BUILD_LOG Assumptions). Buckets = ceil(total bulk lb / 30), and 0 when the bulk share is 0. The per-staple pounds come from `computeFood` (`staples`, unchanged) scaled by the bulk share; the bucket count is over their total, not per staple.

`lib/rules/engine.ts:132-154` (staples and pounds)

````ts
export function computeFood(a: Answers, c: RuleConstants): FoodResult {
  const perPerson: { label: string; kcal: number }[] = [];
  for (let i = 0; i < a.adults; i++) perPerson.push({ label: `Adult ${i + 1}`, kcal: c.calories.adultPerDay });
  [...a.childrenAges]
    .sort((x, y) => x - y)
    .forEach((age) => perPerson.push({ label: `Child, age ${age}`, kcal: childCalories(age, c) }));
  const dailyKcal = perPerson.reduce((t, p) => t + p.kcal, 0);
  const totalKcal = dailyKcal * a.scenarioDays;
  const staples = c.staples.map((s) => {
    const kcal = totalKcal * s.share;
    const lbs = ceil(round(kcal / s.kcalPerLb, 4));
    const units = ceil(round(lbs / s.unitLbs, 4));
    return { key: s.key, name: s.name, kcal: Math.round(kcal), lbs, units, unit: s.unit, cost: round(units * s.costPerUnit, 0) };
  });
  return {
    dailyKcal,
    totalKcal,
    perPerson,
    staples,
    totalLbs: staples.reduce((t, s) => t + s.lbs, 0),
    cost: staples.reduce((t, s) => t + s.cost, 0),
  };
}
````

````text
lib/catalog/seed.ts:233:    id: "storage-kit", category: "Food", name: "Food storage buckets",
lib/catalog/seed.ts:236:    qty: "food_buckets", tags: [], notes: "Priced per bucket (estimate); the plan sizes the count to the bulk staples (D7)",
lib/plan/build.ts:553:    storeTips.push({ id: "store-basement", text: a.hasBasement && atLeast(prof.flood, "moderate") ? "Basement: water and canned food on shelves at least a foot off the floor (your area floods); nothing you'd need in a flood down there." : "Basement: cool and dark, ideal for water and staples; keep them on shelves, off bare concrete.", buy: ["water-drum", "storage-kit", "water-jug"], link: HOWTO.kit });
lib/plan/build.ts:555:    storeTips.push({ id: "store-garage", text: "Garage: water jugs and bulk staples in sealed bins, away from the car's exhaust, chemicals and direct sun; not for anything that spoils in heat.", buy: ["storage-kit", "water-jug", "water-drum"], link: HOWTO.kit });
lib/plan/build.ts:559:    storeTips.push({ id: "store-closets", text: "Closets: water bricks or 7-gallon jugs on the floor, food in labelled bins on the top shelf, go-bags by the door.", buy: ["water-bricks", "water-jug", "storage-kit"], link: HOWTO.kit });
lib/plan/build.ts:561:    storeTips.push({ id: "store-other-indoor", text: "Other indoor space (a spare room, under the stairs or beds): water bricks and labelled bins, away from heaters and direct sun.", buy: ["water-bricks", "storage-kit", "water-jug"], link: HOWTO.kit });
lib/plan/help.ts:38:  [/pantry|food list|lb of staples/i, () => ({ buy: ["storage-kit", "food-freeze-dried"], see: s("Your food list", "food") })],
lib/plan/help.ts:115:    case "food": return { buy: ["storage-kit", "food-freeze-dried", "coolers", "thermometers"], links: [HOWTO.foodSafety, HOWTO.outageHealth], note: "Rice, beans, oats, pasta, oil and canned goods are cheapest at a grocery store or warehouse club." };
lib/rules/constants.ts:110:    bucketLbs: 30,
lib/rules/constants.ts:226:  foodMix: z.object({ readyCostPer1000Kcal: z.number().positive(), bucketLbs: z.number().positive() }),
lib/rules/engine.ts:211:    bulk: { staples, totalLbs, cost: staples.reduce((t, s) => t + s.cost, 0), buckets: totalLbs ? ceil(totalLbs / c.foodMix.bucketLbs) : 0 },
lib/rules/engine.ts:547:export function resolveQty(item: CatalogItem, ctx: { water: WaterResult; power: PowerResult; h: Household; a: Answers; foodKcal: number; foodBuckets?: number }): number {
lib/rules/engine.ts:556:    case "food_buckets":
lib/rules/engine.ts:557:      return ctx.foodBuckets ?? 0;
lib/rules/engine.ts:586:  ctx: { water: WaterResult; power: PowerResult; h: Household; a: Answers; foodKcal: number; foodBuckets?: number },
lib/rules/engine.ts:835:  const ctx = { water, power, h, a, foodKcal: foodMix.kcal.kits, foodBuckets: foodMix.bulk.buckets };
````

## "$X over your budget"

The plan total is the middle of the gear total range; the cap is the top of the stated range (`BUDGET_CAP`, null for $5,000+). Over = total − cap, shown only when positive.

````text
lib/plan/build.ts:103:const BUDGET_CAP: Record<Answers["budget"], number | null> = { under_500: 500, "500_1500": 1500, "1500_5000": 5000, "5000_plus": null };
lib/plan/build.ts:1229:      cap: BUDGET_CAP[a.budget],
````

`lib/plan/build.ts:102-103` (BUDGET_CAP)

````ts
/** D3: the top of each stated budget range ("$X over your budget" compares with it). The stated budget is never changed. */
const BUDGET_CAP: Record<Answers["budget"], number | null> = { under_500: 500, "500_1500": 1500, "1500_5000": 5000, "5000_plus": null };
````

`lib/plan/compare.ts:1-56`

````ts
import type { LevelOption, Overview } from "./document";
import { usd } from "./format";

/**
 * D3 / GEAR-01: "Compare options" for one gear slot. The budget is a flexible target, not a cap:
 * every level stays available; each shows the price difference, the plan's new total and, when that
 * goes past the top of the stated budget, "$X over your budget". The stated budget never changes.
 * Prices are the catalog's line totals (price × quantity); totals use the middle of each range.
 * The food slot (D7) has no lower/upgrade order: its approaches are listed as alternatives.
 */
export type CompareRow = {
  level: LevelOption["level"];
  name: string;
  price: string;
  /** Difference from the current pick, e.g. "+$120" or "−$40". */
  diff: string;
  /** The plan's gear total with this option instead, e.g. "$2,410". */
  newTotal: string;
  /** "$310 over your budget", or null when within it (or the budget has no top). */
  over: string | null;
};

export const LEVEL_LABEL: Record<LevelOption["level"], string> = { mix: "Recommended mix", essential: "Essential", standard: "Standard", premium: "Premium" };
const ORDER: Record<LevelOption["level"], number> = { mix: -1, essential: 0, standard: 1, premium: 2 };
const mid = (lo = 0, hi = 0) => (lo + hi) / 2;

export function compareOptions(
  levels: LevelOption[],
  budget: Overview["budget"],
): { current: LevelOption | undefined; lower: CompareRow[]; upgrade: CompareRow[]; alternatives: CompareRow[] } {
  const current = levels.find((l) => l.selected);
  const empty = { current, lower: [], upgrade: [], alternatives: [] };
  if (!current || current.low === undefined || !budget) return empty;
  const totalMid = mid(budget.totalLow, budget.totalHigh);
  const row = (l: LevelOption): CompareRow => {
    const d = Math.round(mid(l.low, l.high) - mid(current.low, current.high));
    const total = Math.round(totalMid + d);
    const over = budget.cap !== null && total > budget.cap ? `${usd(total - budget.cap)} over your budget` : null;
    return { level: l.level, name: l.name, price: l.price, diff: `${d >= 0 ? "+" : "−"}${usd(Math.abs(d))}`, newTotal: usd(total), over };
  };
  const others = levels.filter((l) => !l.selected && l.low !== undefined);
  if (levels.some((l) => l.level === "mix")) return { ...empty, alternatives: others.map(row) };
  return {
    ...empty,
    lower: others.filter((l) => ORDER[l.level] < ORDER[current.level]).sort((a, b) => ORDER[b.level] - ORDER[a.level]).map(row),
    upgrade: others.filter((l) => ORDER[l.level] > ORDER[current.level]).sort((a, b) => ORDER[a.level] - ORDER[b.level]).map(row),
  };
}

/** The plan's own position against the stated budget, e.g. "$120 over your budget ($1,500–5,000)". */
export function budgetStatus(budget: Overview["budget"]): string | null {
  if (!budget || budget.cap === null) return null;
  const total = Math.round(mid(budget.totalLow, budget.totalHigh));
  return total > budget.cap ? `${usd(total - budget.cap)} over your budget (${budget.label})` : null;
}

````

## Safety-first ordering

`lib/rules/engine.ts:735-746`

````ts
    .filter((p) => !p.item.essential && !p.item.group && !p.item.bundle && p.item.category !== "Water" && p.item.category !== "Life safety" && p.item.category !== "Medical power")
    .sort((x, y) => y.phase - x.phase || y.item.priority - x.item.priority)
    .slice(0, 3)
    .map((p) => p.item.name);
  const ongoingCost = consumables.filter((l) => l.ongoing).reduce((t, l) => t + l.cost, 0);
  // Excluded items (e.g. gas cans with a standby generator) never show as picks or next purchases.
  const keep = (p: GearPick) => !excluded.has(p.item.id);
  // D3: safety items always come first (CO alarms, then water, then first aid). The sort is stable and uses
  // only the item's role, never price or commission, so everything else keeps the engine's order.
  const ordered = [...picks].sort((x, y) => safetyRank(x) - safetyRank(y));
  return { planningAmount, totalMid: round(spent, 0), phases, consumables, ongoingCost, picks: ordered.filter(keep), deferred: deferred.filter(keep), staleHidden, cutFirst, slots };
}
````

`lib/rules/engine.ts:748-754`

````ts
/** D3: CO alarms, water and first aid lead the shopping list. Everything else ranks after them, unchanged. */
export function safetyRank(p: { item: Pick<CatalogItem, "id" | "group"> }): number {
  if (p.item.id === "co-alarm") return 0;
  if (p.item.group === "water") return 1; // stored-water containers (the water slot)
  if (p.item.id === "first-aid") return 2;
  return 3;
}
````

## Hand-computed values the tests check

For each test in the rules-related files: the test name, then each `expect` line that compares against a literal value (input → expected as written in the test). Values computed by the same code are not listed.

### `tests/rules.test.ts`

- **sample household: 2 adults, 2 kids, medium dog, 90 days (line 20)**
  - `22: expect(w.dailyGal).toBe(3.85); // 2×1 + 2×0.75 + 0.35`
  - `23: expect(w.storedDays).toBe(14); // min(14, 90)`
  - `24: expect(w.storedGal).toBe(54); // ceil(3.85 × 14 = 53.9)`
  - `25: expect(w.filterDays).toBe(76);`
  - `26: expect(w.filterGal).toBe(293); // ceil(3.85 × 76 = 292.6)`
  - `27: expect(w.jugs).toBe(8); // ceil(54 / 7)`
  - `28: expect(w.drums).toBe(0); // 54 ≤ 60 drum threshold`
  - `29: expect(w.threeDayGal).toBe(12); // ceil(11.55)`
- **72-hour single adult stores everything, no filtration (line 32)**
  - `34: expect(w.dailyGal).toBe(1);`
  - `35: expect(w.storedGal).toBe(3);`
  - `36: expect(w.filterDays).toBe(0);`
  - `37: expect(w.filterGal).toBe(0);`
- **stored target is capped at 14 days for 30-day scenarios (line 40)**
  - `42: expect(w.storedGal).toBe(28);`
  - `43: expect(w.filterGal).toBe(32);`
- **uses drums for large stored volumes with garage/basement space (line 46)**
  - `49: expect(w.storedGal).toBe(84);`
  - `50: expect(w.drums).toBe(1);`
  - `51: expect(w.jugs).toBe(5);`
- **never puts drums in apartments (line 54)**
  - `56: expect(w.drums).toBe(0);`
  - `57: expect(w.jugs).toBe(12);`
- **pet water by size and type (line 60)**
  - `72: expect(w.dailyGal).toBe(2.3); // 1 + 2×0.6 + 0.1`
- **child age bands (line 77)**
  - `78: expect(childCalories(0, C)).toBe(800);`
  - `79: expect(childCalories(2, C)).toBe(1000);`
  - `80: expect(childCalories(3, C)).toBe(1000);`
  - `81: expect(childCalories(4, C)).toBe(1400);`
  - `82: expect(childCalories(8, C)).toBe(1400);`
  - `83: expect(childCalories(9, C)).toBe(1800);`
  - `84: expect(childCalories(14, C)).toBe(2200);`
- **sample household daily and total calories (line 87)**
  - `89: expect(f.dailyKcal).toBe(7000); // 2×2300 + 1000 + 1400`
  - `90: expect(f.totalKcal).toBe(630000); // × 90`
- **staple pounds and units (line 93)**
  - `97: expect(get("rice").lbs).toBe(100);`
  - `98: expect(get("rice").units).toBe(5);`
  - `100: expect(get("beans").lbs).toBe(53);`
  - `101: expect(get("beans").units).toBe(6);`
  - `103: expect(get("oil").lbs).toBe(13);`
  - `104: expect(get("oil").units).toBe(2);`
  - `106: expect(get("peanut_butter").lbs).toBe(20);`
  - `107: expect(get("peanut_butter").units).toBe(8);`
- **staple shares sum to 1 so every calorie is allocated (line 110)**
  - `112: expect(f.staples.reduce((t, s) => t + s.kcal, 0)).toBeCloseTo(630000, -1);`
- **sample: one child in diapers for 90 days, split current/next size (line 117)**
  - `120: expect(h.childrenInDiapers).toBe(1); // age 2 only (age 4 is over maxAge 3)`
  - `121: expect(d.perDay).toBe(6);`
  - `122: expect(d.total).toBe(540);`
  - `123: expect(d.currentSize).toBe(270);`
  - `124: expect(d.nextSize).toBe(270);`
  - `125: expect(d.wipes).toBe(720);`
  - `126: expect(d.wipesPacks).toBe(9);`
- **no next-size split at 30 days or less (line 129)**
  - `132: expect(d.total).toBe(360); // 2 × 6 × 30`
  - `133: expect(d.nextSize).toBe(0);`
- **1 roll/person/week, weeks rounded up (line 143)**
  - `145: expect(s.weeks).toBe(13); // ceil(90/7)`
  - `146: expect(s.toiletPaperRolls).toBe(52); // 4 × 13`
  - `148: expect(s3.toiletPaperRolls).toBe(2);`
- **gas furnace in a moderate-winter climate runs 12 h/day (line 154)**
  - `156: expect(p.hoursPerDay).toBe(12);`
  - `157: expect(p.gasolineGalPerDay).toEqual([3, 4.8]); // 12 × 0.25, 12 × 0.4`
  - `158: expect(p.propaneGalPerDay).toEqual([4.2, 7.2]); // 12 × 0.35, 12 × 0.6`
  - `159: expect(p.storedGasolineGal).toBe(30);`
  - `160: expect(p.storedGasolineDays).toEqual([6.3, 10]); // 30/4.8 = 6.25 → 6.3; 30/3 = 10`
  - `161: expect(p.gasolineTable.find((r) => r.gallons === 20)).toEqual({ gallons: 20, daysLow: 4.2, daysHigh: 6.7 });`
  - `162: expect(p.propane20lbDays).toEqual([0.7, 1.1]); // 4.7/7.2 = 0.65; 4.7/4.2 = 1.12`
  - `163: expect(p.gasCans).toBe(6);`
- **electric heat can't be run by a portable generator: 6 h/day (line 167)**
  - `169: expect(computePower(a, C, li, { furnaceNeedsPower: false }).hoursPerDay).toBe(6);`
- **warm climate uses non-winter hours even with a gas furnace (line 172)**
  - `175: expect(computePower(at({ zip: "33101" }), C, miami, { furnaceNeedsPower: true }).hoursPerDay).toBe(6);`
- **evacuation fuel (line 186)**
  - `187: expect(cp.evacuation!.oneWayGalPerVehicle).toBe(4.8); // 120 / 25`
  - `188: expect(cp.evacuation!.reserveGalPerVehicle).toBe(7.2); // × 1.5`
- **deep-merges and recomputes (line 218)**
  - `220: expect(c.water.childGalPerDay).toBe(0.75);`
  - `221: expect(computeWater(at({ adults: 2, scenarioDays: 3 }), c).storedGal).toBe(9);`

### `tests/food.test.ts`

- **default mix follows the eating order (hand-computed) (line 14)**
  - `16: expect(defaultFoodMix(SAMPLE_HOUSEHOLD)).toEqual({ bulk: 76 / 90, ready: 14 / 90, kits: 0 });`
  - `18: expect(defaultFoodMix(at({ scenarioDays: 14 }))).toEqual({ bulk: 0, ready: 1, kits: 0 });`
  - `20: expect(defaultFoodMix(at({ scenarioDays: 30 }))).toEqual({ bulk: 16 / 30, ready: 14 / 30, kits: 0 });`
  - `22: expect(defaultFoodMix(at({ scenarioDays: 90, storage: ["none"] })).ready).toBe(1);`
  - `23: expect(defaultFoodMix(at({ scenarioDays: 90, homeType: "apartment", cooking: "electric", backupPower: "none", storage: ["closets"] })).ready).toBe(1);`
  - `27: expect(rich.bulk + rich.ready + rich.kits).toBeCloseTo(1, 10);`
- **all bulk staples gives exactly the full staples list; containers only with bulk staples, sized to the pounds (line 40)**
  - `47: expect(ready.bulk.buckets).toBe(0);`

### `tests/water.test.ts`

- **lists the five layers in order, each with what it does not remove (line 23)**
  - `28: for (const r of table.rows) expect(r[2].length).toBeGreaterThan(5);`

### `tests/budget.test.ts`

- **CO alarms, then water, then first aid lead every shopping list, at every budget (line 15)**
  - `21: expect(ids.findIndex((i) => i.id === "first-aid"), '${a.zip} ${budget}').toBe(2);`
- **never shows 'over' for the open-ended $5,000+ budget, and never changes the stated budget (line 60)**
  - `64: expect(budgetStatus({ ...budget, totalLow: 1600, totalHigh: 1800 })).toBe("$200 over your budget ($500–1,500)");`
  - `65: expect(budget.cap).toBe(1500);`
- **every plan carries its stated budget and gear total (line 67)**
  - `69: expect(r.budget.picks.length).toBeGreaterThan(0);`

### `tests/levels.test.ts`

- **premium food swaps DIY staples for freeze-dried, sized by the rules (line 65)**
  - `68: expect(fd.qty).toBe(11); // ceil(630,000 kcal / (2,000 kcal × 30 days) = 10.5)`

### `tests/solo.test.ts`

_No literal-valued assertions._

### `tests/dashboard.test.ts`

_No literal-valued assertions._

### `tests/calendar.test.ts`

- **is valid RFC 5545 structure: CRLF lines, folded at 75 octets, one VEVENT with UID, DTSTAMP and RRULE per item (line 21)**
  - `28: for (const line of ics.split("\r\n")) expect(Buffer.byteLength(line)).toBeLessThanOrEqual(75);`
- **starts on the day it's added; seasonal checks on the 1st of their month (line 36)**
  - `37: expect(firstDate({ id: "x", when: "Monthly", task: "t", repeat: { every: "month" } }, FROM).toISOString().slice(0, 10)).toBe("2026-11-22");`
  - `38: expect(firstDate({ id: "x", when: "June", task: "t", repeat: { month: 6 } }, FROM).toISOString().slice(0, 10)).toBe("2027-06-01");`
  - `39: expect(firstDate({ id: "x", when: "November", task: "t", repeat: { month: 11 } }, new Date("2026-10-01")).toISOString().slice(0, 10)).toBe("2026-11-01");`
  - `40: expect(rrule({ id: "x", when: "", task: "", repeat: { every: "6 months" } })).toBe("FREQ=MONTHLY;INTERVAL=6");`

