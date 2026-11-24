import { z } from "zod";

/**
 * ALL quantities in a plan come from these constants.
 *
 * These are the defaults. Admins can override any subset at /admin/rules; overrides are
 * stored as versioned JSON (table `rule_constants`) and deep-merged over these defaults,
 * then validated with `RuleConstantsSchema`. No redeploy needed.
 */
/** Default lb per food-grade 5-gallon bucket for the dry staples (estimates; docs/FACTCHECK.md FD-2-*). */
export const DEFAULT_BUCKET_LBS: Record<string, number> = { rice: 33, beans: 30, oats: 20, pasta: 20, milk_powder: 25 };

export const DEFAULT_CONSTANTS = {
  water: {
    adultGalPerDay: 1,
    childGalPerDay: 0.75,
    petGalPerDay: { small: 0.15, medium: 0.35, large: 0.6 }, // dogs ≈ 1 oz per lb body weight
    catGalPerDay: 0.1,
    otherPetGalPerDay: 0.05,
    storedDaysCap: 14,
    jugGallons: 7,
    drumGallons: 55,
    /** Use 55-gal drums once stored water exceeds this and there is garage/basement space. */
    drumThresholdGal: 60,
    /** EPA emergency disinfection: drops of 6% unscented bleach per gallon of clear water. */
    bleachDropsPerGal6pct: 8,
    bleachDropsPerGal8pct: 6,
  },
  calories: {
    adultPerDay: 2300,
    /** Child calories by age band: [maxAgeInclusive, kcal/day] (ascending). */
    childBands: [
      [0, 800],
      [3, 1000],
      [8, 1400],
      [13, 1800],
      [17, 2200],
    ] as [number, number][],
  },
  /**
   * Bulk staple mix. `share` is the fraction of total calories (must sum to 1).
   * kcalPerUnit / unitLbs describe the purchase unit. costPerUnit is a rough USD estimate.
   * bucketLbs: pounds of that dry staple one food-grade 5-gallon bucket holds (estimates; docs/FACTCHECK.md).
   * Only dry staples have it; canned goods, oil and peanut butter stay in their own containers and need no bucket.
   */
  staples: [
    { key: "rice", name: "White rice", share: 0.26, kcalPerLb: 1650, unit: "20-lb bag", unitLbs: 20, costPerUnit: 18, bucketLbs: DEFAULT_BUCKET_LBS.rice },
    { key: "beans", name: "Dry beans/lentils", share: 0.13, kcalPerLb: 1550, unit: "10-lb bag", unitLbs: 10, costPerUnit: 16, bucketLbs: DEFAULT_BUCKET_LBS.beans },
    { key: "oats", name: "Rolled oats", share: 0.1, kcalPerLb: 1700, unit: "42-oz canister", unitLbs: 2.625, costPerUnit: 5, bucketLbs: DEFAULT_BUCKET_LBS.oats },
    { key: "pasta", name: "Pasta", share: 0.1, kcalPerLb: 1680, unit: "1-lb box", unitLbs: 1, costPerUnit: 1.5, bucketLbs: DEFAULT_BUCKET_LBS.pasta },
    { key: "peanut_butter", name: "Peanut butter", share: 0.08, kcalPerLb: 2650, unit: "40-oz jar", unitLbs: 2.5, costPerUnit: 7 },
    { key: "oil", name: "Cooking oil", share: 0.08, kcalPerLb: 4000, unit: "1-gal jug", unitLbs: 7.6, costPerUnit: 14 },
    { key: "canned_protein", name: "Canned protein (chicken, tuna, beans)", share: 0.1, kcalPerLb: 750, unit: "12.5-oz can", unitLbs: 0.78, costPerUnit: 3 },
    { key: "canned_produce", name: "Canned fruit & vegetables", share: 0.1, kcalPerLb: 220, unit: "15-oz can", unitLbs: 0.94, costPerUnit: 1.3 },
    { key: "milk_powder", name: "Powdered milk", share: 0.05, kcalPerLb: 1650, unit: "4-lb bag", unitLbs: 4, costPerUnit: 22, bucketLbs: DEFAULT_BUCKET_LBS.milk_powder },
  ],
  diapers: {
    perChildPerDay: 6,
    /** Children at or under this age are assumed to be in diapers when the user selects "diapers". */
    maxAge: 3,
    wipesPerChildPerDay: 8,
    /** For scenarios longer than this many days, split diapers between current size and next size up. */
    splitAfterDays: 30,
    nextSizeShare: 0.5,
    packSize: 100,
    wipesPackSize: 80,
  },
  formula: {
    /** Prepared ounces per day for an infant (planning figure only — follow your pediatrician). */
    preparedOzPerDay: 30,
    preparedOzPerCan: 90,
  },
  sanitation: {
    toiletPaperRollsPerPersonPerWeek: 1,
    wasteBagsPerPersonPerDay: 1,
    trashBagsPerHouseholdPerWeek: 4,
  },
  pets: {
    dogFoodLbsPerDay: { small: 0.25, medium: 0.6, large: 1.0 },
    catFoodLbsPerDay: 0.15,
    otherPetFoodLbsPerDay: 0.05,
  },
  generator: {
    /** Planning hours/day the generator runs. */
    hoursPerDay: {
      /** Gas/oil/propane forced-air furnace or boiler needs power for blower/ignition/circulator. */
      fuelFurnaceWinter: 12,
      electricHeatWinter: 6, // generator can't realistically run resistance heat / heat pump; fridge + charging
      woodWinter: 5,
      nonWinter: 6,
    },
    /** Inverter generator ~3,500–4,500 W at ~50% load. [low, high] gallons/hour. */
    gasolineGalPerHour: [0.25, 0.4] as [number, number],
    propaneGalPerHour: [0.35, 0.6] as [number, number],
    propaneGalPer20lb: 4.7,
    propaneGalPer100lb: 23.6,
    /** Recommended stored gasoline (gal) by scenario length. */
    storedGasolineGal: { 3: 10, 14: 20, 30: 25, 90: 30 } as Record<string, number>,
    gasolineShelfLifeMonthsStabilized: 12,
    fuelTableAmountsGal: [5, 20, 40],
  },
  evacuation: {
    assumedMpg: 25,
    fuelReserveFactor: 1.5,
    /** UX-3: a typical passenger-car tank (most hold 12–16 gal). "Half full" = half of this; a trip needing more gets "fill up completely". Planning assumption, in FACTCHECK. */
    assumedTankGal: 14,
    evRangeBufferPct: 30,
  },
  foodBuild: {
    /** Days of food bought in Phase 2; the rest is built up gradually in Phase 3. */
    phase2Days: 30,
  },
  foodMix: {
    /** D7: planning cost of ready-to-eat food (canned meals, soups, pouches), USD per 1,000 kcal. A price estimate, not a safety amount. */
    readyCostPer1000Kcal: 3,
  },
  cash: {
    /** Suggested cash on hand per adult by scenario length (USD). */
    perAdult: { 3: 100, 14: 250, 30: 400, 90: 600 } as Record<string, number>,
  },
  budget: {
    /** Planning amount used to fit gear into the user's budget range. */
    planningAmount: { under_500: 400, "500_1500": 1000, "1500_5000": 3250, "5000_plus": 7500 } as Record<string, number>,
    /** Target share of budget per phase. */
    phaseShare: { 1: 0.3, 2: 0.5, 3: 0.2 } as Record<string, number>,
    tierByBudget: { under_500: 1, "500_1500": 2, "1500_5000": 3, "5000_plus": 4 } as Record<string, number>,
    /** Items may push the total this far over the planning amount (0.05 = 5%) before being deferred. */
    overageTolerance: 0.05,
    /** Default gear level per budget (people can change any slot à la carte). */
    defaultLevel: { under_500: "essential", "500_1500": "standard", "1500_5000": "standard", "5000_plus": "premium" } as Record<string, string>,
  },
  catalog: {
    /** Items not reviewed within this many days are hidden from plans and flagged in admin. */
    staleAfterDays: 183,
  },
  heat: {
    /** Indoor temperatures (°F) that trigger actions. */
    warmRoomAtF: 55,
    evacuateAtF: 45,
    pipeFreezeRiskOutdoorF: 20,
  },
  food: {
    fridgeSafeHours: 4,
    fullFreezerSafeHours: 48,
    halfFreezerSafeHours: 24,
  },
  /**
   * Affiliate settings (editable at /admin, no redeploy). With an Amazon Associates tag set,
   * every recommended item gets a tracked "Buy" button (an Amazon search for its example model).
   * An item's own affiliateUrl in the catalog always wins.
   */
  affiliate: {
    amazonTag: "",
  },
  /** Rough USD costs for consumables (used only for budget estimates). */
  costs: {
    diaperEach: 0.25,
    wipesPack: 4,
    toiletPaperRoll: 0.7,
    petFoodPerLb: 1.5,
    formulaCan: 25,
    wasteBagEach: 0.3,
  },
};

