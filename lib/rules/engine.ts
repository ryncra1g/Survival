import type { Answers } from "@/lib/answers/schema";
import type { CatalogItem } from "@/lib/catalog/types";
import { atLeast, lookupZip, type ZipProfile } from "@/lib/zip/profile";
import type { RuleConstants } from "./constants";

/**
 * Deterministic rules layer. Every number that appears anywhere in a plan is computed here.
 * Pure functions only: same answers + constants + catalog + date ⇒ same output.
 */
export const RULES_VERSION = "1.0.0";

const round = (n: number, dp = 2) => Math.round(n * 10 ** dp) / 10 ** dp;
const ceil = Math.ceil;

// ---------------------------------------------------------------- household
export interface Household {
  adults: number;
  childrenAges: number[];
  children: number;
  people: number;
  elderlyOrMobility: boolean;
  childrenInDiapers: number;
  infants: number;
  toddlersOnMilk: number;
  petCount: number;
}

export function household(a: Answers, c: RuleConstants): Household {
  const children = a.childrenAges.length;
  const childrenInDiapers = a.toddlerNeeds.includes("diapers")
    ? a.childrenAges.filter((age) => age <= c.diapers.maxAge).length
    : 0;
  const infants = a.toddlerNeeds.includes("formula") ? a.childrenAges.filter((age) => age < 1).length : 0;
  const toddlersOnMilk = a.toddlerNeeds.includes("milk")
    ? a.childrenAges.filter((age) => age >= 1 && age <= 3).length
    : 0;
  return {
    adults: a.adults,
    childrenAges: [...a.childrenAges].sort((x, y) => x - y),
    children,
    people: a.adults + children,
    elderlyOrMobility: a.elderlyOrMobility,
    childrenInDiapers,
    infants,
    toddlersOnMilk,
    petCount: a.pets.reduce((t, p) => t + p.count, 0),
  };
}

// ---------------------------------------------------------------- water
export interface WaterResult {
  dailyGal: number;
  breakdown: { label: string; galPerDay: number }[];
  storedDays: number;
  storedGal: number;
  filterDays: number;
  filterGal: number;
  jugs: number;
  drums: number;
  threeDayGal: number;
  bleachDropsPerGal6pct: number;
  bleachDropsPerGal8pct: number;
}

export function petWaterPerDay(a: Answers, c: RuleConstants): number {
  return a.pets.reduce((t, p) => {
    const per = p.type === "dog" ? c.water.petGalPerDay[p.size] : p.type === "cat" ? c.water.catGalPerDay : c.water.otherPetGalPerDay;
    return t + per * p.count;
  }, 0);
}

export function computeWater(a: Answers, c: RuleConstants): WaterResult {
  const adults = a.adults * c.water.adultGalPerDay;
  const kids = a.childrenAges.length * c.water.childGalPerDay;
  const pets = petWaterPerDay(a, c);
  const dailyGal = round(adults + kids + pets);
  const storedDays = Math.min(c.water.storedDaysCap, a.scenarioDays);
  const storedGal = ceil(round(dailyGal * storedDays, 4));
  const filterDays = Math.max(0, a.scenarioDays - storedDays);
  const filterGal = ceil(round(dailyGal * filterDays, 4));
  const largeStorage = a.storage.some((s) => s === "garage" || s === "basement" || s === "shed");
  let drums = 0;
  let jugs: number;
  if (storedGal > c.water.drumThresholdGal && largeStorage && a.homeType !== "apartment") {
    drums = Math.floor((storedGal * 0.75) / c.water.drumGallons) || 1;
    jugs = Math.max(2, ceil((storedGal - drums * c.water.drumGallons) / c.water.jugGallons));
  } else {
    jugs = ceil(storedGal / c.water.jugGallons);
  }
  const breakdown = [{ label: `${a.adults} adult(s)`, galPerDay: round(adults) }];
  if (kids) breakdown.push({ label: `${a.childrenAges.length} child(ren)`, galPerDay: round(kids) });
  if (pets) breakdown.push({ label: "Pets", galPerDay: round(pets) });
  return {
    dailyGal,
    breakdown,
    storedDays,
    storedGal,
    filterDays,
    filterGal,
    jugs,
    drums,
    threeDayGal: ceil(round(dailyGal * Math.min(3, a.scenarioDays), 4)),
    bleachDropsPerGal6pct: c.water.bleachDropsPerGal6pct,
    bleachDropsPerGal8pct: c.water.bleachDropsPerGal8pct,
  };
}

