import type { ZipProfile } from "@/lib/zip/profile";
import { hasHouseholdFilter, hasPersonalFilter, LABELS, type Answers } from "@/lib/answers/schema";
import { STAGE, WEEK_MAX } from "./priority";
import { labelKinds } from "./kinds";
import { maintenanceItems } from "./maintenance";
import { dontDoFor, tipsFor, type TipArea } from "@/lib/tips/library";
import { mixLabel, type ComputedPlan, type GearPick } from "@/lib/rules/engine";
import type { RuleConstants } from "@/lib/rules/constants";
import { atLeast } from "@/lib/zip/profile";
import { addHelp } from "./help";
import { alertLink, evacZoneLink, FEMA_FLOOD_MAP, HOWTO, type OfficialLink } from "@/lib/zip/resources";
import {
  APARTMENT_GENERATOR_RULE,
  BLEACH_RULE,
  CO_RULE,
  INDOOR_HEATER_RULE,
  MED_RULE,
  TRANSFER_RULE,
} from "@/lib/safety/required";
import { DISCLAIMER, SOURCES, type Block, type Overview, type PlanDocument, type Section } from "./document";
import { fillTokens, lowerFirst, n, plural, range, usd, usdRange } from "./format";
import { GEAR_TOTAL_LABEL, gearTotal } from "./compare";
import { AFFILIATE_DISCLOSURE, buyUrl, earnsCommission, emailSafeBuyUrl } from "@/lib/affiliate";

/**
 * Turns the computed plan into the PlanDocument structure.
 *
 * Every number is formatted here from ComputedPlan values. Section summaries are templates
 * with {{tokens}}; the LLM writer may replace a summary template, but only with text that
 * uses the same tokens (see lib/llm/writer.ts). Tables, checklists and if/then rows are
 * always produced here.
 */



/**
 * UX-13: one step that names every hazard rated high for the ZIP and its most important action, so it fits in
 * the first 3 steps even with two or three high hazards. Order: the fastest-moving dangers first.
 */
const HIGH_HAZARD_ACTION: { key: "wildfire" | "hurricane" | "flood" | "tornado" | "earthquake" | "heat" | "winter"; name: string; action: (solo: boolean) => string }[] = [
  { key: "wildfire", name: "wildfire", action: (solo) => `know your evacuation zone and route, and pack ${solo ? "your go-bag" : "a go-bag for each person"}` },
  { key: "hurricane", name: "hurricanes", action: () => "look up your hurricane evacuation zone and the route out" },
  { key: "flood", name: "flooding", action: () => "check your flood zone and the way to higher ground" },
  { key: "tornado", name: "tornadoes", action: () => "pick your tornado shelter spot" },
  { key: "earthquake", name: "earthquakes", action: () => "strap the water heater and heavy furniture to the wall" },
  { key: "heat", name: "extreme heat", action: () => "decide where you'll stay cool if the power fails" },
  { key: "winter", name: "winter storms", action: () => "choose a warm room and a safe way to heat it if the power fails" },
];
export const HAZARD_STEP_ID = "week-hazard";
export function highHazardStep(prof: ZipProfile, solo: boolean): Step | null {
  const high = HIGH_HAZARD_ACTION.filter((x) => prof[x.key] === "high");
  if (!high.length) return null;
  const names = high.map((x) => x.name);
  const list = names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
  const actions = high.map((x) => x.action(solo)).join("; ");
  const first = high[0].key;
  const zone = prof.hurricane === "high" ? evacZoneLink(prof) : null;
  const link = zone ? zone : first === "hurricane" ? HOWTO.evacuation : first === "wildfire" ? HOWTO.wildfires : first === "flood" ? HOWTO.floods : first === "tornado" ? HOWTO.severeWeather : first === "heat" ? HOWTO.heat : first === "winter" ? HOWTO.winter : HOWTO.hazards;
  return {
    id: HAZARD_STEP_ID,
    text: `Your area's biggest risk${names.length > 1 ? "s are" : " is"} ${list}. This week, ${actions}.`,
    why: "These are rated high for your ZIP. Doing this now means you can act fast when a warning comes.",
    ...(high.some((x) => x.key === "wildfire") ? { buy: ["go-bag", "go-bag-kit", "go-bag-basic"] } : {}),
    link,
  };
}

/** UX-11: the one plan total (every pick, price × quantity), used by the budget card, the overview and Compare options. */
export const planTotals = (cp: { budget: { picks: { low: number; high: number }[]; consumables: { cost: number }[] } }) => {
  // Consumables (toilet paper, bags, diapers…) have one price, so they add to both ends, as in budget.totalMid.
  const fixed = cp.budget.consumables.reduce((t, x) => t + x.cost, 0);
  return {
    totalLow: cp.budget.picks.reduce((t, p) => t + p.low, 0) + fixed,
    totalHigh: cp.budget.picks.reduce((t, p) => t + p.high, 0) + fixed,
  };
};

/** UX-19: "Your oxygen concentrator and CPAP/BiPAP need", with names lower-cased (acronyms kept) and the verb agreeing. */
export function deviceSentence(devices: Answers["poweredDevices"]): string {
  const names = devices.map((d) => lowerFirst(LABELS.device[d]));
  const list = names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
  return `Your ${list} ${names.length > 1 ? "need" : "needs"}`;
}

/** UX-12: the liftable container from the constants, e.g. "1-gallon" and its full weight in lb. */
const liftable = (c: { water: { liftableGallons: number } }) => `${n(c.water.liftableGallons, 1)}-gallon`;
const liftableLb = (c: { water: { liftableGallons: number; lbPerGallon: number } }) => n(Math.ceil(c.water.liftableGallons * c.water.lbPerGallon));

/** UX-12: for households with mobility needs, wherever stored water is mentioned. */
export const KEEP_WATER_CLOSE = "Keep water where you won't need to lift it far.";
/** UX-3: the one everyday fuel rule (Ready.gov: keep at least a half tank). Never a per-tank gallon target. */
export const HALF_FULL = "Keep every vehicle at least half full.";
export const fillUpLine = (gal: string) => `Your trip needs about ${gal} gallons: fill up completely as soon as a storm or evacuation warning is issued.`;
export interface SectionDraft {
  id: string;
  title: string;
  /** Template summary with {{tokens}}. */
  summaryTemplate: string;
  /** Plain-language facts the LLM may draw on (no numbers — numbers come via tokens). */
  facts: string[];
  blocks: Block[];
  /** D10: the section card's key number, set by sectionKeys() from engine values only. */
  key?: { value: string; label: string };
}

/** D3b: a tips box at the end of water, heat, sanitation, light & power, and a compact one in Day 0. */
function addTips(S: SectionDraft[]) {
  const where: [string, TipArea, boolean][] = [["water", "water", false], ["heat", "heat", false], ["sanitation", "sanitation", false], ["power", "light_power", false], ["day0", "day0", true]];
  for (const [id, area, compact] of where) {
    const s = S.find((x) => x.id === id);
    const tips = tipsFor(area);
    if (!s || !tips.length) continue;
    s.blocks.push({
      type: "tips",
      ...(compact ? { compact: true } : {}),
      tips: tips.map((t) => ({ id: t.id, situation: t.situation, steps: t.steps, source: t.source })),
      dontDo: dontDoFor(area),
    });
  }
}

/** D10: each section's key number for its card, taken from the rules engine (or counted from the plan itself). */
function sectionKeys(cp: ComputedPlan, S: SectionDraft[]) {
  const steps = (id: string) => S.find((s) => s.id === id)?.blocks.reduce((t, b) => t + (b.type === "checklist" ? b.items.length : 0), 0) ?? 0;
  const firstList = (id: string) => {
    const b = S.find((s) => s.id === id)?.blocks.find((x) => x.type === "checklist");
    return b && b.type === "checklist" ? b.items.length : 0;
  };
  const gear = [...cp.budget.picks, ...cp.budget.deferred];
  const hazards = (["hurricane", "flood", "winter", "heat", "wildfire", "earthquake", "tornado"] as const).filter((k) => atLeast(cp.profile[k], "moderate")).length;
  const pw = cp.power;
  const keys: Record<string, { value: string; label: string } | null> = {
    snapshot: { value: plural(cp.household.people, "person", "people"), label: LABELS.scenarioDays[cp.answers.scenarioDays] },
    priorities: { value: n(firstList("priorities")), label: "steps this week" },
    day0: { value: n(steps("day0")), label: "steps when it happens" },
    hazards: hazards ? { value: n(hazards), label: hazards === 1 ? "hazard to prepare for" : "hazards to prepare for" } : null,
    water: { value: `${n(cp.water.storedGal)} gal`, label: "water to store" },
    food: { value: n(cp.food.totalKcal), label: "calories of food" },
    power:
      pw.generatorStatus === "recommended" || pw.generatorStatus === "owned_portable"
        ? { value: `${range(pw.gasolineGalPerDay[0], pw.gasolineGalPerDay[1])} gal`, label: "gasoline a day" }
        : null,
    sanitation: { value: n(cp.sanitation.wasteBags), label: "waste bags" },
    pets: cp.pets ? { value: `${n(cp.pets.foodLbs)} lb`, label: "pet food" } : null,
    kids: cp.household.children ? { value: n(cp.household.children), label: cp.household.children === 1 ? "child" : "children" } : null,
    evacuation: cp.evacuation ? { value: `${n(cp.evacuation.reserveGalPerVehicle, 1)} gal`, label: "fuel for the trip" } : null,
    budget: { value: gearTotal(planTotals(cp)), label: GEAR_TOTAL_LABEL },
    gear: { value: n(gear.length), label: "items" },
    maintenance: { value: n(S.find((s) => s.id === "maintenance")?.blocks.reduce((t, b) => t + (b.type === "table" ? b.rows.length : 0), 0) ?? 0), label: "maintenance tasks" },
  };
  for (const s of S) {
    const k = keys[s.id];
    if (k) s.key = k;
  }
}

export interface PlanDraft {
  tokens: Record<string, string>;
  sections: SectionDraft[];
  subtitle: string;
  affiliateDisclosure: string | null;
  overview: Overview;
}

/** D3: the top of each stated budget range ("$X over your budget" compares with it). The stated budget is never changed. */
const BUDGET_CAP: Record<Answers["budget"], number | null> = { under_500: 500, "500_1500": 1500, "1500_5000": 5000, "5000_plus": null };

let checklistCounter = 0;
/** A checklist step: plain text, or text plus why / what to buy / an official link. */
type Step = string | { text: string; why?: string; buy?: string[]; link?: OfficialLink; id?: string };
const check = (prefix: string, items: Step[]): Block => ({
  type: "checklist",
  items: items.map((st) => {
    if (typeof st === "string") return { id: `${prefix}-${++checklistCounter}`, text: st };
    // Steps with their own id don't advance the counter, so adding one keeps existing ticks lined up.
    const { id, ...rest } = st;
    return { id: id ?? `${prefix}-${++checklistCounter}`, ...rest };
  }),
});

/** D4 Q1: a step for the preferred approach in an emergency. Every one links to official evacuation guidance. */
function approachStep(a: Answers): Step {
  const pets = a.pets.length > 0;
  const text = {
    stay_home: "Plan to stay home when it's safe, and still know where you'd go if officials order an evacuation.",
    family_friends: "Agree with the family or friends you'd stay with: when you'd come, what to bring, and who else could host you if they can't.",
    another_property: "Get your other property ready to use: keys, how to turn on utilities, and supplies kept there.",
    hotel_shelter: `Know your options for a hotel or a public shelter: hotels outside your area, and your nearest shelter${pets ? ", and whether it accepts pets" : ""}.`,
    not_sure: "Decide where you'd go if you had to leave home: family or friends, a hotel, or a public shelter.",
  }[a.approach];
  return { id: "month-approach", text, link: a.approach === "hotel_shelter" ? HOWTO.findShelter : HOWTO.evacuation };
}

/** D4 Q2: destinations without a drive plan get their own step (drive destinations get the route step and the Evacuation section). */
function destinationStep(a: Answers): Step | null {
  switch (a.evacuation.destination) {
    case "hotel":
      return { id: "month-destination", text: "List 2–3 hotels or motels in different directions from home, and call ahead before you leave.", link: HOWTO.evacuation };
    case "public_shelter":
      return { id: "month-destination", text: "Find your nearest public shelter and how you'd get there; shelters open when officials announce them.", link: HOWTO.findShelter };
    case "not_sure":
      return { id: "month-destination", text: "Choose a backup destination outside your area, and write down its address and how to get there.", link: HOWTO.evacuation };
    default:
      return null;
  }
}