export type RuleConstants = typeof DEFAULT_CONSTANTS;

const num = z.number().nonnegative();
const pair = z.tuple([num, num]);
export const RuleConstantsSchema = z.object({
  water: z.object({
    adultGalPerDay: num,
    childGalPerDay: num,
    petGalPerDay: z.object({ small: num, medium: num, large: num }),
    catGalPerDay: num,
    otherPetGalPerDay: num,
    storedDaysCap: num,
    jugGallons: num,
    drumGallons: num,
    drumThresholdGal: num,
    bleachDropsPerGal6pct: num,
    bleachDropsPerGal8pct: num,
  }),
  calories: z.object({ adultPerDay: num, childBands: z.array(z.tuple([num, num])).min(1) }),
  staples: z
    .array(
      z.object({
        key: z.string(),
        name: z.string(),
        share: num,
        kcalPerLb: z.number().positive(),
        unit: z.string(),
        unitLbs: z.number().positive(),
        costPerUnit: num,
        bucketLbs: z.number().positive().optional(),
      }),
    )
    .min(1)
    .refine((s) => Math.abs(s.reduce((t, x) => t + x.share, 0) - 1) < 0.001, "Staple shares must sum to 1"),
  diapers: z.object({
    perChildPerDay: num,
    maxAge: num,
    wipesPerChildPerDay: num,
    splitAfterDays: num,
    nextSizeShare: z.number().min(0).max(1),
    packSize: z.number().positive(),
    wipesPackSize: z.number().positive(),
  }),
  formula: z.object({ preparedOzPerDay: num, preparedOzPerCan: z.number().positive() }),
  sanitation: z.object({
    toiletPaperRollsPerPersonPerWeek: num,
    wasteBagsPerPersonPerDay: num,
    trashBagsPerHouseholdPerWeek: num,
  }),
  pets: z.object({
    dogFoodLbsPerDay: z.object({ small: num, medium: num, large: num }),
    catFoodLbsPerDay: num,
    otherPetFoodLbsPerDay: num,
  }),
  generator: z.object({
    hoursPerDay: z.object({ fuelFurnaceWinter: num, electricHeatWinter: num, woodWinter: num, nonWinter: num }),
    gasolineGalPerHour: pair,
    propaneGalPerHour: pair,
    propaneGalPer20lb: z.number().positive(),
    propaneGalPer100lb: z.number().positive(),
    storedGasolineGal: z.record(z.string(), num),
    gasolineShelfLifeMonthsStabilized: num,
    fuelTableAmountsGal: z.array(z.number().positive()).min(1),
  }),
  evacuation: z.object({ assumedMpg: z.number().positive(), fuelReserveFactor: num, evRangeBufferPct: num, assumedTankGal: z.number().positive() }),
  foodBuild: z.object({ phase2Days: z.number().positive() }),
  foodMix: z.object({ readyCostPer1000Kcal: z.number().positive() }),
  cash: z.object({ perAdult: z.record(z.string(), num) }),
  budget: z.object({
    planningAmount: z.record(z.string(), num),
    phaseShare: z.record(z.string(), num),
    tierByBudget: z.record(z.string(), num),
    overageTolerance: z.number().min(0).max(0.5),
    defaultLevel: z.record(z.string(), z.enum(["essential", "standard", "premium"])),
  }),
  catalog: z.object({ staleAfterDays: z.number().positive() }),
  heat: z.object({ warmRoomAtF: z.number(), evacuateAtF: z.number(), pipeFreezeRiskOutdoorF: z.number() }),
  food: z.object({ fridgeSafeHours: num, fullFreezerSafeHours: num, halfFreezerSafeHours: num }),
  affiliate: z.object({ amazonTag: z.string().regex(/^[A-Za-z0-9-]{0,40}$/, "Tag may contain letters, numbers and hyphens only") }),
  costs: z.object({
    diaperEach: num,
    wipesPack: num,
    toiletPaperRoll: num,
    petFoodPerLb: num,
    formulaCan: num,
    wasteBagEach: num,
  }),
});

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Deep-merge overrides (objects merge, arrays/scalars replace) and validate. */
export function mergeConstants(overrides: unknown): RuleConstants {
  const merge = (base: unknown, over: unknown): unknown => {
    if (!isObj(base) || !isObj(over)) return over === undefined ? base : over;
    const out: Record<string, unknown> = { ...base };
    for (const [k, v] of Object.entries(over)) out[k] = merge(base[k], v);
    return out;
  };
  const merged = isObj(overrides) ? merge(DEFAULT_CONSTANTS, overrides) : DEFAULT_CONSTANTS;
  return RuleConstantsSchema.parse(merged) as RuleConstants;
}