// ---------------------------------------------------------------- food
export interface StapleLine {
  key: string;
  name: string;
  kcal: number;
  lbs: number;
  units: number;
  unit: string;
  cost: number;
}
export interface FoodResult {
  dailyKcal: number;
  totalKcal: number;
  perPerson: { label: string; kcal: number }[];
  staples: StapleLine[];
  totalLbs: number;
  cost: number;
}

export function childCalories(age: number, c: RuleConstants): number {
  for (const [maxAge, kcal] of c.calories.childBands) if (age <= maxAge) return kcal;
  return c.calories.adultPerDay;
}

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
  cost: number;
}
export function computeDiapers(a: Answers, c: RuleConstants, h: Household): DiaperResult | null {
  if (!h.childrenInDiapers) return null;
  const perDay = c.diapers.perChildPerDay * h.childrenInDiapers;
  const total = perDay * a.scenarioDays;
  const nextSize = a.scenarioDays > c.diapers.splitAfterDays ? Math.round(total * c.diapers.nextSizeShare) : 0;
  const wipes = c.diapers.wipesPerChildPerDay * h.childrenInDiapers * a.scenarioDays;
  const wipesPacks = ceil(wipes / c.diapers.wipesPackSize);
  return {
    children: h.childrenInDiapers,
    perDay,
    total,
    currentSize: total - nextSize,
    nextSize,
    packs: ceil(total / c.diapers.packSize),
    wipes,
    wipesPacks,
    cost: round(total * c.costs.diaperEach + wipesPacks * c.costs.wipesPack, 0),
  };
}

export interface FormulaResult {
  infants: number;
  preparedOz: number;
  cans: number;
  cost: number;
}
export function computeFormula(a: Answers, c: RuleConstants, h: Household): FormulaResult | null {
  if (!h.infants) return null;
  const preparedOz = c.formula.preparedOzPerDay * h.infants * a.scenarioDays;
  const cans = ceil(preparedOz / c.formula.preparedOzPerCan);
  return { infants: h.infants, preparedOz, cans, cost: round(cans * c.costs.formulaCan, 0) };
}

// ---------------------------------------------------------------- sanitation
export interface SanitationResult {
  toiletPaperRolls: number;
  wasteBags: number;
  trashBags: number;
  weeks: number;
  cost: number;
}
export function computeSanitation(a: Answers, c: RuleConstants, h: Household): SanitationResult {
  const weeks = ceil(a.scenarioDays / 7);
  const toiletPaperRolls = c.sanitation.toiletPaperRollsPerPersonPerWeek * h.people * weeks;
  // Waste bags are a backup for when toilets can't flush; plan for the stored-water window.
  const wasteBags = c.sanitation.wasteBagsPerPersonPerDay * h.people * Math.min(a.scenarioDays, 14);
  const trashBags = c.sanitation.trashBagsPerHouseholdPerWeek * weeks;
  return {
    toiletPaperRolls,
    wasteBags,
    trashBags,
    weeks,
    cost: round(toiletPaperRolls * c.costs.toiletPaperRoll + wasteBags * c.costs.wasteBagEach, 0),
  };
}

// ---------------------------------------------------------------- pets
export interface PetResult {
  groups: { label: string; foodLbs: number; waterGalPerDay: number; medications: boolean; specialDiet: boolean }[];
  foodLbs: number;
  waterGalPerDay: number;
  cost: number;
}
export function computePets(a: Answers, c: RuleConstants): PetResult | null {
  if (!a.pets.length) return null;
  const groups = a.pets.map((p) => {
    const foodPerDay =
      p.type === "dog" ? c.pets.dogFoodLbsPerDay[p.size] : p.type === "cat" ? c.pets.catFoodLbsPerDay : c.pets.otherPetFoodLbsPerDay;
    const water = p.type === "dog" ? c.water.petGalPerDay[p.size] : p.type === "cat" ? c.water.catGalPerDay : c.water.otherPetGalPerDay;
    return {
      label: `${p.count} ${p.size} ${p.type}${p.count > 1 ? "s" : ""}`,
      foodLbs: ceil(round(foodPerDay * p.count * a.scenarioDays, 4)),
      waterGalPerDay: round(water * p.count),
      medications: p.medications,
      specialDiet: p.specialDiet,
    };
  });
  const foodLbs = groups.reduce((t, g) => t + g.foodLbs, 0);
  return { groups, foodLbs, waterGalPerDay: round(groups.reduce((t, g) => t + g.waterGalPerDay, 0)), cost: round(foodLbs * c.costs.petFoodPerLb, 0) };
}