function gearPhaseItems(cp: ComputedPlan, phase: 1 | 2 | 3) {
  return cp.budget.picks.filter((p) => p.phase === phase);
}

export function buildTokens(cp: ComputedPlan): Record<string, string> {
  const t: Record<string, string> = {};
  const w = cp.water;
  const f = cp.food;
  const p = cp.power;
  t["scenario.label"] = LABELS.scenarioDays[cp.answers.scenarioDays];
  t["scenario.adj"] = { 3: "72-hour", 14: "2-week", 30: "30-day", 90: "90-day" }[cp.answers.scenarioDays];
  t["scenario.days"] = n(cp.answers.scenarioDays);
  t["household.people"] = n(cp.household.people);
  t["household.adults"] = n(cp.household.adults);
  t["household.children"] = n(cp.household.children);
  t["region"] = cp.profile.region;
  t["water.dailyGal"] = n(w.dailyGal, 2);
  t["water.storedGal"] = n(w.storedGal);
  t["water.storedDays"] = n(w.storedDays);
  t["water.filterGal"] = n(w.filterGal);
  t["water.filterDays"] = n(w.filterDays);
  t["water.jugs"] = n(w.jugs);
  t["water.drums"] = n(w.drums);
  t["water.threeDayGal"] = n(w.threeDayGal);
  t["food.dailyKcal"] = n(f.dailyKcal);
  t["food.totalKcal"] = n(f.totalKcal);
  t["food.totalLbs"] = n(f.totalLbs);
  t["food.cost"] = usd(cp.foodMix.bulk.cost + cp.foodMix.readyCost);
  t["food.mix"] = mixLabel(cp.foodMix.shares);
  t["power.hoursPerDay"] = n(p.hoursPerDay);
  t["power.gasPerDay"] = range(p.gasolineGalPerDay[0], p.gasolineGalPerDay[1]);
  t["power.propanePerDay"] = range(p.propaneGalPerDay[0], p.propaneGalPerDay[1]);
  t["power.storedGas"] = n(p.storedGasolineGal);
  t["power.storedGasDays"] = range(p.storedGasolineDays[0], p.storedGasolineDays[1]);
  t["sanitation.tp"] = n(cp.sanitation.toiletPaperRolls);
  t["cash.total"] = usd(cp.cash.total);
  t["budget.planning"] = usd(cp.budget.planningAmount);
  t["budget.total"] = usd(cp.budget.totalMid);
  t["budget.label"] = LABELS.budget[cp.answers.budget];
  if (cp.diapers) {
    t["diapers.total"] = n(cp.diapers.total);
    t["diapers.perDay"] = n(cp.diapers.perDay);
    t["diapers.current"] = n(cp.diapers.currentSize);
    t["diapers.next"] = n(cp.diapers.nextSize);
  }
  if (cp.pets) {
    t["pets.foodLbs"] = n(cp.pets.foodLbs);
    t["pets.waterGalPerDay"] = n(cp.pets.waterGalPerDay, 2);
  }
  if (cp.evacuation) {
    t["evac.distance"] = n(cp.evacuation.distanceMiles);
    t["evac.oneWayGal"] = n(cp.evacuation.oneWayGalPerVehicle, 1);
    t["evac.reserveGal"] = n(cp.evacuation.reserveGalPerVehicle, 1);
    t["evac.location"] = { friends_family: "a friend or family member's home", second_property: "your second property", raw_land: "your raw land", hotel: "a hotel or motel" }[cp.evacuation.locationType];
  }
  return t;
}

