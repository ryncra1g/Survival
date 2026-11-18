import { LABELS } from "@/lib/answers/schema";
import type { ComputedPlan, GearPick } from "@/lib/rules/engine";
import type { RuleConstants } from "@/lib/rules/constants";
import { atLeast } from "@/lib/zip/profile";
import {
  APARTMENT_GENERATOR_RULE,
  BLEACH_RULE,
  CO_RULE,
  INDOOR_HEATER_RULE,
  MED_RULE,
  TRANSFER_RULE,
} from "@/lib/safety/required";
import { DISCLAIMER, SOURCES, type Block, type PlanDocument, type Section } from "./document";
import { fillTokens, n, plural, range, usd, usdRange } from "./format";
import { AFFILIATE_DISCLOSURE, buyUrl, emailSafeBuyUrl } from "@/lib/affiliate";

/**
 * Turns the computed plan into the PlanDocument structure.
 *
 * Every number is formatted here from ComputedPlan values. Section summaries are templates
 * with {{tokens}}; the LLM writer may replace a summary template, but only with text that
 * uses the same tokens (see lib/llm/writer.ts). Tables, checklists and if/then rows are
 * always produced here.
 */

export interface SectionDraft {
  id: string;
  title: string;
  /** Template summary with {{tokens}}. */
  summaryTemplate: string;
  /** Plain-language facts the LLM may draw on (no numbers — numbers come via tokens). */
  facts: string[];
  blocks: Block[];
}

export interface PlanDraft {
  tokens: Record<string, string>;
  sections: SectionDraft[];
  subtitle: string;
  affiliateDisclosure: string | null;
}

let checklistCounter = 0;
const check = (prefix: string, items: string[]): Block => ({
  type: "checklist",
  items: items.map((text) => ({ id: `${prefix}-${++checklistCounter}`, text })),
});

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
  t["food.cost"] = usd(f.cost);
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
    t["evac.location"] = { friends_family: "a friend or family member's home", second_property: "your second property", raw_land: "your raw land" }[cp.evacuation.locationType];
  }
  return t;
}