// ---------------------------------------------------------------- power + fuel
export interface FuelRow {
  gallons: number;
  daysLow: number;
  daysHigh: number;
}
export interface PowerResult {
  generatorStatus: "owned_portable" | "owned_standby" | "recommended" | "not_recommended" | "solar_battery";
  generatorSiteOk: boolean;
  hoursPerDay: number;
  hoursPerDayNonWinter: number;
  hoursBasis: string;
  gasolineGalPerDay: [number, number];
  propaneGalPerDay: [number, number];
  storedGasolineGal: number;
  storedGasolineDays: [number, number];
  gasolineTable: FuelRow[];
  propane20lbDays: [number, number];
  propane100lbDays: [number, number];
  gasCans: number;
}

const days = (gal: number, perDay: number) => round(gal / perDay, 1);

export function computePower(a: Answers, c: RuleConstants, profile: ZipProfile, flags: { furnaceNeedsPower: boolean }): PowerResult {
  const g = c.generator;
  const winter = atLeast(profile.winter, "moderate");
  let hoursPerDay = g.hoursPerDay.nonWinter;
  let hoursBasis = "fridge/freezer cycling, charging, lights";
  if (winter) {
    if (flags.furnaceNeedsPower) {
      hoursPerDay = g.hoursPerDay.fuelFurnaceWinter;
      hoursBasis = "furnace/boiler blower + ignition in cold weather, plus fridge and charging";
    } else if (a.heatSources.includes("wood")) {
      hoursPerDay = g.hoursPerDay.woodWinter;
      hoursBasis = "fridge/freezer cycling and charging (wood stove covers heat)";
    } else if (a.heatSources.includes("electric")) {
      hoursPerDay = g.hoursPerDay.electricHeatWinter;
      hoursBasis = "fridge/freezer and charging; a portable generator can't run electric/heat-pump heat";
    }
  }
  const gasPerDay: [number, number] = [round(hoursPerDay * g.gasolineGalPerHour[0]), round(hoursPerDay * g.gasolineGalPerHour[1])];
  const propPerDay: [number, number] = [round(hoursPerDay * g.propaneGalPerHour[0]), round(hoursPerDay * g.propaneGalPerHour[1])];
  const storedGasolineGal = g.storedGasolineGal[String(a.scenarioDays)] ?? 20;
  const siteOk = a.homeType !== "apartment" && (a.hasYard || a.hasGarage);
  const status: PowerResult["generatorStatus"] =
    a.backupPower === "portable_generator"
      ? "owned_portable"
      : a.backupPower === "standby_generator"
        ? "owned_standby"
        : a.backupPower === "solar_battery"
          ? "solar_battery"
          : siteOk
            ? "recommended"
            : "not_recommended";
  // days of runtime: low = heavy burn (high gal/day), high = light burn
  return {
    generatorStatus: status,
    generatorSiteOk: siteOk,
    hoursPerDay,
    hoursPerDayNonWinter: g.hoursPerDay.nonWinter,
    hoursBasis,
    gasolineGalPerDay: gasPerDay,
    propaneGalPerDay: propPerDay,
    storedGasolineGal,
    storedGasolineDays: [days(storedGasolineGal, gasPerDay[1]), days(storedGasolineGal, gasPerDay[0])],
    gasolineTable: g.fuelTableAmountsGal.map((gal) => ({ gallons: gal, daysLow: days(gal, gasPerDay[1]), daysHigh: days(gal, gasPerDay[0]) })),
    propane20lbDays: [days(g.propaneGalPer20lb, propPerDay[1]), days(g.propaneGalPer20lb, propPerDay[0])],
    propane100lbDays: [days(g.propaneGalPer100lb, propPerDay[1]), days(g.propaneGalPer100lb, propPerDay[0])],
    gasCans: ceil(storedGasolineGal / 5),
  };
}

// ---------------------------------------------------------------- heat strategy
export type HeatStrategyKey =
  | "standby_runs_furnace"
  | "generator_inlet_furnace"
  | "indoor_propane_heater"
  | "wood_stove"
  | "one_warm_room"
  | "pipe_freeze"
  | "apartment_no_combustion"
  | "cooling_plan";