export function buildDraft(cp: ComputedPlan, c: RuleConstants): PlanDraft {
  checklistCounter = 0;
  const a = cp.answers;
  const h = cp.household;
  /** UX-8: one adult and no children. Wording that assumes other people (everyone, each person, kids, "us") changes. */
  const solo = h.people === 1;
  const prof = cp.profile;
  const w = cp.water;
  const pw = cp.power;
  const winter = cp.flags.winter;
  const apt = cp.flags.apartment;
  const hasGen = pw.generatorStatus === "owned_portable" || pw.generatorStatus === "recommended";
  const genWord = pw.generatorStatus === "recommended" ? "a generator (recommended below)" : "your generator";
  const tokens = buildTokens(cp);
  const S: SectionDraft[] = [];
  const isBuyable = (p: GearPick) => !!buyUrl(p.item, c.affiliate.amazonTag);
  const LEVEL_NAME = { essential: "Essential", standard: "Standard", premium: "Premium" } as const;
  const levelsFor = (group?: string) => {
    const slot = group ? cp.budget.slots.find((x) => x.group === group) : undefined;
    if (!slot || slot.options.length < 2) return undefined;
    return slot.options.map((o) => ({ level: o.level, name: o.name, price: usdRange(o.low, o.high), selected: o.itemId === slot.chosen, low: o.low, high: o.high }));
  };
  const productsBlock = (picks: GearPick[], later: (p: GearPick) => boolean, caption?: string, compact?: boolean): Block => ({
    type: "products",
    caption,
    compact,
    items: picks.map((p) => ({
      itemId: p.item.id,
      name: p.item.name,
      category: p.item.category,
      spec: p.item.spec,
      models: p.item.models,
      price: `Typical ${usdRange(p.item.priceLow, p.item.priceHigh)} each`,
      qty: p.qty > 1 ? `× ${n(p.qty)}` : "",
      buyable: isBuyable(p),
      emailSafe: emailSafeBuyUrl(p.item, c.affiliate.amazonTag),
      group: p.item.group,
      levels: levelsFor(p.item.group),
      later: later(p),
    })),
  });

  const hazards: string[] = [];
  const hz = (label: string, l: string) => {
    if (atLeast(l as never, "moderate")) hazards.push(`${label} (${l})`);
  };
  hz("Hurricane", prof.hurricane);
  hz("Flood", prof.flood);
  hz("Winter storms", prof.winter);
  hz("Extreme heat", prof.heat);
  hz("Wildfire", prof.wildfire);
  hz("Earthquake", prof.earthquake);
  hz("Tornado", prof.tornado);

  // 1. Snapshot -----------------------------------------------------------
  const kidsText = h.children ? `${plural(h.children, "child", "children")} (ages ${h.childrenAges.join(", ")})` : "no children";
  const petsText = a.pets.length ? a.pets.map((p) => `${p.count} ${p.size} ${p.type}${p.count > 1 ? "s" : ""}`).join(", ") : "no pets";
  S.push({
    id: "snapshot",
    title: "Household snapshot & planning assumptions",
    summaryTemplate:
      cp.household.people === 1
        ? "This plan covers you, on your own, in the {{region}} area for a {{scenario.adj}} disruption. Every quantity below comes from the planning assumptions in this section."
        : "This plan covers {{household.people}} people in the {{region}} area for a {{scenario.adj}} disruption. Every quantity below comes from the planning assumptions in this section.",
    facts: [`Main local hazards: ${hazards.join(", ") || "none rated moderate or higher"}`, `Home: ${LABELS.home[a.homeType]}`],
    blocks: [
      {
        type: "table",
        columns: ["Item", "Your answer"],
        rows: [
          ["Location", `ZIP ${a.zip} — ${prof.region}, ${prof.state} (climate zone ${prof.climateZone})`],
          ["Scenario", LABELS.scenarioDays[a.scenarioDays]],
          ["People", `${plural(h.adults, "adult")}, ${kidsText}${h.elderlyOrMobility ? "; someone elderly or with limited mobility" : ""}`],
          ["Pets", petsText],
          ["Home", `${LABELS.home[a.homeType]}, ${plural(a.floors, "floor")}${a.hasBasement ? ", basement" : ""}${a.hasGarage ? ", garage" : ""}${a.hasYard ? ", yard" : ""}${a.hasShed ? ", shed" : ""}`],
          ["Storage", a.storage.map((s) => LABELS.storage[s]).join(", ")],
          ["Heat / cooking", `${a.heatSources.map((s) => LABELS.heat[s]).join(", ")} / ${LABELS.cooking[a.cooking]}`],
          ["Water", `${a.waterSource === "well" ? "Private well" : "Municipal"}${a.waterFilter !== "none" ? `; filter: ${LABELS.waterFilter[a.waterFilter].toLowerCase()}` : ""}`],
          ["Backup power", LABELS.backupPower[a.backupPower]],
          ["Vehicles", a.vehicleFuels.length ? a.vehicleFuels.map((v) => LABELS.fuel[v]).join(", ") : "None"],
          ["In an emergency", LABELS.approach[a.approach]],
          ["If you must leave", cp.evacuation ? `${LABELS.fallback[cp.evacuation.locationType]}, ~${n(cp.evacuation.distanceMiles)} miles` : LABELS.fallback[a.evacuation.destination]],
          ["Budget", LABELS.budget[a.budget]],
          ["Gear level", `${{ under_500: "Starter", "500_1500": "Ready", "1500_5000": "Well prepared", "5000_plus": "Premium" }[a.budget]}: items default to ${{ essential: "Essential", standard: "Standard", premium: "Premium" }[(c.budget.defaultLevel[a.budget] ?? "standard") as "essential"]} level; change any item to go cheaper or bigger`],
        ],
      },
      {
        type: "table",
        caption: "Local hazard profile (approximate, by ZIP prefix)",
        columns: ["Hazard", "Rating"],
        rows: [
          ["Winter storms / cold", prof.winter],
          ["Extreme heat", prof.heat],
          ["Hurricane", prof.hurricane],
          ["Flooding", prof.flood],
          ["Wildfire", prof.wildfire],
          ["Earthquake", prof.earthquake],
          ["Tornado", prof.tornado],
        ],
      },
      {
        type: "bullets",
        items: [
          `Water: ${n(c.water.adultGalPerDay, 2)} gal/adult/day, ${n(c.water.childGalPerDay, 2)} gal/child/day, plus pets by size. Store up to ${n(c.water.storedDaysCap)} days; filter/collect beyond that.`,
          `Food: ${n(c.calories.adultPerDay)} kcal/adult/day; children by age band (${c.calories.childBands.map(([age, k]) => `≤${age}: ${n(k)}`).join(", ")}).`,
          `Toilet paper: ${n(c.sanitation.toiletPaperRollsPerPersonPerWeek)} roll/person/week. Diapers: ${n(c.diapers.perChildPerDay)}/day per child in diapers.`,
          // Only for households that own a generator or have one in this plan's gear (review 4).
          ...(a.backupPower === "portable_generator" || a.backupPower === "standby_generator" || pw.generatorStatus === "owned_portable" || pw.generatorStatus === "owned_standby" || [...cp.budget.picks, ...cp.budget.deferred].some((p) => p.item.group === "generator" || p.item.id.startsWith("generator-"))
            ? [`Generator: ${n(pw.hoursPerDay)} hours/day (${pw.hoursBasis}); inverter generator burns ${range(c.generator.gasolineGalPerHour[0], c.generator.gasolineGalPerHour[1], 2)} gal gasoline/hour at ~half load.`]
            : []),
          ...(prof.approximate ? ["Your ZIP prefix wasn't in our hazard table, so national-average ratings were used. Check your county's hazard info at Ready.gov."] : []),
        ],
      },
    ],
  });

  // 2. Priorities ---------------------------------------------------------
  const week: Step[] = [];
  const month: Step[] = [];
  const d60: Step[] = [];
  const d90: Step[] = [];
  /** "Buy … gear: 18 items, about $1,234–$2,345." The full list with Buy buttons is the shopping list. */
  // UX-25: each phase step offers every item in its phase, so every gear item has a To do step.
  const phaseStep = (phase: 1 | 2 | 3, lead: string, id?: string): Step => {
    const items = gearPhaseItems(cp, phase);
    return { ...(id ? { id } : {}), text: `${lead}: ${plural(items.length, "item")}, about ${usdRange(items.reduce((t, g) => t + g.low, 0), items.reduce((t, g) => t + g.high, 0))}.`, buy: items.map((p) => p.item.id) };
  };
  if (cp.flags.medicalDevicePriority)
    week.push({ text: "Most important: Call your medical-device supplier about battery backup, and register with your electric utility's medical-needs / life-support registry.", buy: ["med-battery"] });
  if (cp.flags.wellPumpPriority)
    week.push({ text: "Most important: Your well pump needs power. Find out its voltage and starting watts (label or well contractor) so you can size a generator or battery and transfer switch.", buy: ["well-switch"] });
  // UX-13: every hazard rated high for this ZIP has its key action in the first 3 steps, as one combined step
  // right after any "Most important" step (there are at most two of those).
  const hazardStep = highHazardStep(prof, h.people === 1);
  if (hazardStep) week.push(hazardStep);
  if (h.elderlyOrMobility)
    week.push("Register anyone with mobility or medical needs with your county's special-needs (access & functional needs) registry or shelter program, and arrange who will help them evacuate.");
  week.push({
    text: `Test or install CO alarms: ${n(a.floors + (a.hasBasement ? 1 : 0) + 1)} (one per level plus outside sleeping areas).`,
    why: "Carbon monoxide from generators, heaters and grills is one of the most common ways people die after storms and outages, and an alarm is the cheapest life-saver in this plan.",
    buy: ["co-alarm"],
  });
  week.push({
    text: `Store your first 3 days of water: ${n(w.threeDayGal)} gallons.`,
    why: "Taps can stop or become unsafe in an outage, and water is the one supply you can't go without for 3 days.",
    buy: ["water-jug", "water-bricks", "water-gallons", "water-drum"],
  });
  // A moderate hurricane risk still gets the zone lookup; a high one has it in the combined step above.
  const zone = evacZoneLink(prof);
  if (zone && prof.hurricane !== "high")
    week.push({
      id: "week-zone",
      text: "Look up your hurricane evacuation zone and the route out, and decide where you'd go.",
      why: "Evacuation orders are given by zone. Knowing yours now means you leave early, before roads fill.",
      link: zone,
    });
  week.push({
    text: "Turn on Wireless Emergency Alerts and sign up for your county's alert system.",
    why: "Official warnings reach your phone even when TV and internet are out.",
    buy: ["radio"],
    link: alertLink(prof),
  });
  if (cp.household.people === 1) {
    week.push({ text: "Write your communications plan (see Communications) and pick an out-of-area contact.", buy: ["frs-radios", "gmrs"] });
    week.push("Ask a neighbor or nearby friend to check on you during long outages, and agree how you'll reach each other.");
  } else {
    week.push({ text: "Write your household communications plan (see Communications) and pick an out-of-area contact.", buy: ["frs-radios", "gmrs"] });
  }
  week.push(`Set aside ${usd(cp.cash.total)} in small bills.`);
  if (!apt) week.push("Find and label your main water shutoff, gas shutoff and electrical panel.");
  if (a.hasPrescriptions) week.push("Ask your pharmacist or doctor how to keep an extra supply of daily prescriptions on hand.");
  if (cp.diapers) week.push(`Buy 2 weeks of diapers (${n(cp.diapers.perDay * 14)}) and wipes.`);
  if (a.vehicleFuels.some((v) => v !== "ev")) week.push(HALF_FULL);
  if (a.vehicleFuels.includes("ev")) week.push("Keep EVs charged to at least 80% when severe weather is forecast.");

  month.push({ text: w.liftable ? `Finish stored water: ${n(w.storedGal)} gallons in ${liftable(c)} jugs or cases (about ${liftableLb(c)} lb each). ${KEEP_WATER_CLOSE}` : `Finish stored water: ${n(w.storedGal)} gallons (${w.drums ? `${plural(w.drums, "55-gal drum")} + ` : ""}${plural(w.jugs, "7-gal jug")}).`, buy: ["water-drum", "water-jug", "water-bricks", "water-gallons"] });
  month.push(phaseStep(1, "Buy the rest of your Phase 1 (life safety) gear"));
  month.push(`Build a 2-week pantry from the food list (about ${n(Math.ceil((cp.food.dailyKcal * 14) / 1000))} thousand calories).`);
  if (a.homeType === "townhouse")
    month.push({
      id: "month-townhouse",
      text: "Townhouse: check your HOA rules on generators, fuel and storage, and agree with your neighbors where a generator could run: 20+ feet from every door, window and vent, including theirs.",
      buy: ["co-alarm"],
      link: HOWTO.co,
    });
  if (hasGen && cp.flags.furnaceNeedsPower && !apt)
    month.push("Get a licensed electrician's quote for a generator power inlet + interlock (or transfer switch) so the generator can safely run your furnace.");
  if (winter && !apt) month.push({ text: "Do the pipe-freeze prep in section 5 (insulate exposed pipes, know how to drain lines).", buy: ["pipe-insulation"] });
  if (cp.pets) month.push({ text: "Stock 2 weeks of pet food; ask your vet how to keep extra medication on hand if your pet takes any.", buy: ["pet-kit"] });
  if (cp.evacuation) month.push({ text: prof.wildfire === "high" ? "Check your go-bag against the go-bag list (see the Evacuation section)." : solo ? "Pack your go-bag (see the Evacuation section)." : "Pack a go-bag for each person (see the Evacuation section).", buy: ["go-bag", "go-bag-kit", "go-bag-basic"] });
  if (atLeast(prof.hurricane, "moderate")) month.push({ text: "Check your flood zone and evacuation zone; review insurance (flood insurance has a 30-day wait).", link: FEMA_FLOOD_MAP });
  // D4: the preferred approach and where they could go. Fixed ids, so other checklist ids don't shift.
  month.push(approachStep(a));
  const dest = destinationStep(a);
  if (dest) month.push(dest);

  if (a.scenarioDays >= 30)
    d60.push(cp.foodMix.bulk.totalLbs ? `Complete the full ${LABELS.scenarioDays[a.scenarioDays]} food list: ${n(cp.foodMix.bulk.totalLbs)} lb of bulk staples plus the rest of your food mix.` : `Complete the full ${LABELS.scenarioDays[a.scenarioDays]} food supply: ${n(cp.food.totalKcal)} calories in all (see Food).`);
  if (pw.generatorStatus === "recommended") d60.push({ text: "Buy the generator and fuel storage; test-run it outdoors, 20+ ft from the house, under load.", buy: ["generator-dual", "generator-small", "gas-cans"] });
  if (pw.generatorStatus === "owned_portable") d60.push("Service your generator (oil, plug, fresh stabilized fuel) and test-run it under load outdoors.");
  if (w.filterDays > 0) d60.push({ text: `Set up water filtration + collection for days ${n(w.storedDays + 1)}–${n(a.scenarioDays)} (${n(w.filterGal)} gallons).`, buy: ["filter-gravity", "filter-gravity-bag", "filter-basic"] });
  if (gearPhaseItems(cp, 2).length) d60.push(phaseStep(2, "Buy your Phase 2 (power & comfort) gear", "d60-phase2"));
  d60.push({ text: "Assemble the sanitation kit (two-bucket toilet, bags, absorbent).", buy: ["toilet-kit"] });
  if (atLeast(prof.hurricane, "moderate") && !apt) d60.push({ text: "Pre-cut and label window protection.", buy: ["window-protection"] });
  if (d60.length < 3) d60.push("Rotate the first stored water and check expiration dates.");

  d90.push(gearPhaseItems(cp, 3).length ? phaseStep(3, "Buy your Phase 3 upgrades") : "Buy Phase 3 upgrades: comfort and communications.");
  // Gear set aside because it doesn't fit the budget yet.
  if (cp.budget.deferred.length)
    d90.push({
      id: "d90-budget-allows",
      text: `When the budget allows: ${plural(cp.budget.deferred.length, "item")} set aside in your shopping list, about ${usdRange(cp.budget.deferred.reduce((t, g) => t + g.low, 0), cp.budget.deferred.reduce((t, g) => t + g.high, 0))}.`,
      buy: cp.budget.deferred.map((p) => p.item.id),
    });
  d90.push("Run a 'lights-out weekend': live off your plan for 24–48 hours and fix what breaks.");
  const routeText = cp.evacuation
    ? cp.evacuation.vehicles
      ? `Drive the route to your ${LABELS.fallback[cp.evacuation.locationType].toLowerCase()} and back; note fuel stops and alternates.`
      : `Confirm your ride to your ${LABELS.fallback[cp.evacuation.locationType].toLowerCase()} and a backup ride; save your county's evacuation-assistance number.`
    : null;
  if (routeText) d90.push(routeText);
  d90.push("Put the maintenance calendar on your phone.");


  // Skills to practice: tailored to what the household has and knows
  const has = (k: "first_aid" | "camping" | "tools") => a.skills.includes(k);
  const practice: string[] = [
    has("first_aid") ? "First aid: refresh CPR every 2 years and restock the kit with what you'd actually use." : "First aid: take a Red Cross First Aid/CPR class (about 3 hours, often online + one session).",
    has("tools")
      ? "Tools: do the DIY jobs yourself (pipe insulation, water-heater straps, window-protection clips); leave the generator hookup to a licensed electrician."
      : "Shutoffs: have a handy neighbor or your utility show you the gas, water and main electrical shutoffs, and label them.",
  ];
  if (cp.evacuation?.locationType === "raw_land" || a.scenarioDays >= 30)
    practice.push(
      has("camping")
        ? "Camping: check the gear you already own against this plan; it covers much of the outdoor list."
        : "Camping: spend one night \"camping\" at home: set up the tent, cook on the camp stove outdoors, filter a gallon of water.",
    );
  if (pw.generatorStatus === "owned_portable" || pw.generatorStatus === "recommended")
    practice.push("Generator: practice starting it, plugging in the fridge outdoors, and refueling only after a 15-minute cool-down.");
  if (a.heatSources.includes("wood")) practice.push("Wood stove: practice a clean fire and safe ash disposal (metal can, outside, away from the house).");
  if (a.waterSource === "well" && pw.generatorStatus !== "owned_standby") practice.push("Well: learn to switch the pump to backup power with the transfer switch.");
  if (a.poweredDevices.length) practice.push("Medical device: switch it to battery power and time how long the battery lasts.");
  if (w.filterDays > 0 || a.waterFilter !== "none") practice.push("Water: filter and disinfect one gallon start to finish.");
  if (a.pets.length) practice.push("Pets: practice getting each pet into its carrier or on a leash in under 2 minutes.");
  if (h.children) practice.push("Kids: walk to your meeting place together and make it a game.");
  S.push({
    id: "priorities",
    title: "Priority list",
    summaryTemplate: "Start with this week's steps: life safety first. This month and Later hold the rest. Check items off as you go.",
    facts: [
      ...(cp.flags.medicalDevicePriority ? ["Battery backup for a powered medical device is the top priority"] : []),
      ...(cp.flags.wellPumpPriority ? ["Powering the well pump is the top priority"] : []),
    ],
    blocks: priorityBlocks(),
  });

  /**
   * UX-7 (owner decision): the plan opens on "This week": at most WEEK_MAX steps, in the priority order above.
   * The rest go to "This month" (overflow first) and "Later" (the 60- and 90-day work, for every scenario length).
   * Every list still goes through check() in the same order, so step ids (and saved ticks) don't move.
   */
  function priorityBlocks(): Block[] {
    const weekAll = check("week", week);
    const monthList = check("month", month);
    const d60List = check("d60", d60);
    const d90List = check("d90", d90);
    const skillList = check("skill", practice);
    if (weekAll.type !== "checklist" || monthList.type !== "checklist" || d60List.type !== "checklist" || d90List.type !== "checklist") return [];
    const weekList: Block = { ...weekAll, items: weekAll.items.slice(0, WEEK_MAX) };
    const monthAll: Block = { ...monthList, items: [...weekAll.items.slice(WEEK_MAX), ...monthList.items] };
    // UX-25 (owner correction): scenario length is how long the outage lasts, not how long there is to prepare,
    // so every plan keeps its 60- and 90-day preparation, merged into one collapsed "Later" group.
    const later: Block[] = [{ ...d60List, items: [...d60List.items, ...d90List.items] }];
    return [
      { type: "subheading", text: STAGE.week },
      weekList,
      productsBlock(
        cp.budget.picks.filter((p) => p.phase === 1),
        () => false,
        "Phase 1 shopping list (life safety)",
        true,
      ),
      { type: "subheading", text: STAGE.month },
      monthAll,
      { type: "subheading", text: STAGE.later },
      ...later,
      { type: "subheading", text: "Skills to practice" },
      skillList,
    ];
  }

  // 3. Day 0 ---------------------------------------------------------------
  const day0 = [
    "Check CO and smoke alarms; replace batteries if unsure.",
    "Charge every phone, power bank and power station.",
    a.homeType !== "apartment" ? "Fill the bathtub water bladder and spare containers." : "Fill spare containers and pots with tap water.",
    "Set fridge to its coldest setting; fill empty freezer space with water bottles.",
    "Get cash and refill prescriptions if you can.",
    ...(a.vehicleFuels.length ? ["Fuel or charge vehicles."] : []),
    ...(hasGen ? ["Test-start the generator outdoors; stage fuel and cords."] : []),
    ...(winter ? ["Set up your warm room before the cold arrives (see Heat & warmth)."] : []),
    ...(cp.pets ? ["Bring pets inside and stage their food, meds and carrier."] : []),
    "Check on elderly or disabled neighbors.",
  ];
  const triggers: { if: string; then: string }[] = [
    { if: "A CO alarm sounds or anyone has headache, dizziness or nausea", then: "Everyone outside to fresh air now. Call 911. Don't go back in until responders say it's safe." },
    { if: `Power is out more than ${n(c.food.fridgeSafeHours)} hours`, then: "Discard refrigerated perishables that rose above 40°F. Keep the freezer closed (a full freezer holds about 48 hours)." },
    { if: "A boil-water notice is issued or tap water looks/smells wrong", then: "Use stored water; disinfect any other water (see Water)." },
    ...(winter
      ? [
          { if: `Indoor temperature drops below ${n(c.heat.warmRoomAtF)}°F`, then: solo ? "Move into the warm room; close off the rest of the house." : "Move everyone into the warm room; close off the rest of the house." },
          { if: `Indoor temperature drops below ${n(c.heat.evacuateAtF)}°F with no safe heat source`, then: cp.evacuation ? "Go to your fallback location or a warming center." : "Go to a warming center, shelter, or friends/family with power." },
          { if: "Outdoor temperature forecast below 20°F during an outage", then: "Start the pipe-freeze protocol (see Heat & warmth)." },
        ]
      : []),
    ...(cp.flags.medicalDevicePriority
      ? [{ if: "Medical-device battery drops below half with no restoration time", then: "Call your provider, then go to a hospital, shelter or location with power before it runs out." }]
      : []),
    ...(cp.flags.wellPumpPriority ? [{ if: "Well pump has no power", then: "Switch to stored water now; ration flushing; power the pump only through the transfer switch." }] : []),
    { if: "Officials issue an evacuation order for your zone", then: cp.evacuation ? "Leave. Take go-bags and pets to your fallback location." : "Leave. Take go-bags and pets to the shelter or destination officials name." },
    { if: "Sewage backs up or toilets can't flush", then: "Stop flushing; switch to the two-bucket toilet (see Sanitation)." },
    ...(atLeast(prof.hurricane, "moderate") ? [{ if: "A hurricane watch is issued", then: "Do the Day 0 checklist; put up window protection; decide stay vs. go before the warning." }] : []),
  ];
  S.push({
    id: "day0",
    title: "Day 0 checklist & decision triggers",
    summaryTemplate: "When an outage or storm is coming, run this checklist. Once it hits, use the if/then table so decisions are made in advance, not under stress.",
    facts: [],
    blocks: [check("day0", day0), { type: "ifthen", rows: triggers }],
  });

  // 3b. Local hazards ---------------------------------------------------------
  const hazardBlocks: Block[] = [];
  const hzRows = (label: string, rows: { if: string; then: string }[], prep: string[]) => {
    hazardBlocks.push({ type: "subheading", text: label });
    hazardBlocks.push(check(`hz-${label.toLowerCase().replace(/\W+/g, "-")}`, prep));
    hazardBlocks.push({ type: "ifthen", rows });
  };
  if (atLeast(prof.hurricane, "moderate"))
    hzRows(`Hurricane (${prof.hurricane} risk)`, [
      { if: "A hurricane watch is issued (about 48 hours out)", then: "Run the Day 0 checklist, fuel up, put up window protection, decide stay or go." },
      { if: "You're told to evacuate, or you live in a mobile home or low-lying zone", then: "Leave early — before the warning. Roads jam fast." },
      { if: "The eye passes and it goes calm", then: "Stay inside; the back half of the storm is coming." },
    ], ["Look up your evacuation zone (county emergency site).", "Photograph your home and belongings for insurance.", "Know where to shut off power, gas and water."]);
  if (atLeast(prof.flood, "moderate"))
    hzRows(`Flooding (${prof.flood} risk)`, [
      { if: "A flash flood warning is issued", then: "Move to higher ground now. Don't wait for water to rise." },
      { if: "Water covers a road", then: "Turn around. Six inches of moving water can knock you down; a foot can float a car." },
      { if: "Water is entering your home", then: "Turn off electricity at the main breaker only if you're dry and safe; otherwise leave it and get out." },
    ], ["Check whether you're in a flood zone at FEMA's Flood Map Service Center.", "Flood damage usually isn't covered by homeowners insurance; flood policies have a 30-day wait.", "Keep documents and valuables in waterproof bins up high."]);
  if (atLeast(prof.earthquake, "moderate"))
    hzRows(`Earthquake (${prof.earthquake} risk)`, [
      { if: "Shaking starts", then: "Drop, cover and hold on. Don't run outside or stand in a doorway." },
      { if: "Shaking stops", then: "Put on shoes, check for injuries and gas leaks; expect aftershocks." },
      { if: "You smell gas or hear hissing", then: "Shut off the gas at the meter, leave, and call the gas company from outside. Only the utility turns it back on." },
    ], ["Strap the water heater and anchor tall furniture and TVs.", "Keep a shutoff wrench by the gas meter and learn how to use it.", "Put shoes and a flashlight by every bed.", "Your water heater holds 30–80 gallons of emergency water — learn how to drain it."]);
  if (atLeast(prof.wildfire, "moderate"))
    hzRows(`Wildfire & smoke (${prof.wildfire} risk)`, [
      { if: "Air quality index goes over 150", then: "Stay inside with windows closed and the HEPA purifier running; wear N95s outdoors." },
      { if: "An evacuation warning ('get set') is issued", then: "Load go-bags, pets and documents; park facing out." },
      { if: "An evacuation order ('go') is issued", then: "Leave immediately by the route officials give." },
    ], ["Clear dead plants and debris within 5 feet of the house.", "Sign up for county evacuation alerts and know your evacuation zone.", solo ? "Keep N95 masks on hand." : "Keep N95 masks for each person."]);
  if (atLeast(prof.tornado, "moderate"))
    hzRows(`Tornado (${prof.tornado} risk)`, [
      { if: "A tornado watch is issued", then: "Keep shoes on, phones charged, and the weather radio on." },
      { if: "A tornado warning is issued", then: solo ? "Go to the basement or a small interior room on the lowest floor; cover your head with a helmet, pillows or a mattress." : "Go to the basement or a small interior room on the lowest floor; cover heads with helmets, pillows or a mattress." },
    ], ["Pick your shelter spot and practice getting there in under a minute.", h.children ? "Keep bike helmets for the kids in the shelter spot." : "Keep a helmet (a bike helmet works) in the shelter spot."]);
  if (atLeast(prof.heat, "high"))
    hzRows(`Extreme heat (${prof.heat} risk)`, [
      { if: "Power fails during a heat wave", then: "Go to a cooling center, library or mall early in the day; a portable generator can't run central AC." },
      { if: "Someone is confused, has hot dry skin or stops sweating", then: "Call 911 — that's heat stroke. Cool them with wet cloths while you wait." },
    ], ["Water needs can double in extreme heat — store extra beyond the amounts in the Water section if you can.", "Find your nearest cooling centers.", "Check on older neighbors twice a day in a heat wave."]);
  if (hazardBlocks.length)
    S.push({
      id: "hazards",
      title: "Your area's hazards",
      summaryTemplate: "These are the hazards rated moderate or higher for the {{region}} area, with the steps to take before and during each one.",
      facts: [],
      blocks: hazardBlocks,
    });

  // Where to keep supplies, by the storage the household said it has
  // Each storage answer is a step with containers to buy (Buy shows only for gear in this plan) and a how-to.
  // Fixed ids so adding one never shifts other checklist ids (and saved ticks).
  const storeTips: Step[] = [];
  if (a.storage.includes("basement"))
    storeTips.push({ id: "store-basement", text: a.hasBasement && atLeast(prof.flood, "moderate") ? "Basement: water and canned food on shelves at least a foot off the floor (your area floods); nothing you'd need in a flood down there." : "Basement: cool and dark, ideal for water and staples; keep them on shelves, off bare concrete.", buy: ["water-drum", "storage-kit", "water-jug"], link: HOWTO.kit });
  if (a.storage.includes("garage"))
    storeTips.push({ id: "store-garage", text: "Garage: water jugs and bulk staples in sealed bins, away from the car's exhaust, chemicals and direct sun; not for anything that spoils in heat.", buy: ["storage-kit", "water-jug", "water-drum"], link: HOWTO.kit });
  if (a.storage.includes("shed"))
    storeTips.push({ id: "store-shed", text: "Shed: the right place for gas cans and propane cylinders (detached from the house); too hot or cold for food, water and medicine.", buy: ["gas-cans", "propane-20"], link: HOWTO.powerOutages });
  if (a.storage.includes("closets"))
    storeTips.push({ id: "store-closets", text: w.liftable ? `Closets: ${liftable(c)} jugs on the floor or a low shelf, food in labelled bins at waist height, go-bags by the door. ${KEEP_WATER_CLOSE}` : "Closets: water bricks or 7-gallon jugs on the floor, food in labelled bins on the top shelf, go-bags by the door.", buy: ["water-bricks", "water-jug", "storage-kit"], link: HOWTO.kit });
  if (a.storage.includes("other_indoor"))
    storeTips.push({ id: "store-other-indoor", text: w.liftable ? `Other indoor space (a spare room, under the stairs or beds): ${liftable(c)} jugs and labelled bins at waist height, away from heaters and direct sun.` : "Other indoor space (a spare room, under the stairs or beds): water bricks and labelled bins, away from heaters and direct sun.", buy: ["water-bricks", "storage-kit", "water-jug"], link: HOWTO.kit });
  if (a.hasShed && !a.storage.includes("shed"))
    storeTips.push({ id: "store-shed-fuel", text: "Shed: even if it isn't right for supplies, it's the place for gas cans and propane cylinders, away from the house.", buy: ["gas-cans", "propane-20"], link: HOWTO.powerOutages });
  if (a.storage.includes("none"))
    storeTips.push({
      id: "store-none",
      text: "No suitable storage: keep the first 3 days of water and a go-bag, and buy the rest as soon as a storm or shortage is forecast, before stores sell out.",
      buy: ["water-bricks", "go-bag-basic"],
      link: HOWTO.kit,
    });
  if (a.storage.includes("limited"))
    storeTips.push({
      id: "store-limited",
      text: `Limited space: start with ${a.scenarioDays > 14 ? "the first 2 weeks and add as space allows" : "what fits"}; use under-bed bins, stackable water bricks and the back of closets, and count the tub bladder as your flushing water.`,
      buy: ["water-bricks", "tub-bladder", "water-jug"],
      link: HOWTO.lowCost,
    });

  // 4. Water -----------------------------------------------------------------
  const waterRows = w.breakdown.map((b) => [b.label, `${n(b.galPerDay, 2)} gal/day`]);
  waterRows.push(["Total", `${n(w.dailyGal, 2)} gal/day`]);
  S.push({
    id: "water",
    title: "Water",
    summaryTemplate:
      w.filterDays > 0
        ? "Your household uses about {{water.dailyGal}} gal of water a day. Store {{water.storedGal}} gallons ({{water.storedDays}} days). After that, filter and disinfect collected water for the remaining {{water.filterDays}} days."
        : "Your household uses about {{water.dailyGal}} gal of water a day. Store {{water.storedGal}} gallons to cover the full {{water.storedDays}} days.",
    facts: [
      ...(a.waterSource === "well" ? ["Their well pump needs electricity, so tap water stops in an outage"] : ["Municipal water usually keeps flowing at first but can lose pressure or be contaminated"]),
    ],
    blocks: [
      { type: "table", caption: "Daily need (drinking + basic cooking/hygiene)", columns: ["Who", "Per day"], rows: waterRows },
      {
        type: "table",
        caption: "Storage plan",
        columns: ["What", "Amount"],
        rows: [
          ["Stored target", `${n(w.storedGal)} gal (${n(w.storedDays)} days)`],
          [
            "Containers",
            w.liftable
              ? `${n(w.jugs)} ${liftable(c)} jugs or cases (about ${liftableLb(c)} lb each when full)`
              : cp.budget.picks.some((p) => p.item.id === "water-gallons")
              ? `${w.drums ? `${plural(w.drums, "55-gal drum")} + ` : ""}${n(w.storedGal - w.drums * 55)} gallon jugs or refilled 2-liter bottles (low-cost); upgrade to ${plural(w.jugs, "7-gal jug")} when you can`
              : `${w.drums ? `${plural(w.drums, "55-gal drum")} + ` : ""}${plural(w.jugs, "7-gal jug")}`,
          ],
          ["Filter + collect", w.filterDays > 0 ? `${n(w.filterGal)} gal over ${n(w.filterDays)} days` : "Not needed for this scenario (keep bleach as backup)"],
          ["Bathtub bladder (storm warning)", apt ? "Optional" : "~100 gal for flushing/washing"],
        ],
      },
      ...(w.liftable ? [{ type: "paragraph" as const, text: `Containers you can lift: ${liftable(c)} jugs or cases, about ${liftableLb(c)} lb each when full. Larger jugs are too heavy to lift safely. ${KEEP_WATER_CLOSE}` }] : []),
      ...(a.waterSource === "well"
        ? [{ type: "callout" as const, tone: "warning" as const, title: "Well water needs power", text: "Your well pump stops when the power does. Powering the pump (generator or battery sized for its starting watts, through an electrician-installed transfer switch) is a top priority. Keep stored water regardless." }]
        : []),
      {
        type: "ifthen",
        rows: [
          { if: "Tap water is still running and no advisory", then: "Use tap water first; save stored water." },
          { if: "Boil-water notice", then: "Boil or disinfect tap water, or use stored water." },
          { if: "No tap water", then: `Use stored water at ${n(w.dailyGal, 2)} gal/day; use bathtub water for flushing.` },
          ...(w.filterDays > 0 ? [{ if: "Stored water runs low", then: "Collect rain or surface water, filter it, then disinfect it." }] : []),
        ],
      },
      { type: "callout", tone: "info", title: "How to disinfect water", text: BLEACH_RULE },
      // D6 / WT-01: treatment in layers, each with what it does NOT remove (CDC). No amounts: labels and CDC/EPA give them.
      {
        type: "table",
        caption: "Safe water, in this order",
        columns: ["Way", "When", "What it does not remove"],
        rows: [
          ["1. Stored water", "Drink it first.", "Nothing to treat if it was stored clean; replace tap-filled water every 6 months."],
          ["2. Household filter (gravity or pump)", "The main way to make more water.", "Viruses and chemicals: disinfect after filtering."],
          ["3. Treatment tablets", "A light backup to the filter.", "Chemicals and fuel. Iodine and chlorine tablets don't reliably kill Cryptosporidium; chlorine dioxide can, when you follow the label."],
          ["4. Boiling", "The fallback if you have no filter or tablets.", "Chemicals, fuel and toxins."],
          ["5. Straw or bottle filter", "In your go-bag, for one person.", "Viruses and chemicals."],
        ],
      },
      { type: "callout", tone: "warning", title: "Fuel or chemicals in the water", text: "Water with fuel or toxic chemicals in it can't be made safe by boiling or disinfecting. Use stored or bottled water, and contact your health department." },
      { type: "paragraph", text: "This plan never gives treatment amounts: follow the product label and CDC/EPA guidance." },
      { type: "subheading", text: "Your water kit" },
      check("water", [
        { id: "water-kit-containers", text: `Containers for ${n(w.storedGal)} gallons, filled and sealed.`, buy: ["water-jug", "water-bricks", "water-gallons", "water-drum"], link: HOWTO.cdcWater },
        { id: "water-kit-dispense", text: w.liftable ? `A way to pour: ${liftable(c)} jugs pour by hand; keep a clean pitcher nearby.` : w.drums ? "A way to get water out: the drum pump or siphon, and the spigot on each jug." : "A way to get water out: the spigot on each jug, or a clean pitcher.", link: HOWTO.kit },
        { id: "water-kit-labels", text: "Rotation labels: write the fill date on every container.", link: HOWTO.kit },
        ...(hasHouseholdFilter(a) || w.filterDays > 0 ? [{ id: "water-kit-spares", text: "Spare filter elements or a backflush kit for your household filter.", buy: ["filter-spare"] }] : []),
        { id: "water-kit-backup", text: "A backup method: treatment tablets, plus unscented bleach, used as the labels direct.", buy: ["water-tablets", "bleach"], link: HOWTO.waterSafety },
      ]),
      ...(hasHouseholdFilter(a) ? [{ type: "paragraph" as const, text: "You already have a household filter: test it now, and keep spare cartridges or a backflush kit with it." }] : []),
      ...(hasPersonalFilter(a) ? [{ type: "paragraph" as const, text: "Your straw or bottle filter is for one person on the move: keep it in your go-bag." }] : []),
      { type: "bullets", items: ["Store water in food-grade containers away from sunlight and chemicals.", "Replace tap-filled water every 6 months (mark the date).", "Use a 0.1-micron filter for bacteria/protozoa, then disinfect for viruses."] },
    ],
  });

  // 5. Heat & warmth -----------------------------------------------------------
  const heatBlocks: Block[] = [];
  const heatIf: { if: string; then: string }[] = [];
  // Fuel-delivery heat: a step with the winter how-to, whether or not a generator is in the plan.
  const fuelSteps: Step[] = [];
  if (a.heatSources.includes("oil"))
    fuelSteps.push({ id: "heat-oil", text: "Heating oil: keep the tank above a quarter full from November to March, and save your supplier's emergency delivery number; deliveries stop during storms and road closures.", link: HOWTO.winter });
  if (a.heatSources.includes("propane"))
    fuelSteps.push({ id: "heat-propane", text: "Propane heat: keep the tank above half full in winter and save your supplier's emergency number; a full tank is your heat for weeks.", link: HOWTO.winter });
  if (fuelSteps.length) heatBlocks.push(check("heat", fuelSteps));
  for (const key of cp.heat) {
    if (key === "standby_runs_furnace") heatBlocks.push({ type: "paragraph", text: "Your standby generator should run the furnace automatically. Confirm with your installer that the furnace circuit is on the transfer switch, and that natural gas or fuel supply will last." });
    if (key === "generator_inlet_furnace")
      heatBlocks.push({
        type: "paragraph",
        text: `Your ${a.heatSources.filter((s) => s !== "wood" && s !== "electric").map((s) => LABELS.heat[s].toLowerCase()).join("/")} heat needs electricity for the blower, ignition or circulator pump. The safest way to keep it running is ${genWord} connected through a licensed electrician's power inlet and interlock (or a transfer switch). Furnaces draw roughly 400–800 W running, so a 2,500 W+ inverter generator can handle it along with the fridge.`,
      });
    if (key === "wood_stove") heatBlocks.push({ type: "paragraph", text: "Your wood stove is your best no-power heat. Have the chimney inspected yearly, keep seasoned wood dry and off the ground, and keep a CO alarm in the room." });
    if (key === "indoor_propane_heater") heatBlocks.push({ type: "callout", tone: "warning", title: "Backup heater rules", text: INDOOR_HEATER_RULE });
    if (key === "one_warm_room")
      heatBlocks.push({
        type: "bullets",
        items: [
          solo ? "One warm room: pick a small interior room with few windows (not the basement if it floods), and sleep there." : "One warm room: pick a small interior room with few windows (not the basement if it floods). Everyone sleeps there.",
          "Close doors to unused rooms; hang blankets over windows and doorways; put rugs/towels at door gaps.",
          "Layer up: base layer, fleece, hat, socks; cold-rated sleeping bags at night.",
          // UX-8: name only the people this household has.
          h.children && h.elderlyOrMobility ? "Eat and drink warm calories; keep kids and older adults warm first." : h.children ? "Eat and drink warm calories; keep kids warm first." : h.elderlyOrMobility ? "Eat and drink warm calories; keep older adults warm first." : "Eat and drink warm calories.",
        ],
      });
    if (key === "one_warm_room" && a.heatSources.includes("electric"))
      heatBlocks.push(
        check("heat", [
          {
            id: "heat-electric",
            text: `Electric heat stops when the power does: choose your warm room now and keep a cold-rated sleeping bag ${solo ? "in it" : "for each person in it"}.`,
            buy: ["sleep-system"],
            link: HOWTO.winter,
          },
        ]),
      );
    if (key === "apartment_no_combustion")
      heatBlocks.push({ type: "callout", tone: "warning", title: "Apartment heat", text: "Don't use propane heaters, camp stoves or grills in an apartment — fire codes usually ban them and there's no safe ventilation. Use sleeping bags, layering, the one-warm-room plan, and a battery power station for an electric blanket." });
    if (key === "pipe_freeze")
      heatBlocks.push({
        type: "table",
        caption: "Pipe-freeze protocol",
        columns: ["When", "Do this"],
        rows: [
          ["Before winter", "Insulate exposed pipes; cover outdoor faucets; know where the main shutoff is."],
          ["Outage + below 20°F outside", "Open cabinet doors under sinks; let faucets on outside walls drip."],
          ["House below 40°F for 12+ hours", "Shut off the main water valve and open all faucets to drain lines (lowest first)."],
          ["Pipe bursts", "Shut off main water; call a plumber; move valuables; photograph damage for insurance."],
        ],
      });
    if (key === "cooling_plan")
      heatBlocks.push({ type: "bullets", items: ["Heat plan: close blinds by day, open windows at night if safe; use battery fans and wet towels.", "Know the nearest cooling center; check on older neighbors.", "Heat stroke (confusion, hot skin, no sweating) is an emergency — call 911."] });
  }
  if (winter) {
    heatIf.push({ if: `Furnace out and house above ${n(c.heat.warmRoomAtF)}°F`, then: "Close up the house, layer up, wait." });
    heatIf.push({ if: `House below ${n(c.heat.warmRoomAtF)}°F`, then: hasGen && cp.flags.furnaceNeedsPower && !apt ? "Run the furnace from the generator via the inlet/interlock; or move to the warm room." : "Move to the warm room." });
    if (!apt && !cp.flags.hasStandby) heatIf.push({ if: "Warm room still too cold", then: "Use the indoor-rated propane heater in that room with the CO alarm, following its manual." });
    heatIf.push({ if: `House below ${n(c.heat.evacuateAtF)}°F and dropping`, then: "Relocate to a warming center, friends/family, or your fallback location." });
  }
  if (heatIf.length) heatBlocks.push({ type: "ifthen", rows: heatIf });
  heatBlocks.push({ type: "callout", tone: "danger", title: "Carbon monoxide", text: CO_RULE });
  S.push({
    id: "heat",
    title: "Heat & warmth",
    summaryTemplate: winter
      ? "Winter is the most dangerous part of an outage in the {{region}} area. Your plan uses a layered approach: keep the main heat running safely if you can, then shrink to one warm room, then relocate if it gets too cold."
      : "Cold is a lower risk in the {{region}} area, but have a simple warm-room plan and protect against heat during summer outages.",
    facts: [`Heat sources: ${a.heatSources.map((s) => LABELS.heat[s]).join(", ")}`],
    blocks: heatBlocks,
  });

  // 6. Power + fuel ---------------------------------------------------------------
  const powerBlocks: Block[] = [];
  if (apt) powerBlocks.push({ type: "callout", tone: "danger", title: "Generators and apartments", text: APARTMENT_GENERATOR_RULE });
  if (pw.generatorStatus === "recommended")
    powerBlocks.push({ type: "paragraph", text: "You don't have backup power yet. A dual-fuel inverter generator is the best value for your home; a battery power station covers quiet overnight loads." });
  if (pw.generatorStatus === "owned_standby") powerBlocks.push({ type: "paragraph", text: "Your standby generator covers most needs. Keep it serviced yearly and confirm fuel supply (natural gas can be interrupted in earthquakes/floods; propane tanks need refill planning)." });
  if (pw.generatorStatus === "solar_battery") powerBlocks.push({ type: "paragraph", text: "Your solar/battery system is quiet and fume-free. Confirm it can island (run when the grid is down) and which circuits it backs up." });
  if (pw.generatorStatus !== "owned_standby" && !apt) {
    powerBlocks.push({
      type: "table",
      caption: `Fuel math at ${n(pw.hoursPerDay)} hours/day (${pw.hoursBasis})`,
      columns: ["Fuel", "Per day", "Runtime"],
      rows: [
        ...pw.gasolineTable.map((r) => [`${n(r.gallons)} gal gasoline`, `${range(pw.gasolineGalPerDay[0], pw.gasolineGalPerDay[1])} gal`, `${range(r.daysLow, r.daysHigh)} days`]),
        ["One 20-lb propane tank", `${range(pw.propaneGalPerDay[0], pw.propaneGalPerDay[1])} gal`, `${range(pw.propane20lbDays[0], pw.propane20lbDays[1])} days`],
        ["One 100-lb propane cylinder", `${range(pw.propaneGalPerDay[0], pw.propaneGalPerDay[1])} gal`, `${range(pw.propane100lbDays[0], pw.propane100lbDays[1])} days`],
      ],
    });
    powerBlocks.push({
      type: "bullets",
      items: [
        `Recommended stored gasoline for your scenario: ${n(pw.storedGasolineGal)} gal (${plural(pw.gasCans, "5-gal can")}) = ${range(pw.storedGasolineDays[0], pw.storedGasolineDays[1])} days of runtime.`,
        `Stretch fuel: run in blocks (for example 2 hours on, 2 off) — a full fridge stays cold for hours between runs.`,
        `Gasoline goes stale: add stabilizer and rotate into your cars every ${n(c.generator.gasolineShelfLifeMonthsStabilized)} months. Propane doesn't go stale, so it's better for long storage.`,
        ...(a.scenarioDays >= 30 ? ["For a long outage you can't store enough gasoline: plan on propane cylinders, rationed runtime, and refueling when stations reopen."] : []),
      ],
    });
  }
  if (a.poweredDevices.length)
    powerBlocks.push({
      type: "callout",
      tone: "warning",
      title: "Powered medical devices come first",
      text: `${deviceSentence(a.poweredDevices)} battery backup that covers at least 2 nights. Ask the device provider which batteries are approved, ask your utility about its medical-needs registry, and know which nearby hospital or shelter has power.`,
    });
  powerBlocks.push({
    type: "ifthen",
    rows: [
      { if: "Power out, short outage expected", then: "Use power banks/power station; keep fridge closed." },
      ...(hasGen
        ? [
            { if: "Power out more than 4 hours", then: "Set the generator outdoors 20+ ft from the house, exhaust away; run fridge/freezer cycles." },
            { if: "Generator needs refueling", then: "Shut it off and let it cool for 15+ minutes before refueling." },
            { if: "Rain or snow", then: "Use a generator tent/cover rated for it, still in open air — never move it into the garage." },
          ]
        : []),
      { if: "Utility lines down near home", then: "Stay 35+ ft away and call the utility." },
    ],
  });
  if (!apt) powerBlocks.push({ type: "callout", tone: "danger", title: "Connecting a generator to your house", text: TRANSFER_RULE });
  powerBlocks.push({ type: "callout", tone: "danger", title: "Carbon monoxide", text: CO_RULE });
  S.push({
    id: "power",
    title: "Power & fuel math",
    summaryTemplate:
      apt
        ? "In an apartment, batteries are your power plan: they're quiet and give off no fumes. Charge everything at the first warning."
        : pw.generatorStatus === "owned_standby"
          ? "Your standby generator is your main power plan; keep it serviced and know your fuel supply."
          : "Plan on about {{power.hoursPerDay}} generator hours a day, burning {{power.gasPerDay}} gallons of gasoline. Stored fuel of {{power.storedGas}} gallons lasts about {{power.storedGasDays}} days.",
    facts: [`Backup power today: ${LABELS.backupPower[a.backupPower]}`],
    blocks: powerBlocks,
  });

  // 7. Food -----------------------------------------------------------------------
  // D7: the calorie total is fixed by the rules; the mix (bulk staples / ready-to-eat / kits) only changes how
  // it's supplied. Ready-to-eat and kits are shown as calorie targets, never as can or pouch counts.
  const f = cp.food;
  const fm = cp.foodMix;
  const fdItem = [...cp.budget.picks, ...cp.budget.deferred].find((p) => p.item.id === "food-freeze-dried");
  const mixRows: string[][] = [];
  if (fm.kcal.ready) mixRows.push(["Ready-to-eat: canned meals, soups, pouches", `${Math.round(fm.shares.ready * 100)}%`, `about ${n(fm.kcal.ready)} kcal (check the labels)`, usd(fm.readyCost)]);
  if (fm.kcal.bulk) mixRows.push(["Bulk staples you store yourself", `${Math.round(fm.shares.bulk * 100)}%`, `${n(fm.kcal.bulk)} kcal: ${n(fm.bulk.totalLbs)} lb (table below)`, usd(fm.bulk.cost)]);
  if (fm.kcal.kits) mixRows.push(["Ration & freeze-dried kits", `${Math.round(fm.shares.kits * 100)}%`, `about ${n(fm.kcal.kits)} kcal${fdItem ? ` (${plural(fdItem.qty, "1-person, 30-day kit")})` : ""}`, fdItem ? usdRange(fdItem.low, fdItem.high) : "see gear"]);
  const foodBlocks: Block[] = [
    { type: "table", caption: "Daily calories", columns: ["Person", "kcal/day"], rows: [...f.perPerson.map((p) => [p.label, n(p.kcal)]), ["Total", n(f.dailyKcal)]], detail: true },
    {
      type: "table",
      caption: `Your food mix: ${fm.choice === "mix" ? "recommended for your household" : "your choice"} (${n(f.totalKcal)} kcal in all)`,
      columns: ["Approach", "Share", "Calories", "Est. cost"],
      rows: mixRows,
    },
  ];
  if (fm.kcal.bulk)
    foodBlocks.push({
      type: "table",
      caption: `Bulk staples (${n(fm.kcal.bulk)} kcal)`,
      columns: ["Staple", "Pounds", "Buy", "Est. cost"],
      rows: [...fm.bulk.staples.map((st) => [st.name, n(st.lbs), `${n(st.units)} × ${st.unit}`, usd(st.cost)]), ["Total", n(fm.bulk.totalLbs), "", usd(fm.bulk.cost)]],
    });
  else
    foodBlocks.push({
      type: "table",
      caption: `If you switch to bulk staples: the full list for ${n(f.totalKcal)} kcal (for reference)`,
      columns: ["Staple", "Pounds", "Buy", "Est. cost"],
      rows: [...f.staples.map((st) => [st.name, n(st.lbs), `${n(st.units)} × ${st.unit}`, usd(st.cost)]), ["Total", n(f.totalLbs), "", usd(f.cost)]],
      detail: true,
    });
  if (cp.formula)
    foodBlocks.push({ type: "paragraph", text: `Infant formula: plan on ${plural(cp.formula.cans, "can")} of powdered formula (planning figure). Ask your pediatrician what to use and follow the label for mixing; use stored or boiled water.` });
  if (h.toddlersOnMilk)
    foodBlocks.push({ type: "paragraph", text: fm.kcal.bulk ? "Toddler milk: the powdered milk above is included for this; shelf-stable UHT milk boxes are an easy add." : "Toddler milk: add shelf-stable UHT milk boxes or powdered milk to your ready-to-eat food." });
  foodBlocks.push(
    {
      type: "table",
      caption: "Eating order",
      columns: ["When", "Eat"],
      rows: [
        ["First 4 hours", "Normal meals; keep the fridge closed."],
        ["Day 1–2", "Fridge perishables that are still below 40°F, then freezer food (a full freezer holds ~48 h)."],
        ["Day 3–14", "Pantry and canned food, ready-to-eat items."],
        ["Day 15+", fm.kcal.bulk ? "Bulk staples: rice, beans, oats, pasta with oil, peanut butter, canned protein and produce." : "The rest of your ready-to-eat food and kits."],
      ],
    },
    {
      type: "table",
      caption: "Compare food options",
      detail: true,
      columns: ["", "Bulk staples", "Ready-to-eat", "Ration & freeze-dried kits"],
      rows: [
        ["Cost for your whole supply", usd(cp.budget.slots.find((x) => x.group === "food")?.options.find((o) => o.itemId === "food-diy")?.low ?? fm.bulk.cost), usd(cp.budget.slots.find((x) => x.group === "food")?.options.find((o) => o.itemId === "food-ready")?.low ?? fm.readyCost), (() => { const o = cp.budget.slots.find((x) => x.group === "food")?.options.find((x) => x.level === "premium"); return o ? usdRange(o.low, o.high) : "—"; })()],
        ["Preparation", "Cook: simmer rice, beans and oats", "Open and eat; heat if you can", "Add hot water to freeze-dried meals; ration bars are ready"],
        ["Water and fuel", "Water and fuel to cook", "Little or none", "Hot water for freeze-dried meals"],
        ["Space", "Buckets: compact for the calories", "Most space for the calories", "Compact"],
        ["Shelf life", "Long when sealed; rotate into meals", "Check the dates; rotate into meals", "Longest; check the label"],
      ],
    },
    {
      type: "bullets",
      items: [
        ...(fm.kcal.bulk ? [`Store dry staples (rice, beans, oats, pasta, powdered milk) in sealed food-grade buckets or mylar, cool and dry: about ${plural(fm.bulk.buckets, "5-gallon bucket")} for ${n(fm.bulk.dryLbs)} lb. Canned goods, oil and peanut butter stay in their own containers.`] : []),
        "Ration bars are for go-bags and the first days, not your whole supply.",
        ...(fm.kcal.kits ? ["Freeze-dried meals need hot water: count it in your water and cooking fuel."] : []),
        "Adjust for any allergies or diets in your household.",
        "Include comfort foods, spices, and a manual can opener.",
        ...(a.pets.some((p) => p.specialDiet) ? ["Stock your pet's special diet separately (see Pets)."] : []),
      ],
    },
  );
  if (levelsFor("food")) foodBlocks.push({ type: "levelchoice", group: "food", caption: "Switch or mix your food: the calorie total stays the same", levels: levelsFor("food")! });
  S.push({
    id: "food",
    title: "Food",
    summaryTemplate: "Your household needs about {{food.dailyKcal}} calories a day — {{food.totalKcal}} for the full {{scenario.label}}. Your mix: {{food.mix}}. Eat perishables first, then pantry food, then bulk staples.",
    facts: ["Rotate stored food into normal meals so nothing expires"],
    blocks: [
      ...foodBlocks,
      { type: "subheading", text: "Where to keep it" },
      check("store", storeTips),
    ],
  });

  // 8. Cooking & refrigeration ---------------------------------------------------
  const cookBlocks: Block[] = [];
  if (a.cooking === "gas")
    cookBlocks.push({ type: "paragraph", text: "A gas range usually works in an outage if you light the burners with a match (check your manual; ovens with electronic controls usually won't work). Run the range hood or crack a window, and keep the CO alarm working." });
  else
    cookBlocks.push({
      type: "paragraph",
      text: apt
        ? `Your ${LABELS.cooking[a.cooking].toLowerCase()} stove won't work without power. Plan on no-cook food, plus a power station for a kettle or rice cooker if it's large enough.`
        : `Your ${LABELS.cooking[a.cooking].toLowerCase()} stove won't work without power. Cook on a propane camp stove or grill outdoors, at least 20 feet from doors and windows, or run a hot plate from the generator through an outdoor-rated cord.`,
    });
  cookBlocks.push({
    type: "ifthen",
    rows: [
      { if: "Fridge above 40°F for more than 4 hours", then: "Throw out meat, dairy, leftovers and cut produce. When in doubt, throw it out." },
      { if: "Freezer food still has ice crystals or is at 40°F or below", then: "Safe to refreeze or cook." },
      ...(hasGen ? [{ if: "Running a generator", then: "Run fridge/freezer 1–2 hours at a time; keep doors shut between runs." }] : []),
      { if: "Cooler use", then: "Keep it in the shade and packed with ice; check with a thermometer." },
    ],
  });
  cookBlocks.push({ type: "callout", tone: "danger", title: "Cook outdoors only", text: "Grills, camp stoves and charcoal give off carbon monoxide. Use them outdoors only — never inside, in a garage or on an enclosed porch." });
  S.push({ id: "cooking", title: "Cooking & refrigeration", summaryTemplate: "Plan how you'll cook without power and when to throw out fridge food. The four-hour rule keeps everyone from getting sick.", facts: [`Cooking: ${LABELS.cooking[a.cooking]}`], blocks: cookBlocks });

  // 9. Sanitation --------------------------------------------------------------------
  const san = cp.sanitation;
  const sanRows = [
    ["Toilet paper", `${n(san.toiletPaperRolls)} rolls`],
    ["Heavy-duty waste bags", `${n(san.wasteBags)}`],
    ["Trash bags", `${n(san.trashBags)}`],
    ["Absorbent (cat litter/sawdust)", "2–3 bags"],
    ["Hand soap, sanitizer, wipes", "2+ weeks' worth"],
  ];
  if (cp.diapers) {
    sanRows.push(["Diapers — current size", n(cp.diapers.currentSize)]);
    if (cp.diapers.nextSize) sanRows.push(["Diapers — next size up", n(cp.diapers.nextSize)]);
    sanRows.push(["Baby wipes", `${n(cp.diapers.wipes)} (${plural(cp.diapers.wipesPacks, "pack")})`]);
  }
  S.push({
    id: "sanitation",
    title: "Sanitation, hygiene & diapers",
    summaryTemplate: cp.diapers
      ? "Store {{sanitation.tp}} rolls of toilet paper and {{diapers.total}} diapers ({{diapers.perDay}} a day). If toilets can't flush, switch to a two-bucket toilet."
      : "Store {{sanitation.tp}} rolls of toilet paper. If toilets can't flush, switch to a two-bucket toilet.",
    facts: [],
    blocks: [
      { type: "table", columns: ["Supply", "Amount"], rows: sanRows },
      ...(cp.diapers && cp.diapers.nextSize ? [{ type: "paragraph" as const, text: "Kids grow fast in a long scenario: half the diapers are in the next size up." }] : []),
      {
        type: "ifthen",
        rows: [
          { if: "Water and sewer working", then: "Flush normally; conserve water." },
          { if: "No water but sewer OK", then: "Flush by pouring a bucket of non-drinking water into the bowl." },
          { if: "Sewer backing up or officials say don't flush", then: "Line the toilet or a bucket with two bags, add absorbent after each use, tie off and store outside in a lidded can." },
        ],
      },
      { type: "bullets", items: ["Wash hands with soap and water, or sanitizer when water is short.", "Keep human waste away from food and water areas."] },
    ],
  });

  // 10. First aid & medications -------------------------------------------------------
  S.push({
    id: "firstaid",
    title: "First aid & medications",
    summaryTemplate: "Keep a stocked first aid kit and a written list of everyone's medications and allergies. Talk to your doctor or pharmacist about keeping an extra supply.",
    facts: [...(a.hasPrescriptions ? ["Someone takes daily prescriptions"] : []), ...(a.skills.includes("first_aid") ? ["Someone has first aid training"] : ["No one has first aid training yet"])],
    blocks: [
      check("fa", [
        "First aid kit (bandages, gauze, tape, elastic wrap, gloves, shears, tweezers, thermometer).",
        "Written list of each person's medications, doses as prescribed, allergies and doctors (keep with documents).",
        ...(a.hasPrescriptions ? ["Ask your pharmacist about early refills or a 90-day supply; many states allow emergency refills during declared disasters."] : []),
        ...(a.hasPrescriptions ? ["Learn which medications need refrigeration and keep a small cooler and ice packs for them."] : []),
        "Over-the-counter basics you already use (pain/fever reducer, allergy, stomach) — check expiration dates.",
        "Extra glasses/contacts, hearing aid batteries.",
        ...(h.children ? ["Children's versions of any OTC medicines you use, with the dosing tool that came in the box."] : []),
        ...(!a.skills.includes("first_aid") ? ["Take a Red Cross First Aid/CPR class."] : []),
      ]),
      { type: "callout", tone: "info", title: "Medications", text: MED_RULE },
    ],
  });

  // 11. Comms, cash, documents -----------------------------------------------------------
  S.push({
    id: "comms",
    title: "Communications, cash & documents",
    summaryTemplate: cp.household.people === 1
        ? "Agree on who checks on you and how you'll reach family or friends, keep {{cash.total}} in small bills, and keep copies of key documents in a waterproof pouch."
        : "Agree on how your household will reach each other, keep {{cash.total}} in small bills, and keep copies of key documents in a waterproof pouch.",
    facts: [],
    blocks: [
      {
        type: "table",
        caption: "Communications plan (fill in)",
        columns: ["Item", "Plan"],
        rows: [
          ["Out-of-area contact", "Name / phone: ____________"],
          ...(cp.household.people === 1 ? [["Who checks on me", "Neighbor or friend, name / phone: ____________"]] : []),
          ["Meeting place near home", "____________"],
          ["Meeting place outside neighborhood", "____________"],
          ...(cp.evacuation ? [["Fallback location", `${LABELS.fallback[cp.evacuation.locationType]} (~${n(cp.evacuation.distanceMiles)} mi): address on paper in each go-bag`]] : []),
          ...(h.children ? [["School/daycare pickup", "Who picks up, and the school's emergency plan"]] : []),
        ],
      },
      {
        type: "bullets",
        items: [
          "Text, don't call — texts get through congested networks.",
          "NOAA weather radio for alerts when cell and internet are down.",
          "FRS/GMRS radios to reach your household and neighbors within a few miles (GMRS needs an FCC license, no exam).",
          `Cash: ${usd(cp.cash.total)} (${usd(cp.cash.perAdult)} per adult) in small bills; card readers fail in outages.`,
          "Documents: copies of IDs, insurance policies, deeds/leases, medication list, pet records, and photos of your home's contents — in a waterproof pouch, plus an encrypted cloud copy.",
        ],
      },
    ],
  });

  // 12. Security ----------------------------------------------------------------
  S.push({
    id: "security",
    title: "Security & neighbors",
    summaryTemplate: "Keep a low profile and build a small neighbor pod. Neighbors who look out for each other are the best security in a long outage.",
    facts: [],
    blocks: [
      {
        type: "bullets",
        items: [
          "Low profile: don't post about your supplies; keep stored items out of sight; use curtains at night if you have lights when others don't.",
          ...(hasGen ? ["Chain and lock the generator outdoors, in its safe spot 20+ ft from the house; it's loud and noticeable."] : []),
          "Lock doors and windows; keep exterior lights on a battery or solar motion light.",
          "Neighbor pod: swap numbers with 3–5 nearby households, share skills (medical, tools, childcare), and check on older neighbors.",
          "If you feel unsafe, leave and call 911. Supplies can be replaced; people can't.",
        ],
      },
    ],
  });

  // 13. Kids & morale ---------------------------------------------------------------
  if (h.children) {
    S.push({
      id: "kids",
      title: "Kids & morale",
      summaryTemplate: "Kids cope better when they have a routine and a job. Keep things predictable and give them a role in the plan.",
      facts: [`Children ages ${h.childrenAges.join(", ")}`],
      blocks: [
        check("kids", [
          "Keep meal, nap and bedtime routines as close to normal as you can.",
          "Give each child a 'job' (flashlight checker, water helper) so they feel useful.",
          "Comfort kit: favorite stuffed animal/blanket, books, cards, coloring, glow sticks.",
          "Put an ID card in each child's go-bag/pocket: name, parent phone numbers, out-of-area contact.",
          "Practice the plan as a game: 'lights-out dinner', a family meeting-place walk.",
          "Talk simply and honestly; limit news exposure; ask how they're feeling.",
          ...(h.childrenAges.some((x) => x <= 3) ? ["Toddlers: baby gates and covers near any heater or stove; extra outfits and sleep sacks for cold nights."] : []),
        ]),
      ],
    });
  }

  // 14. Pets ------------------------------------------------------------------------
  if (cp.pets) {
    const pets = cp.pets;
    S.push({
      id: "pets",
      title: "Pets",
      summaryTemplate: "Store {{pets.foodLbs}} pounds of pet food and add {{pets.waterGalPerDay}} gallons of water a day for your pets. Keep records and a carrier ready.",
      facts: [],
      blocks: [
        { type: "table", columns: ["Pet", "Food for scenario", "Water/day"], rows: pets.groups.map((g) => [g.label, `${n(g.foodLbs)} lb`, `${n(g.waterGalPerDay, 2)} gal`]) },
        check("pets", [
          "Vaccination records and a recent photo of each pet (in the documents pouch).",
          "Leash, harness, crate/carrier, collapsible bowls, waste bags or litter.",
          "Microchip details up to date.",
          ...(pets.groups.some((g) => g.medications) ? ["Ask your vet how to keep an extra supply of your pet's medication."] : []),
          ...(pets.groups.some((g) => g.specialDiet) ? ["Stock the special diet separately; rotate before it expires."] : []),
          "Know which shelters and hotels on your route accept pets.",
        ]),
        { type: "callout", tone: "info", title: "Pet medications", text: MED_RULE },
      ],
    });
  }

  // 15. When you must leave (D4) -----------------------------------------------------
  const ORDERS_OVERRIDE: Block = { type: "callout", tone: "danger", title: "Official evacuation orders override this plan", text: "Official evacuation orders override this plan. If officials tell you to leave, go, using the routes they give." };
  const destinationTodo: Step = { id: "evac-destination", text: "Add your backup destination: name, address and how to get there, printed for each go-bag.", link: HOWTO.evacuation };
  if (cp.evacuation) {
    const ev = cp.evacuation;
    const rawLand = ev.locationType === "raw_land";
    const evRows: string[][] = [
      ["Fuel per vehicle (one way)", `${n(ev.oneWayGalPerVehicle, 1)} gal at ${n(c.evacuation.assumedMpg)} mpg`],
      ["Fuel for the trip", `about ${n(ev.reserveGalPerVehicle, 1)} gal (one-way + 50% for detours/traffic)`],
    ];
    if (ev.hasEv) evRows.push(["EV range needed", `${n(ev.evMinRangeMiles)} miles (distance + ${n(c.evacuation.evRangeBufferPct)}% for cold/traffic)`]);
    const gearRows: string[][] = rawLand
      ? [
          ["Shelter", "Tent that sleeps everyone, 2 heavy tarps, paracord, stakes", "Raw land has no buildings"],
          ["Water", "All portable jugs + filter + bleach", "No utilities on site"],
          ["Sleep/warmth", "Cold-rated sleeping bags, pads, wool blankets", ""],
          ["Cooking", "Camp stove + propane (outdoor use only), pots, utensils", ""],
          ["Sanitation", "Bucket toilet kit, bags, shovel, toilet paper", ""],
          ["Power", "Power station, solar panel, charging cables", ""],
          ["Food", "Pantry + staples for the first week, cooler", ""],
          ["Tools", "Saw, hatchet, work gloves, headlamps", ""],
        ]
      : [
          ["Bedding", "Sleeping bags or air mattresses", "Don't count on spare beds"],
          ["Food & water", solo ? "3 days of food and water, plus snacks" : "3 days for everyone, plus snacks", "Don't arrive as a burden"],
          ["Meds & documents", "All medications, document pouch", ""],
          ["Power", "Power banks, chargers", ""],
        ];
    S.push({
      id: "evacuation",
      title: "When you must leave",
      summaryTemplate: ev.vehicles
        ? ev.tripNeedsFullTank && a.vehicleFuels.some((v) => v !== "ev")
          ? "Your fallback is {{evac.location}}, about {{evac.distance}} miles away. Leave early on clear triggers and keep go-bags ready. Your trip needs about {{evac.reserveGal}} gallons: fill up completely as soon as a storm or evacuation warning is issued."
          : "Your fallback is {{evac.location}}, about {{evac.distance}} miles away. Leave early on clear triggers and keep go-bags ready."
        : "Your fallback is {{evac.location}}, about {{evac.distance}} miles away. With no car, line up your ride now and leave earlier than drivers would.",
      facts: rawLand ? ["The raw land has no shelter or utilities, so everything has to come with them"] : [],
      blocks: [
        ORDERS_OVERRIDE,
        check("evac", [destinationTodo]),
        {
          type: "ifthen",
          rows: [
            { if: "Mandatory evacuation order for your zone", then: "Leave immediately." },
            ...(h.elderlyOrMobility ? [{ if: "A voluntary evacuation is announced", then: "Leave now with anyone who has mobility or medical needs — they need extra time." }] : []),
            ...(atLeast(prof.hurricane, "moderate") ? [{ if: "Hurricane warning and you're in an evacuation zone or a mobile/weak structure", then: "Leave before the warning window closes — roads fill fast." }] : []),
            ...(winter ? [{ if: `No heat, house below ${n(c.heat.evacuateAtF)}°F, and no restoration estimate`, then: "Relocate while roads are passable." }] : []),
            { if: "No water and no way to filter/collect", then: "Relocate." },
            ...(cp.flags.medicalDevicePriority ? [{ if: "Medical-device power can't be maintained", then: "Go to a location with power now." }] : []),
            { if: "Home damaged or unsafe (gas smell, structural damage, flooding)", then: "Leave now; call 911/utility from a safe place." },
            { if: "Roads closed or unsafe to drive", then: "Shelter in place and use this plan's shelter-in-place sections." },
          ],
        },
        ...(ev.vehicles
          ? [
              { type: "table" as const, caption: "Fuel & range", columns: ["Item", "Amount"], rows: evRows },
              // UX-3: one fuel rule. Half full always; a full tank only when the trip needs more than half.
              ...(a.vehicleFuels.some((v) => v !== "ev")
                ? [{ type: "paragraph" as const, text: ev.tripNeedsFullTank ? `${HALF_FULL} ${fillUpLine(n(ev.reserveGalPerVehicle, 1))}` : HALF_FULL }]
                : []),
            ]
          : [
              { type: "callout" as const, tone: "warning" as const, title: "No car: plan your ride now", text: `Ask a family member, friend or neighbor now to take you, and agree on the trigger that means "come get ${solo ? "me" : "us"}". Save the number for your county's evacuation-assistance or special-needs transport line, and know the nearest public pickup point. Leave on the first warning, not the order: rides and roads disappear fast.` },
            ]),
        { type: "table", caption: rawLand ? "Raw-land gear (nothing is there — bring it all)" : "What to bring", columns: ["Category", "Gear", "Note"], rows: gearRows },
        productsBlock(
          [...cp.budget.picks, ...cp.budget.deferred].filter((p) => p.item.category === "Evacuation" || p.item.group === "two-way"),
          (p) => p.status === "deferred",
          "Go-bag: pick a level for each (Essential, Standard or Premium)",
        ),
        ...(ev.vehicles ? [{ type: "subheading" as const, text: "Vehicle kit" }] : []),
        ...(ev.vehicles ? [check("veh", ["Jump starter, tire inflator, tow strap", "Paper road map with 2 routes marked", "Blankets, water, snacks", "Phone chargers", "Flashlight, reflective triangles", ...(a.vehicleFuels.some((v) => v !== "ev") ? ["Never store spare gasoline inside the car cabin"] : [])])] : []),
        { type: "subheading", text: ev.vehicles ? "Go-bag (one per person)" : "Go-bag (one per person; pack light enough to carry and walk with)" },
        check("gobag", [hasPersonalFilter(a) ? { text: "Water (1 L) and your straw or bottle filter", link: HOWTO.waterSafety } : "Water (1 L) and filter bottle", "3 days of snacks", "Change of clothes, rain layer, hat, gloves", "Headlamp + batteries", "Medications (7-day supply), glasses", "Copies of ID and medication list", "Cash in small bills", "Whistle, mask, hand sanitizer", ...(h.children ? ["Child ID card and comfort item"] : []), ...(cp.pets ? ["Pet food, leash, records"] : [])]),
        ...(rawLand ? [{ type: "callout" as const, tone: "danger" as const, title: "Tents and fumes", text: "Never use a heater, stove, grill or generator inside a tent or vehicle. Cook and run generators in the open, away from where people sleep." }] : []),
      ],
    });
  } else {
    // D4: every plan has "When you must leave", even without a place to drive to.
    const dest = a.evacuation.destination;
    S.push({
      id: "evacuation",
      title: "When you must leave",
      summaryTemplate:
        dest === "public_shelter"
          ? "If you have to leave, your plan is a public shelter. Know where the nearest one is and how you'd get there, and leave when officials say so."
          : "You haven't picked a backup destination yet. Choose one now, write it down, and leave when officials say so.",
      facts: [],
      blocks: [
        ORDERS_OVERRIDE,
        check("evac", [destinationTodo]),
        {
          type: "ifthen",
          rows: [
            { if: "Mandatory evacuation order for your zone", then: "Leave immediately." },
            ...(h.elderlyOrMobility ? [{ if: "A voluntary evacuation is announced", then: "Leave now with anyone who has mobility or medical needs — they need extra time." }] : []),
            { if: "Home damaged or unsafe (gas smell, structural damage, flooding)", then: "Leave now; call 911/utility from a safe place." },
          ],
        },
        ...(dest === "public_shelter" ? [{ type: "paragraph" as const, text: `Shelters open when officials announce them: check your county's alerts and local news.${a.pets.length ? " Most public shelters allow only service animals, so plan where your pets would go." : ""}` }] : []),
        { type: "subheading", text: "Go-bag (one per person; pack light enough to carry)" },
        check("gobag", [hasPersonalFilter(a) ? { text: "Water (1 L) and your straw or bottle filter", link: HOWTO.waterSafety } : "Water (1 L) and filter bottle", "3 days of snacks", "Change of clothes, rain layer, hat, gloves", "Headlamp + batteries", "Medications (7-day supply), glasses", "Copies of ID and medication list", "Cash in small bills", "Whistle, mask, hand sanitizer", ...(h.children ? ["Child ID card and comfort item"] : []), ...(cp.pets ? ["Pet food, leash, records"] : [])]),
      ],
    });
  }

  // 16. Budget -----------------------------------------------------------------------
  const b = cp.budget;
  const phaseName = { 1: "Phase 1 — life safety (CO alarms, water, heat)", 2: "Phase 2 — power & food", 3: "Phase 3 — comfort, solar, comms" } as const;
  const budgetRows: string[][] = [];
  for (const ph of b.phases) {
    budgetRows.push([phaseName[ph.phase], "", "", ""]);
    for (const line of b.consumables.filter((x) => x.phase === ph.phase)) budgetRows.push([`  ${line.label}`, "", usd(line.cost), line.ongoing ? "Ongoing, from grocery budget" : ""]);
    for (const p of b.picks.filter((x) => x.phase === ph.phase))
      budgetRows.push([`  ${p.item.name}`, p.qty > 1 ? `× ${n(p.qty)}` : "", usdRange(p.low, p.high), p.item.essential ? "Essential" : ""]);
    budgetRows.push([`  Phase ${ph.phase} subtotal (target ${usd(ph.target)})`, "", `~${usd(ph.includedMid)}`, ""]);
  }
  budgetRows.push(["Total (midpoint estimate)", "", `~${usd(b.totalMid)}`, `Planning budget ${usd(b.planningAmount)}`]);
  if (b.ongoingCost) budgetRows.push(["Plus ongoing food build-up", "", `~${usd(b.ongoingCost)}`, "Spread over grocery trips"]);
  const deferredRows = b.deferred.map((d: GearPick) => [d.item.name, d.qty > 1 ? `× ${n(d.qty)}` : "", usdRange(d.low, d.high), `Phase ${d.phase}`]);
  S.push({
    id: "budget",
    title: "Budget by phase",
    summaryTemplate: "Within your {{budget.label}} range we planned around {{budget.planning}}. Phase 1 buys life safety first; the whole list comes to about {{budget.total}}.",
    facts: b.deferred.length ? ["Some items didn't fit and are listed as next purchases"] : [],
    blocks: [
      { type: "table", columns: ["Item", "Qty", "Est. cost", "Note"], rows: budgetRows },
      ...(deferredRows.length ? [{ type: "table" as const, caption: "Next purchases when budget allows", columns: ["Item", "Qty", "Est. cost", "Phase"], rows: deferredRows }] : []),
      {
        type: "callout",
        tone: "info",
        title: "Go cheaper or bigger, item by item",
        text: "Items with levels (water, power, filters, radios, go-bags, shelter, vehicle kit, food) can each be switched to Essential, Standard or Premium in Recommended gear. Totals update when you switch.",
      },
      {
        type: "callout",
        tone: "info",
        title: "What to cut first",
        text: `If money is tight, delay ${b.cutFirst.length ? b.cutFirst.map(lowerFirst).join(", ") : "Phase 3 items"}. Never cut CO alarms, stored water, or ${cp.flags.medicalDevicePriority ? "medical-device backup" : "your heat plan"}. Buy food a little at a time with each grocery trip.`,
      },
    ],
  });

  // 17. Recommended gear ---------------------------------------------------------
  S.push({
    id: "gear",
    title: "Recommended gear",
    summaryTemplate: "Buy to the spec, not the brand. The example models are just a starting point for comparing.",
    facts: [],
    blocks: [
      productsBlock([...b.picks, ...b.deferred], (p) => p.status === "deferred"),
      { type: "paragraph", text: `Catalog last reviewed: ${[...b.picks, ...b.deferred].map((p) => p.item.reviewedAt).sort()[0] ?? "n/a"}. Check prices, recalls and current reviews before you buy.` },
    ],
  });
  // Disclose commissions only when a Buy link can actually earn one (plain Amazon searches don't).
  const affiliate = [...b.picks, ...b.deferred].some((p) => isBuyable(p) && earnsCommission(p.item, c.affiliate.amazonTag));

  // 18. Maintenance ------------------------------------------------------------
  // D12: the schedule is data (lib/plan/maintenance.ts), so the calendar file and reminders use the same lines.
  const maint: string[][] = maintenanceItems(cp).map((m) => [m.when, m.task]);
  S.push({
    id: "maintenance",
    title: "Maintenance calendar",
    summaryTemplate: "Preparedness only works if it's maintained. Put these on your calendar now.",
    facts: [],
    blocks: [{ type: "table", columns: ["When", "Task"], rows: maint }],
  });

  // D3b: "No time to buy? Use what you have." boxes (shown only when DIY_TIPS_ENABLED is on).
  addTips(S);
  addHelp(S, prof);
  // D8: every block gets its kind (Good to know / To do / To have).
  labelKinds(S);
  sectionKeys(cp, S);
  const pw2 = cp.power;
  const hasFuel = pw2.generatorStatus === "recommended" || pw2.generatorStatus === "owned_portable";
  const overview: Overview = {
    budget: {
      label: LABELS.budget[a.budget],
      cap: BUDGET_CAP[a.budget],
      ...planTotals(cp),
    },
    stats: [
      { key: "water", value: `${n(cp.water.storedGal)} gal`, label: "water to store", math: `${n(cp.water.dailyGal, 2)} gal/day × ${n(cp.water.storedDays)} days`, anchor: "water" },
      { key: "food", value: n(cp.food.totalKcal), label: "calories of food", math: `${n(cp.food.dailyKcal)}/day × ${n(a.scenarioDays)} days`, anchor: "food" },
      ...(hasFuel
        ? [{ key: "fuel", value: `${range(pw2.gasolineGalPerDay[0], pw2.gasolineGalPerDay[1])} gal`, label: "gasoline per day", math: `${n(pw2.hoursPerDay)} generator hrs × ${range(c.generator.gasolineGalPerHour[0], c.generator.gasolineGalPerHour[1], 2)} gal/hr`, anchor: "power" }]
        : []),
      { key: "cash", value: usd(cp.cash.total), label: "cash on hand", math: `${usd(cp.cash.perAdult)} × ${plural(a.adults, "adult")}`, anchor: "comms" },
    ],
    gear: [...cp.budget.picks, ...cp.budget.deferred].map((p) => ({ itemId: p.item.id, name: p.item.name, qty: p.qty, phase: p.phase, low: p.low, high: p.high, later: p.status === "deferred" })),
  };
  return {
    overview,
    tokens,
    sections: S,
    subtitle: `${plural(h.people, "person", "people")} · ${prof.region} · ${LABELS.scenarioDays[a.scenarioDays]} · ${LABELS.budget[a.budget]}`,
    affiliateDisclosure: affiliate ? AFFILIATE_DISCLOSURE : null,
  };
}

/** Assemble the final document from a draft + (optionally LLM-written) summary templates. */
export function assembleDocument(cp: ComputedPlan, draft: PlanDraft, summaries: Record<string, string>, writer: "template" | "llm"): PlanDocument {
  const sections: Section[] = draft.sections.map((s, i) => ({
    id: s.id,
    number: i + 1,
    title: s.title,
    summary: fillTokens(summaries[s.id] ?? s.summaryTemplate, draft.tokens),
    ...(s.key ? { key: s.key } : {}),
    blocks: s.blocks,
  }));
  return {
    title: "Your emergency plan",
    subtitle: draft.subtitle,
    generatedAt: cp.computedAt,
    rulesVersion: cp.rulesVersion,
    writer,
    sections,
    disclaimer: DISCLAIMER,
    affiliateDisclosure: draft.affiliateDisclosure,
    overview: draft.overview,
    sources: SOURCES,
  };
}