export function buildDraft(cp: ComputedPlan, c: RuleConstants): PlanDraft {
  checklistCounter = 0;
  const a = cp.answers;
  const h = cp.household;
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
  const productsBlock = (picks: GearPick[], later: (p: GearPick) => boolean, caption?: string): Block => ({
    type: "products",
    caption,
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
      "This plan covers {{household.people}} people in the {{region}} area for a {{scenario.adj}} disruption. Every quantity below comes from the planning assumptions in this section.",
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
          ["Home", `${LABELS.home[a.homeType]}, ${plural(a.floors, "floor")}${a.hasBasement ? ", basement" : ""}${a.hasGarage ? ", garage" : ""}${a.hasYard ? ", yard" : ""}`],
          ["Heat / cooking", `${a.heatSources.map((s) => LABELS.heat[s]).join(", ")} / ${LABELS.cooking[a.cooking]}`],
          ["Water", `${a.waterSource === "well" ? "Private well" : "Municipal"}${a.hasFiltration ? ", has filtration" : ""}`],
          ["Backup power", LABELS.backupPower[a.backupPower]],
          ["Vehicles", a.vehicleFuels.length ? a.vehicleFuels.map((v) => LABELS.fuel[v]).join(", ") : "None"],
          ["Fallback location", cp.evacuation ? `${LABELS.fallback[cp.evacuation.locationType]}, ~${n(cp.evacuation.distanceMiles)} miles` : "Shelter in place only"],
          ["Budget", LABELS.budget[a.budget]],
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
          `Generator: ${n(pw.hoursPerDay)} hours/day (${pw.hoursBasis}); inverter generator burns ${range(c.generator.gasolineGalPerHour[0], c.generator.gasolineGalPerHour[1], 2)} gal gasoline/hour at ~half load.`,
          ...(prof.approximate ? ["Your ZIP prefix wasn't in our hazard table, so national-average ratings were used. Check your county's hazard info at Ready.gov."] : []),
        ],
      },
    ],
  });

  // 2. Priorities ---------------------------------------------------------
  const week: string[] = [];
  const month: string[] = [];
  const d60: string[] = [];
  const d90: string[] = [];
  if (cp.flags.medicalDevicePriority)
    week.push("TOP PRIORITY: Call your medical-device supplier about battery backup, and register with your electric utility's medical-needs / life-support registry.");
  if (cp.flags.wellPumpPriority)
    week.push("TOP PRIORITY: Your well pump needs power. Find out its voltage and starting watts (label or well contractor) so you can size a generator or battery and transfer switch.");
  if (h.elderlyOrMobility)
    week.push("Register anyone with mobility or medical needs with your county's special-needs (access & functional needs) registry or shelter program, and arrange who will help them evacuate.");
  week.push(`Test or install CO alarms: ${n(a.floors + (a.hasBasement ? 1 : 0) + 1)} (one per level plus outside sleeping areas).`);
  week.push(`Store your first 3 days of water: ${n(w.threeDayGal)} gallons.`);
  week.push("Turn on Wireless Emergency Alerts and sign up for your county's alert system.");
  week.push("Write the family communications plan (see Communications) and pick an out-of-area contact.");
  week.push(`Set aside ${usd(cp.cash.total)} in small bills.`);
  if (!apt) week.push("Find and label your main water shutoff, gas shutoff and electrical panel.");
  if (a.hasPrescriptions) week.push("Ask your pharmacist or doctor how to keep an extra supply of daily prescriptions on hand.");
  if (cp.diapers) week.push(`Buy 2 weeks of diapers (${n(cp.diapers.perDay * 14)}) and wipes.`);
  if (a.vehicleFuels.some((v) => v !== "ev")) week.push("Keep every gas/diesel vehicle above half a tank from now on.");
  if (a.vehicleFuels.includes("ev")) week.push("Keep EVs charged to at least 80% when severe weather is forecast.");

  month.push(`Finish stored water: ${n(w.storedGal)} gallons (${w.drums ? `${plural(w.drums, "55-gal drum")} + ` : ""}${plural(w.jugs, "7-gal jug")}).`);
  month.push(`Buy Phase 1 gear: ${gearPhaseItems(cp, 1).map((g) => g.item.name.toLowerCase()).join(", ")}.`);
  month.push(`Build a 2-week pantry from the food list (about ${n(Math.ceil((cp.food.dailyKcal * 14) / 1000))} thousand calories).`);
  if (hasGen && cp.flags.furnaceNeedsPower && !apt)
    month.push("Get a licensed electrician's quote for a generator power inlet + interlock (or transfer switch) so the generator can safely run your furnace.");
  if (winter && !apt) month.push("Do the pipe-freeze prep in section 5 (insulate exposed pipes, know how to drain lines).");
  if (cp.pets) month.push("Stock 2 weeks of pet food; ask your vet how to keep extra medication on hand if your pet takes any.");
  if (cp.evacuation) month.push("Pack a go-bag for each person (see the Evacuation section).");
  if (atLeast(prof.hurricane, "moderate")) month.push("Check your flood zone and evacuation zone; review insurance (flood insurance has a 30-day wait).");

  if (a.scenarioDays >= 30) d60.push(`Complete the full ${LABELS.scenarioDays[a.scenarioDays]} food list: ${n(cp.food.totalLbs)} lb of staples.`);
  if (pw.generatorStatus === "recommended") d60.push("Buy the generator and fuel storage; test-run it outdoors, 20+ ft from the house, under load.");
  if (pw.generatorStatus === "owned_portable") d60.push("Service your generator (oil, plug, fresh stabilized fuel) and test-run it under load outdoors.");
  if (w.filterDays > 0) d60.push(`Set up water filtration + collection for days ${n(w.storedDays + 1)}–${n(a.scenarioDays)} (${n(w.filterGal)} gallons).`);
  d60.push("Assemble the sanitation kit (two-bucket toilet, bags, absorbent).");
  if (atLeast(prof.hurricane, "moderate") && !apt) d60.push("Pre-cut and label window protection.");
  if (d60.length < 3) d60.push("Rotate the first stored water and check expiration dates.");

  d90.push(`Phase 3 items: ${gearPhaseItems(cp, 3).map((g) => g.item.name.toLowerCase()).join(", ") || "comfort and communications upgrades"}.`);
  d90.push("Run a 'lights-out weekend': live off your plan for 24–48 hours and fix what breaks.");
  if (cp.evacuation) d90.push(`Drive the route to your ${LABELS.fallback[cp.evacuation.locationType].toLowerCase()} and back; note fuel stops and alternates.`);
  d90.push("Put the maintenance calendar on your phone.");

  S.push({
    id: "priorities",
    title: "Priority list",
    summaryTemplate: "Start with life safety this week, then water and food this month, then power and comfort. Check items off as you go.",
    facts: [
      ...(cp.flags.medicalDevicePriority ? ["Battery backup for a powered medical device is the top priority"] : []),
      ...(cp.flags.wellPumpPriority ? ["Powering the well pump is the top priority"] : []),
    ],
    blocks: [
      { type: "subheading", text: "This week" },
      check("week", week),
      productsBlock(
        cp.budget.picks.filter((p) => p.phase === 1),
        () => false,
        "Phase 1 shopping list (life safety)",
      ),
      { type: "subheading", text: "This month" },
      check("month", month),
      { type: "subheading", text: "Within 60 days" },
      check("d60", d60),
      { type: "subheading", text: "Within 90 days" },
      check("d90", d90),
    ],
  });

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
          { if: `Indoor temperature drops below ${n(c.heat.warmRoomAtF)}°F`, then: "Move everyone into the warm room; close off the rest of the house." },
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
    ], ["Clear dead plants and debris within 5 feet of the house.", "Sign up for county evacuation alerts and know your evacuation zone.", "Keep N95 masks for each person."]);
  if (atLeast(prof.tornado, "moderate"))
    hzRows(`Tornado (${prof.tornado} risk)`, [
      { if: "A tornado watch is issued", then: "Keep shoes on, phones charged, and the weather radio on." },
      { if: "A tornado warning is issued", then: "Go to the basement or a small interior room on the lowest floor; cover heads with helmets, pillows or a mattress." },
    ], ["Pick your shelter spot and practice getting there in under a minute.", "Keep bike helmets for the kids in the shelter spot."]);
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

  // 4. Water -----------------------------------------------------------------
  const waterRows = w.breakdown.map((b) => [b.label, `${n(b.galPerDay, 2)} gal/day`]);
  waterRows.push(["Total", `${n(w.dailyGal, 2)} gal/day`]);
  S.push({
    id: "water",
    title: "Water",
    summaryTemplate:
      w.filterDays > 0
        ? "Your household uses about {{water.dailyGal}} gallons a day. Store {{water.storedGal}} gallons ({{water.storedDays}} days). After that, filter and disinfect collected water for the remaining {{water.filterDays}} days."
        : "Your household uses about {{water.dailyGal}} gallons a day. Store {{water.storedGal}} gallons to cover the full {{water.storedDays}} days.",
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
          ["Containers", `${w.drums ? `${plural(w.drums, "55-gal drum")} + ` : ""}${plural(w.jugs, "7-gal jug")}`],
          ["Filter + collect", w.filterDays > 0 ? `${n(w.filterGal)} gal over ${n(w.filterDays)} days` : "Not needed for this scenario (keep bleach as backup)"],
          ["Bathtub bladder (storm warning)", apt ? "Optional" : "~100 gal for flushing/washing"],
        ],
      },
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
      { type: "bullets", items: ["Store water in food-grade containers away from sunlight and chemicals.", "Replace tap-filled water every 6 months (mark the date).", "Use a 0.1-micron filter for bacteria/protozoa, then disinfect for viruses."] },
    ],
  });

  // 5. Heat & warmth -----------------------------------------------------------
  const heatBlocks: Block[] = [];
  const heatIf: { if: string; then: string }[] = [];
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
          "One warm room: pick a small interior room with few windows (not the basement if it floods). Everyone sleeps there.",
          "Close doors to unused rooms; hang blankets over windows and doorways; put rugs/towels at door gaps.",
          "Layer up: base layer, fleece, hat, socks; cold-rated sleeping bags at night.",
          "Eat and drink warm calories; keep kids and older adults warm first.",
        ],
      });
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
      text: `Your ${a.poweredDevices.map((d) => LABELS.device[d]).join(", ")} needs battery backup that covers at least 2 nights. Ask the device provider which batteries are approved, ask your utility about its medical-needs registry, and know which nearby hospital or shelter has power.`,
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
  const f = cp.food;
  S.push({
    id: "food",
    title: "Food",
    summaryTemplate: "Your household needs about {{food.dailyKcal}} calories a day — {{food.totalKcal}} for the full {{scenario.label}}. The staples below provide it for roughly {{food.cost}}. Eat perishables first, then pantry food, then bulk staples.",
    facts: ["Rotate stored food into normal meals so nothing expires"],
    blocks: [
      { type: "table", caption: "Daily calories", columns: ["Person", "kcal/day"], rows: [...f.perPerson.map((p) => [p.label, n(p.kcal)]), ["Total", n(f.dailyKcal)]] },
      {
        type: "table",
        caption: `Bulk staples for ${LABELS.scenarioDays[a.scenarioDays]} (${n(f.totalKcal)} kcal)`,
        columns: ["Staple", "Pounds", "Buy", "Est. cost"],
        rows: [...f.staples.map((s) => [s.name, n(s.lbs), `${n(s.units)} × ${s.unit}`, usd(s.cost)]), ["Total", n(f.totalLbs), "", usd(f.cost)]],
      },
      ...(cp.formula
        ? [{ type: "paragraph" as const, text: `Infant formula: plan on ${plural(cp.formula.cans, "can")} of powdered formula (planning figure). Ask your pediatrician what to use and follow the label for mixing; use stored or boiled water.` }]
        : []),
      ...(h.toddlersOnMilk ? [{ type: "paragraph" as const, text: "Toddler milk: the powdered milk above is included for this; shelf-stable UHT milk boxes are an easy add." }] : []),
      {
        type: "table",
        caption: "Eating order",
        columns: ["When", "Eat"],
        rows: [
          ["First 4 hours", "Normal meals; keep the fridge closed."],
          ["Day 1–2", "Fridge perishables that are still below 40°F, then freezer food (a full freezer holds ~48 h)."],
          ["Day 3–14", "Pantry and canned food, ready-to-eat items."],
          ["Day 15+", "Bulk staples: rice, beans, oats, pasta with oil, peanut butter, canned protein and produce."],
        ],
      },
      { type: "bullets", items: ["Store staples in sealed food-grade buckets or mylar, cool and dry.", "Include comfort foods, spices, and a manual can opener.", ...(a.pets.some((p) => p.specialDiet) ? ["Stock your pet's special diet separately (see Pets)."] : [])] },
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
        "Family first aid kit (bandages, gauze, tape, elastic wrap, gloves, shears, tweezers, thermometer).",
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
    summaryTemplate: "Agree on how your family will reach each other, keep {{cash.total}} in small bills, and keep copies of key documents in a waterproof pouch.",
    facts: [],
    blocks: [
      {
        type: "table",
        caption: "Family communications plan (fill in)",
        columns: ["Item", "Plan"],
        rows: [
          ["Out-of-area contact", "Name / phone: ____________"],
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
          "FRS/GMRS radios for family and neighbors within a few miles (GMRS needs an FCC license, no exam).",
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

  // 15. Evacuation -----------------------------------------------------------------
  if (cp.evacuation) {
    const ev = cp.evacuation;
    const rawLand = ev.locationType === "raw_land";
    const evRows: string[][] = [
      ["Fuel per vehicle (one way)", `${n(ev.oneWayGalPerVehicle, 1)} gal at ${n(c.evacuation.assumedMpg)} mpg`],
      ["Keep in each tank, minimum", `${n(ev.reserveGalPerVehicle, 1)} gal (one-way + 50% for detours/traffic)`],
    ];
    if (ev.hasEv) evRows.push(["EV range needed", `${n(ev.evMinRangeMiles)} miles (distance + ${n(c.evacuation.evRangeBufferPct)}% for cold/traffic)`]);
    const gearRows: string[][] = rawLand
      ? [
          ["Shelter", "Family tent, 2 heavy tarps, paracord, stakes", "Raw land has no buildings"],
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
          ["Food & water", "3 days for everyone, plus snacks", "Don't arrive as a burden"],
          ["Meds & documents", "All medications, document pouch", ""],
          ["Power", "Power banks, chargers", ""],
        ];
    S.push({
      id: "evacuation",
      title: "Evacuation / bug-out plan",
      summaryTemplate: "Your fallback is {{evac.location}}, about {{evac.distance}} miles away. Leave early on clear triggers, keep each tank above {{evac.reserveGal}} gallons, and keep go-bags ready.",
      facts: rawLand ? ["The raw land has no shelter or utilities, so everything has to come with them"] : [],
      blocks: [
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
        { type: "table", caption: "Fuel & range", columns: ["Item", "Amount"], rows: evRows },
        { type: "table", caption: rawLand ? "Raw-land gear (nothing is there — bring it all)" : "What to bring", columns: ["Category", "Gear", "Note"], rows: gearRows },
        { type: "subheading", text: "Vehicle kit" },
        check("veh", ["Jump starter, tire inflator, tow strap", "Paper road map with 2 routes marked", "Blankets, water, snacks", "Phone chargers", "Flashlight, reflective triangles", ...(a.vehicleFuels.some((v) => v !== "ev") ? ["Never store spare gasoline inside the car cabin"] : [])]),
        { type: "subheading", text: "Go-bag (one per person)" },
        check("gobag", ["Water (1 L) and filter bottle", "3 days of snacks", "Change of clothes, rain layer, hat, gloves", "Headlamp + batteries", "Medications (7-day supply), glasses", "Copies of ID and medication list", "Cash in small bills", "Whistle, mask, hand sanitizer", ...(h.children ? ["Child ID card and comfort item"] : []), ...(cp.pets ? ["Pet food, leash, records"] : [])]),
        ...(rawLand ? [{ type: "callout" as const, tone: "danger" as const, title: "Tents and fumes", text: "Never use a heater, stove, grill or generator inside a tent or vehicle. Cook and run generators in the open, away from where people sleep." }] : []),
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
        title: "What to cut first",
        text: `If money is tight, delay ${b.cutFirst.length ? b.cutFirst.map((s) => s.toLowerCase()).join(", ") : "Phase 3 items"}. Never cut CO alarms, stored water, or ${cp.flags.medicalDevicePriority ? "medical-device backup" : "your heat plan"}. Buy food a little at a time with each grocery trip.`,
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
  const affiliate = [...b.picks, ...b.deferred].some((p) => isBuyable(p));

  // 18. Maintenance ------------------------------------------------------------
  const maint: string[][] = [
    ["Monthly", "Test CO and smoke alarms."],
    ...(hasGen ? [["Monthly", "Run the generator under load outdoors for 20 minutes."]] : []),
    ["Every 6 months", "Replace tap-filled stored water; check food dates and rotate into meals; refresh go-bags for the season."],
    ["Every 12 months", "Rotate stabilized gasoline into cars; replace bleach; check first aid kit; update documents, photos and medication lists."],
    ...(a.heatSources.includes("wood") ? [["Every fall", "Chimney inspection and sweeping."]] : []),
    ...(winter ? [["November", "Winter check: heat plan, pipe insulation, sleeping bags, propane."]] : []),
    ...(atLeast(prof.hurricane, "moderate") ? [["June", "Hurricane season check: window protection, evacuation zone, insurance, fuel."]] : []),
    ...(atLeast(prof.wildfire, "moderate") ? [["Spring", "Wildfire check: clear 5 ft around the house, N95 masks, go-bags."]] : []),
    ["Every 12 months", "Review this plan and regenerate it if your household changes."],
  ];
  S.push({
    id: "maintenance",
    title: "Maintenance calendar",
    summaryTemplate: "Preparedness only works if it's maintained. Put these on your calendar now.",
    facts: [],
    blocks: [{ type: "table", columns: ["When", "Task"], rows: maint }],
  });

  return {
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
    blocks: s.blocks,
  }));
  return {
    title: "Your ReadyPlan",
    subtitle: draft.subtitle,
    generatedAt: cp.computedAt,
    rulesVersion: cp.rulesVersion,
    writer,
    sections,
    disclaimer: DISCLAIMER,
    affiliateDisclosure: draft.affiliateDisclosure,
    sources: SOURCES,
  };
}