export function heatStrategy(a: Answers, profile: ZipProfile, power: PowerResult, furnaceNeedsPower: boolean): HeatStrategyKey[] {
  const out: HeatStrategyKey[] = [];
  const winter = atLeast(profile.winter, "moderate");
  const apt = a.homeType === "apartment";
  if (winter || atLeast(profile.winter, "low")) {
    if (power.generatorStatus === "owned_standby") out.push("standby_runs_furnace");
    else if (furnaceNeedsPower && !apt && (power.generatorStatus === "owned_portable" || power.generatorStatus === "recommended"))
      out.push("generator_inlet_furnace");
    if (a.heatSources.includes("wood")) out.push("wood_stove");
    if (!apt && winter && power.generatorStatus !== "owned_standby" && !a.heatSources.includes("wood")) out.push("indoor_propane_heater");
    out.push("one_warm_room");
    if (apt) out.push("apartment_no_combustion");
    if (winter) out.push("pipe_freeze");
  }
  if (atLeast(profile.heat, "high")) out.push("cooling_plan");
  return out;
}

// ---------------------------------------------------------------- evacuation
export interface EvacResult {
  locationType: "friends_family" | "second_property" | "raw_land";
  distanceMiles: number;
  oneWayGalPerVehicle: number;
  reserveGalPerVehicle: number;
  hasEv: boolean;
  evMinRangeMiles: number;
  vehicles: number;
}
export function computeEvac(a: Answers, c: RuleConstants): EvacResult | null {
  if (a.evacuation.mode !== "fallback" || !a.evacuation.locationType || !a.evacuation.distanceMiles) return null;
  const d = a.evacuation.distanceMiles;
  const oneWay = round(d / c.evacuation.assumedMpg, 1);
  return {
    locationType: a.evacuation.locationType,
    distanceMiles: d,
    oneWayGalPerVehicle: oneWay,
    reserveGalPerVehicle: round(oneWay * c.evacuation.fuelReserveFactor, 1),
    hasEv: a.vehicleFuels.includes("ev"),
    evMinRangeMiles: ceil(d * (1 + c.evacuation.evRangeBufferPct / 100)),
    vehicles: a.vehicleFuels.length,
  };
}

// ---------------------------------------------------------------- tags
export function computeTags(a: Answers, profile: ZipProfile, power: PowerResult, h: Household, furnaceNeedsPower: boolean): Set<string> {
  const t = new Set<string>();
  const winter = atLeast(profile.winter, "moderate");
  if (a.homeType === "apartment") t.add("apartment");
  else t.add("house_or_townhouse");
  if (power.generatorStatus === "recommended") t.add("recommend_generator");
  if (power.generatorStatus === "owned_portable" || power.generatorStatus === "recommended") t.add("has_generator");
  if (furnaceNeedsPower && power.generatorStatus !== "owned_standby") t.add("fuel_furnace");
  if (winter && power.generatorStatus !== "owned_standby" && !a.heatSources.includes("wood")) t.add("needs_backup_heat");
  if (a.heatSources.includes("wood")) t.add("wood_heat");
  if (winter) t.add("winter");
  if (atLeast(profile.heat, "high")) t.add("hot_climate");
  if (atLeast(profile.hurricane, "moderate")) t.add("hurricane");
  if (a.hasBasement && atLeast(profile.flood, "moderate")) t.add("flood_basement");
  if (a.waterSource === "well" && power.generatorStatus !== "owned_standby") t.add("well");
  if (power.generatorStatus === "owned_portable") t.add("owns_generator");
  if (power.generatorStatus === "solar_battery") t.add("owns_solar");
  if (atLeast(profile.earthquake, "moderate")) t.add("earthquake");
  if (atLeast(profile.wildfire, "moderate")) t.add("wildfire");
  if (atLeast(profile.flood, "high")) t.add("flood");
  if (atLeast(profile.tornado, "moderate")) t.add("tornado");
  if (h.elderlyOrMobility) t.add("mobility");
  if (a.poweredDevices.length) t.add("medical_device");
  if (h.childrenInDiapers) t.add("diapers");
  if (h.infants) t.add("infant");
  if (h.children) t.add("children");
  if (a.pets.length) t.add("pets");
  if (a.evacuation.mode === "fallback") t.add("evacuation");
  if (a.evacuation.locationType === "raw_land") t.add("raw_land");
  if (a.vehicleFuels.length) t.add("vehicles");
  if (a.vehicleFuels.includes("ev")) t.add("ev");
  if (a.cooking !== "gas") t.add("needs_alt_cooking");
  if (a.scenarioDays > 14) t.add("long_scenario");
  if (a.scenarioDays > 14 && !a.hasFiltration) t.add("needs_filter");
  if (a.storage.some((s) => s === "garage" || s === "basement" || s === "shed")) t.add("large_storage");
  return t;
}

// ---------------------------------------------------------------- gear + budget
export interface GearPick {
  item: CatalogItem;
  qty: number;
  low: number;
  high: number;
  mid: number;
  phase: 1 | 2 | 3;
  status: "included" | "deferred";
  reason?: string;
}
export interface ConsumableLine {
  key: string;
  label: string;
  phase: 1 | 2 | 3;
  cost: number;
  /** Ongoing lines are bought gradually from the grocery budget and are not counted against the gear budget. */
  ongoing?: boolean;
}
export interface BudgetPhase {
  phase: 1 | 2 | 3;
  target: number;
  includedMid: number;
  includedLow: number;
  includedHigh: number;
}
export type SlotLevel = "essential" | "standard" | "premium";
const LEVEL_RANK: Record<SlotLevel, number> = { essential: 0, standard: 1, premium: 2 };
export interface SlotOption {
  level: SlotLevel;
  itemId: string;
  name: string;
  qty: number;
  low: number;
  high: number;
}
/** One à la carte gear slot: the level chosen (by budget default or by the person) and every level's price. */
export interface Slot {
  group: string;
  chosen: string | null;
  chosenLevel: SlotLevel | null;
  byChoice: boolean;
  options: SlotOption[];
}
export interface BudgetResult {
  planningAmount: number;
  totalMid: number;
  phases: BudgetPhase[];
  consumables: ConsumableLine[];
  ongoingCost: number;
  picks: GearPick[];
  deferred: GearPick[];
  staleHidden: string[];
  cutFirst: string[];
  slots: Slot[];
}

export function isStale(item: CatalogItem, now: Date, c: RuleConstants): boolean {
  const reviewed = new Date(item.reviewedAt + (item.reviewedAt.length === 10 ? "T00:00:00Z" : ""));
  return (now.getTime() - reviewed.getTime()) / 86_400_000 > c.catalog.staleAfterDays;
}

export function resolveQty(item: CatalogItem, ctx: { water: WaterResult; power: PowerResult; h: Household; a: Answers; foodKcal: number }): number {
  if (typeof item.qty === "number") return item.qty;
  switch (item.qty) {
    case "co_alarms":
      return ctx.a.floors + (ctx.a.hasBasement ? 1 : 0) + 1;
    case "water_jugs":
      return ctx.water.jugs;
    case "water_bricks":
      return Math.ceil(Math.max(0, ctx.water.storedGal - ctx.water.drums * 55) / 3.5);
    case "freeze_dried_units":
      return Math.ceil(ctx.foodKcal / (2000 * 30));
    case "water_gallons":
      return Math.max(0, ctx.water.storedGal - ctx.water.drums * 55);
    case "water_drums":
      return ctx.water.drums;
    case "people":
      return ctx.h.people;
    case "adults":
      return ctx.h.adults;
    case "floors":
      return ctx.a.floors + (ctx.a.hasBasement ? 1 : 0);
    case "gas_cans":
      return ctx.power.gasCans;
    default:
      return 1;
  }
}

function tagsMatch(item: CatalogItem, tags: Set<string>): boolean {
  return item.tags.every((t) => (t.startsWith("!") ? !tags.has(t.slice(1)) : tags.has(t)));
}

export function computeBudget(
  a: Answers,
  c: RuleConstants,
  catalog: CatalogItem[],
  tags: Set<string>,
  ctx: { water: WaterResult; power: PowerResult; h: Household; a: Answers; foodKcal: number },
  consumables: ConsumableLine[],
  now: Date,
): BudgetResult {
  const planningAmount = c.budget.planningAmount[a.budget];
  const tier = c.budget.tierByBudget[a.budget];
  const choices = (a.gearChoices ?? {}) as Record<string, SlotLevel>;
  const defaultRank = LEVEL_RANK[(c.budget.defaultLevel[a.budget] ?? "standard") as SlotLevel];
  const excluded = new Set<string>();
  const slots: Slot[] = [];
  const staleHidden: string[] = [];
  // Life-safety (phase 1) items above the budget tier still show under "next purchases" instead of vanishing.
  const aboveTier: CatalogItem[] = [];
  const candidates = catalog.filter((it) => {
    if (!it.active || !tagsMatch(it, tags)) return false;
    if (isStale(it, now, c)) {
      staleHidden.push(it.id);
      return false;
    }
    if (it.group === "food") return choices.food === "premium";
    if (it.group) return true; // every level of a slot is listed; the default level depends on the budget
    if (it.tier > tier && !it.essential && it.phase === 1) aboveTier.push(it);
    return it.tier <= tier || it.essential;
  });

  type Entry = { kind: "gear"; phase: 1 | 2 | 3; priority: number; items: CatalogItem[] } | { kind: "consumable"; phase: 1 | 2 | 3; priority: number; line: ConsumableLine };
  const entries: Entry[] = [];
  const groups = new Map<string, CatalogItem[]>();
  for (const it of candidates) {
    if (it.group) {
      const g = groups.get(it.group) ?? [];
      g.push(it);
      groups.set(it.group, g);
    } else entries.push({ kind: "gear", phase: it.phase, priority: it.priority, items: [it] });
  }
  for (const g of groups.values()) {
    g.sort((x, y) => LEVEL_RANK[y.level ?? "standard"] - LEVEL_RANK[x.level ?? "standard"] || y.priceHigh - x.priceHigh); // best first
    entries.push({ kind: "gear", phase: Math.min(...g.map((x) => x.phase)) as 1 | 2 | 3, priority: Math.min(...g.map((x) => x.priority)), items: g });
  }
  // consumables slot in at the top of their phase
  consumables.filter((l) => !l.ongoing).forEach((line, i) => entries.push({ kind: "consumable", phase: line.phase, priority: i * 0.01, line }));
  entries.sort((x, y) => x.phase - y.phase || x.priority - y.priority);

  let spent = 0;
  // Households that already own a portable generator get its accessories (cans, cord, inlet) without buying one.
  const includedGroups = new Set<string>(tags.has("owns_generator") ? ["generator"] : []);
  const bundled = new Set<string>();
  const deferredGroups = new Set<string>();
  const picks: GearPick[] = [];
  const deferred: GearPick[] = [];
  const phaseMid = { 1: 0, 2: 0, 3: 0 } as Record<number, number>;
  const phaseLow = { 1: 0, 2: 0, 3: 0 } as Record<number, number>;
  const phaseHigh = { 1: 0, 2: 0, 3: 0 } as Record<number, number>;

  for (const e of entries) {
    if (e.kind === "consumable") {
      spent += e.line.cost;
      phaseMid[e.phase] += e.line.cost;
      phaseLow[e.phase] += e.line.cost;
      phaseHigh[e.phase] += e.line.cost;
      continue;
    }
    if (e.items.every((it) => bundled.has(it.id) || excluded.has(it.id))) continue;
    const options = e.items.map((item) => {
      const qty = resolveQty(item, ctx);
      const low = item.priceLow * qty;
      const high = item.priceHigh * qty;
      return { item, qty, low, high, mid: round((low + high) / 2, 0), phase: item.phase };
    });
    const viable = options.filter((o) => o.qty > 0 && (!o.item.requiresGroup || includedGroups.has(o.item.requiresGroup)));
    if (!viable.length) {
      const blocked = options.find((o) => o.qty > 0 && o.item.requiresGroup);
      if (blocked && !(blocked.item.bundle && deferredGroups.has(blocked.item.requiresGroup!)))
        deferred.push({ ...blocked, status: "deferred", reason: `Buy after the ${blocked.item.requiresGroup}` });
      else if (blocked) deferred.push({ ...blocked, status: "deferred", reason: `Buy with the ${blocked.item.requiresGroup}` });
      continue;
    }
    // Bundle members (e.g. gas cans + cord for a generator) must fit together with the group item.
    const bundleFor = (o: (typeof viable)[number]) =>
      o.item.group
        ? candidates
            .filter((it) => it.bundle && it.requiresGroup === o.item.group && !(o.item.excludes ?? []).includes(it.id))
            .map((item) => {
              const qty = resolveQty(item, ctx);
              const low = item.priceLow * qty;
              const high = item.priceHigh * qty;
              return { item, qty, low, high, mid: round((low + high) / 2, 0), phase: item.phase };
            })
            .filter((b) => b.qty > 0)
        : [];
    const ceiling = planningAmount * (1 + c.budget.overageTolerance);
    const group = e.items[0].group;
    const choice = group ? choices[group] : undefined;
    const chosenByPerson = choice ? viable.find((o) => o.item.level === choice) : undefined;
    // Default: the budget's level or lower, best first; a person's own choice always wins (even over budget).
    const atOrBelow = group ? viable.filter((o) => LEVEL_RANK[o.item.level ?? "standard"] <= defaultRank) : viable;
    const fit =
      chosenByPerson ??
      atOrBelow.find((o) => o.item.essential || spent + o.mid + bundleFor(o).reduce((t, b) => t + b.mid, 0) <= ceiling);
    if (group)
      slots.push({
        group,
        chosen: fit?.item.id ?? null,
        chosenLevel: (fit?.item.level as SlotLevel) ?? null,
        byChoice: !!chosenByPerson,
        options: [...viable]
          .sort((x, y) => LEVEL_RANK[x.item.level ?? "standard"] - LEVEL_RANK[y.item.level ?? "standard"])
          .map((o) => {
            const b = bundleFor(o);
            return { level: (o.item.level ?? "standard") as SlotLevel, itemId: o.item.id, name: o.item.name, qty: o.qty, low: o.low + b.reduce((t, x) => t + x.low, 0), high: o.high + b.reduce((t, x) => t + x.high, 0) };
          }),
      });
    if (fit) {
      for (const ex of fit.item.excludes ?? []) excluded.add(ex);
      for (const x of [fit, ...bundleFor(fit)]) {
        picks.push({ ...x, status: "included" });
        if (x.item.group) includedGroups.add(x.item.group);
        spent += x.mid;
        phaseMid[x.phase] += x.mid;
        phaseLow[x.phase] += x.low;
        phaseHigh[x.phase] += x.high;
        bundled.add(x.item.id);
      }
    } else {
      const pool = atOrBelow.length ? atOrBelow : viable;
      const cheapest = [...pool].sort((x, y) => x.mid - y.mid)[0];
      if (cheapest.item.group) deferredGroups.add(cheapest.item.group);
      deferred.push({ ...cheapest, status: "deferred", reason: "Doesn't fit the remaining budget — buy next" });
    }
  }

  for (const item of aboveTier) {
    const qty = resolveQty(item, ctx);
    if (qty <= 0) continue;
    const low = item.priceLow * qty;
    const high = item.priceHigh * qty;
    deferred.unshift({ item, qty, low, high, mid: round((low + high) / 2, 0), phase: item.phase, status: "deferred", reason: "Above your budget range, but important for your home — plan for it" });
  }

  const phases: BudgetPhase[] = ([1, 2, 3] as const).map((p) => ({
    phase: p,
    target: round(planningAmount * c.budget.phaseShare[String(p)], 0),
    includedMid: round(phaseMid[p], 0),
    includedLow: round(phaseLow[p], 0),
    includedHigh: round(phaseHigh[p], 0),
  }));
  const cutFirst = picks
    .filter((p) => !p.item.essential && !p.item.group && !p.item.bundle && p.item.category !== "Water" && p.item.category !== "Life safety" && p.item.category !== "Medical power")
    .sort((x, y) => y.phase - x.phase || y.item.priority - x.item.priority)
    .slice(0, 3)
    .map((p) => p.item.name);
  const ongoingCost = consumables.filter((l) => l.ongoing).reduce((t, l) => t + l.cost, 0);
  // Excluded items (e.g. gas cans with a standby generator) never show as picks or next purchases.
  const keep = (p: GearPick) => !excluded.has(p.item.id);
  return { planningAmount, totalMid: round(spent, 0), phases, consumables, ongoingCost, picks: picks.filter(keep), deferred: deferred.filter(keep), staleHidden, cutFirst, slots };
}

// ---------------------------------------------------------------- top level
export interface Flags {
  wellPumpPriority: boolean;
  medicalDevicePriority: boolean;
  furnaceNeedsPower: boolean;
  apartment: boolean;
  apartmentWithGenerator: boolean;
  winter: boolean;
  hasStandby: boolean;
  gasCooking: boolean;
}

export interface ComputedPlan {
  rulesVersion: string;
  computedAt: string;
  answers: Answers;
  profile: ZipProfile;
  household: Household;
  flags: Flags;
  tags: string[];
  water: WaterResult;
  food: FoodResult;
  diapers: DiaperResult | null;
  formula: FormulaResult | null;
  sanitation: SanitationResult;
  pets: PetResult | null;
  power: PowerResult;
  heat: HeatStrategyKey[];
  cash: { perAdult: number; total: number };
  evacuation: EvacResult | null;
  budget: BudgetResult;
}

export function computePlan(a: Answers, c: RuleConstants, catalog: CatalogItem[], now = new Date()): ComputedPlan {
  const profile = lookupZip(a.zip);
  const h = household(a, c);
  const furnaceNeedsPower = a.heatSources.some((s) => s === "natural_gas" || s === "oil" || s === "propane");
  const flags: Flags = {
    wellPumpPriority: a.waterSource === "well",
    medicalDevicePriority: a.poweredDevices.length > 0,
    furnaceNeedsPower,
    apartment: a.homeType === "apartment",
    apartmentWithGenerator: a.homeType === "apartment" && a.backupPower === "portable_generator",
    winter: atLeast(profile.winter, "moderate"),
    hasStandby: a.backupPower === "standby_generator",
    gasCooking: a.cooking === "gas",
  };
  const water = computeWater(a, c);
  const food = computeFood(a, c);
  const diapers = computeDiapers(a, c, h);
  const formula = computeFormula(a, c, h);
  const sanitation = computeSanitation(a, c, h);
  const pets = computePets(a, c);
  const power = computePower(a, c, profile, { furnaceNeedsPower });
  const heat = heatStrategy(a, profile, power, furnaceNeedsPower);
  const tags = computeTags(a, profile, power, h, furnaceNeedsPower);
  const evacuation = computeEvac(a, c);
  const perAdult = c.cash.perAdult[String(a.scenarioDays)] ?? 250;

  const consumables: ConsumableLine[] = [];
  consumables.push({ key: "sanitation", label: `Toilet paper (${sanitation.toiletPaperRolls} rolls) + waste bags (${sanitation.wasteBags})`, phase: 1, cost: sanitation.cost });
  if (diapers) consumables.push({ key: "diapers", label: `Diapers (${diapers.total}) + wipes (${diapers.wipesPacks} packs)`, phase: 1, cost: diapers.cost });
  if (formula) consumables.push({ key: "formula", label: `Infant formula (${formula.cans} cans)`, phase: 1, cost: formula.cost });
  const p2Days = Math.min(a.scenarioDays, c.foodBuild.phase2Days);
  const p2Cost = round((food.cost * p2Days) / a.scenarioDays, 0);
  consumables.push({ key: "food", label: `Food staples, first ${p2Days} days`, phase: 2, cost: p2Cost });
  if (a.scenarioDays > p2Days)
    consumables.push({ key: "food_rest", label: `Food staples, days ${p2Days + 1}–${a.scenarioDays} (build up with each grocery trip)`, phase: 3, cost: food.cost - p2Cost, ongoing: true });
  if (pets) consumables.push({ key: "pet_food", label: `Pet food (${pets.foodLbs} lb)`, phase: 2, cost: pets.cost });

  // Food slot: DIY bulk staples (default) or freeze-dried long-term food (premium, by choice only).
  const freezeDried = a.gearChoices?.food === "premium";
  const cons = freezeDried ? consumables.filter((l) => l.key !== "food" && l.key !== "food_rest") : consumables;
  const ctx = { water, power, h, a, foodKcal: food.totalKcal };
  const budget = computeBudget(a, c, catalog, tags, ctx, cons, now);
  const fd = catalog.find((i) => i.id === "food-freeze-dried" && i.active);
  if (fd) {
    const qty = resolveQty(fd, ctx);
    const others = budget.slots.filter((s) => s.group !== "food");
    budget.slots = [
      ...others,
      {
        group: "food",
        chosen: freezeDried ? fd.id : "food-diy",
        chosenLevel: freezeDried ? "premium" : "essential",
        byChoice: freezeDried,
        options: [
          { level: "essential", itemId: "food-diy", name: "Bulk staples you store yourself", qty: 1, low: food.cost, high: food.cost },
          { level: "premium", itemId: fd.id, name: fd.name, qty, low: fd.priceLow * qty, high: fd.priceHigh * qty },
        ],
      },
    ];
  }

  return {
    rulesVersion: RULES_VERSION,
    computedAt: now.toISOString(),
    answers: a,
    profile,
    household: h,
    flags,
    tags: [...tags].sort(),
    water,
    food,
    diapers,
    formula,
    sanitation,
    pets,
    power,
    heat,
    cash: { perAdult, total: perAdult * a.adults },
    evacuation,
    budget,
  };
}
