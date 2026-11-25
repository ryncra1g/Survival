import type { Block } from "@/lib/plan/document";
import { atLeast, type ZipProfile } from "@/lib/zip/profile";
import { alertLink, evacZoneLink, FEMA_FLOOD_MAP, HOWTO, READY_EVACUATION, type OfficialLink } from "@/lib/zip/resources";

/**
 * "Something for the customer" on every recommendation: each checklist step gets catalog items to buy
 * (a Buy button shows only for items already in this plan's gear), an official how-to link, or a pointer
 * to the part of the plan that covers it. Each section also ends with a "What you need" strip.
 * Rules are matched on the step text, first match wins; steps that already carry help are left alone.
 * tests/steps.test.ts fails if any step in any persona's plan is left with nothing.
 */
type See = { label: string; anchor: string };
type Help = { buy?: string[]; link?: OfficialLink; see?: See };
type Rule = [RegExp, (p: ZipProfile) => Help];

const WATER = ["water-jug", "water-bricks", "water-gallons", "water-drum"];
const FILTERS = ["filter-gravity", "filter-gravity-bag", "filter-basic"];
const GENS = ["generator-dual", "generator-small", "power-station-large", "power-station", "power-station-small"];
const GO_BAG = ["go-bag", "go-bag-kit", "go-bag-basic"];
const VEHICLE = ["vehicle-kit", "vehicle-kit-premium", "vehicle-kit-basic"];
const s = (label: string, anchor: string): See => ({ label, anchor });

const STEP_RULES: Rule[] = [
  // Priorities
  [/communications plan/i, () => ({ buy: ["frs-radios", "gmrs", "radio"], link: HOWTO.plan })],
  [/medical-device supplier/i, () => ({ buy: ["med-battery"], link: HOWTO.olderAdults })],
  [/well pump needs power/i, () => ({ buy: ["well-switch", ...GENS], link: HOWTO.powerOutages })],
  [/water filtration|Finish stored water|first \d+ days of water/i, () => ({ buy: [...WATER, ...FILTERS], link: HOWTO.waterSafety })],
  [/CO alarms/i, () => ({ buy: ["co-alarm"], link: HOWTO.co })],
  [/Buy the generator/i, () => ({ buy: GENS, link: HOWTO.co })],
  [/sanitation kit/i, () => ({ buy: ["toilet-kit"], link: HOWTO.kit })],
  [/window protection/i, () => ({ buy: ["window-protection"], link: HOWTO.hazards })],
  [/pipe-freeze/i, () => ({ buy: ["pipe-insulation"], link: HOWTO.winter })],
  [/go-bag for each person|Pack your go-bag/i, () => ({ buy: GO_BAG, see: s("Go-bag list", "evacuation") })],
  [/weeks of pet food/i, () => ({ buy: ["pet-kit"], link: HOWTO.pets })],
  // "shopping" is the dashboard's shopping list (ticks + Buy); the plan page opens it from the link.
  [/Phase [123]\b.*(gear|upgrades)/, () => ({ see: s("Open your shopping list", "shopping") })],
  [/^When the budget allows|^Review your shopping list/, () => ({ see: s("Open your shopping list", "shopping") })],
  [/pantry|food list|lb of staples/i, () => ({ buy: ["storage-kit", "food-freeze-dried"], see: s("Your food list", "food") })],
  [/electrician'?s quote|power inlet/i, () => ({ buy: ["inlet-interlock"], link: HOWTO.powerOutages })],
  [/Service your generator|Test-start the generator|Generator: practice/i, () => ({ buy: ["gas-cans", "gen-cord"], link: HOWTO.co })],
  [/Rotate the first stored water/i, () => ({ buy: WATER, link: HOWTO.waterSafety })],
  [/Drive the route/i, () => ({ buy: VEHICLE, link: READY_EVACUATION })],
  [/maintenance calendar/i, () => ({ see: s("Maintenance calendar", "maintenance") })],
  [/lights-out weekend/i, () => ({ buy: ["lights", "batteries"], link: HOWTO.powerOutages })],
  [/neighbor or nearby friend|Check on elderly|older neighbors/i, () => ({ buy: ["frs-radios", "gmrs"], link: HOWTO.olderAdults })],
  [/special-needs|access & functional needs/i, () => ({ buy: ["mobility-kit"], link: HOWTO.olderAdults })],
  [/pharmacist|prescriptions|medication list|Medications \(/i, () => ({ buy: ["docs-pouch"], link: HOWTO.olderAdults })],
  [/diapers/i, () => ({ link: HOWTO.kids })],
  [/shutoff|shut off/i, () => ({ buy: ["quake-kit"], link: HOWTO.plan })],
  [/small bills|Cash in small bills|Get cash/i, () => ({ buy: ["docs-pouch"], link: HOWTO.kit })],
  [/EVs charged|half full|Fuel or charge vehicles/i, () => ({ buy: ["vehicle-kit", "vehicle-kit-basic"], link: READY_EVACUATION })],
  [/Never store spare gasoline/i, () => ({ buy: ["gas-cans"], link: HOWTO.co })],
  // Day 0
  [/Charge every phone/i, () => ({ buy: ["power-bank", "power-station-small", "power-station"], link: HOWTO.powerOutages })],
  [/CO and smoke alarms/i, () => ({ buy: ["co-alarm", "batteries"], link: HOWTO.co })],
  [/bathtub water bladder/i, () => ({ buy: ["tub-bladder", ...WATER], link: HOWTO.waterSafety })],
  [/Fill spare containers|Water \(\d/i, () => ({ buy: [...WATER, ...FILTERS], link: HOWTO.waterSafety })],
  [/fridge to its coldest|freezer/i, () => ({ buy: ["thermometers", "coolers"], link: HOWTO.foodSafety })],
  [/warm room/i, () => ({ buy: ["buddy-heater", "sleep-system"], link: HOWTO.winter })],
  [/Bring pets inside|Pet food|Pets?:|pet's|each pet|accept pets|Microchip|Vaccination records|Leash|special diet/i, () => ({ buy: ["pet-kit"], link: HOWTO.pets })],
  // Go-bag & vehicle
  [/snacks/i, () => ({ buy: ["food-freeze-dried", ...GO_BAG], link: HOWTO.kit })],
  [/Headlamp|Flashlight|shoes and a flashlight/i, () => ({ buy: ["lights", "quake-bedside", "batteries"], link: HOWTO.kit })],
  [/Copies of ID|documents/i, () => ({ buy: ["docs-pouch", "flood-kit"], link: HOWTO.kit })],
  [/Child ID card|ID card in each child/i, () => ({ buy: ["morale-kit"], link: HOWTO.kids })],
  [/Change of clothes|Whistle/i, () => ({ buy: GO_BAG, link: HOWTO.kit })],
  [/Jump starter|road map|Blankets|Phone chargers/i, () => ({ buy: VEHICLE, link: READY_EVACUATION })],
  // First aid
  [/Red Cross|CPR/i, () => ({ buy: ["first-aid"], link: HOWTO.firstAidClass })],
  [/First aid kit|Over-the-counter|OTC medicines/i, () => ({ buy: ["first-aid"], link: HOWTO.kit })],
  [/glasses\/contacts|hearing aid/i, () => ({ buy: ["batteries"], link: HOWTO.olderAdults })],
  [/need refrigeration/i, () => ({ buy: ["coolers", "thermometers"], link: HOWTO.olderAdults })],
  // Hazards
  [/shutoff wrench|Strap the water heater/i, () => ({ buy: ["quake-kit"], link: HOWTO.hazards })],
  [/water heater holds/i, () => ({ link: HOWTO.hazards })],
  [/cooling centers|heat wave|extreme heat/i, () => ({ buy: ["fans-cooling", ...WATER], link: HOWTO.heat })],
  [/flood zone|Flood damage|flood policies/i, () => ({ buy: ["flood-kit"], link: FEMA_FLOOD_MAP })],
  [/waterproof bins/i, () => ({ buy: ["flood-kit", "docs-pouch"], link: HOWTO.floods })],
  [/evacuation zone|evacuation alerts/i, (p) => ({ buy: ["radio"], link: evacZoneLink(p) ?? alertLink(p) })],
  [/Photograph your home/i, () => ({ buy: ["docs-pouch"], link: HOWTO.plan })],
  [/bike helmets|shelter spot/i, () => ({ buy: ["radio", "lights"], link: HOWTO.severeWeather })],
  [/Clear dead plants/i, () => ({ link: HOWTO.wildfires })],
  [/N9\d masks/i, () => ({ buy: ["smoke-masks"], link: HOWTO.wildfires })],
  // Kids
  [/Comfort kit/i, () => ({ buy: ["morale-kit"], link: HOWTO.kids })],
  [/Toddlers:/i, () => ({ buy: ["sleep-system", "morale-kit"], link: HOWTO.kids })],
  [/child|kids|Kids:|routines|news exposure|'lights-out dinner'/i, () => ({ buy: ["morale-kit"], link: HOWTO.kids })],
  // Skills
  [/Camping:/i, () => ({ buy: ["tent", "camp-stove", ...FILTERS], link: HOWTO.kit })],
  [/Medical device:/i, () => ({ buy: ["med-battery"], link: HOWTO.olderAdults })],
  [/Tools: do the DIY/i, () => ({ buy: ["pipe-insulation", "quake-kit", "window-protection"], link: HOWTO.kit })],
  [/Water: filter and disinfect/i, () => ({ buy: [...FILTERS, "bleach"], link: HOWTO.waterSafety })],
  [/Well: learn to switch/i, () => ({ buy: ["well-switch"], link: HOWTO.powerOutages })],
  [/Wood stove/i, () => ({ buy: ["firewood", "co-alarm"], link: HOWTO.co })],
  [/First aid:/i, () => ({ buy: ["first-aid"], link: HOWTO.firstAidClass })],
];

/** Help for one step, or null when no rule matches (tests require every step to match). */
export function stepHelp(text: string, p: ZipProfile): Help | null {
  for (const [re, f] of STEP_RULES) if (re.test(text)) return f(p);
  return null;
}

/** "What you need" for each section: Buy options (shown only when in this plan) and official how-to links. */
export function sectionHelp(id: string, p: ZipProfile): { buy: string[]; links: OfficialLink[]; note?: string } | null {
  const hazardLinks = [
    ...(atLeast(p.winter, "moderate") ? [HOWTO.winter] : []),
    ...(atLeast(p.heat, "moderate") ? [HOWTO.heat] : []),
  ];
  switch (id) {
    case "priorities": return { buy: [], links: [HOWTO.plan, HOWTO.lowCost] };
    case "day0": return { buy: ["tub-bladder", "power-bank", "radio", "lights", "batteries"], links: [HOWTO.powerOutages, alertLink(p)] };
    case "hazards": return { buy: ["radio"], links: [HOWTO.hazards, ...(evacZoneLink(p) ? [evacZoneLink(p)!] : []), ...(atLeast(p.flood, "moderate") ? [FEMA_FLOOD_MAP] : [])] };
    case "water": return { buy: [...WATER, "tub-bladder", "bleach", ...FILTERS], links: [HOWTO.waterSafety] };
    case "food": return { buy: ["storage-kit", "food-freeze-dried", "coolers", "thermometers"], links: [HOWTO.foodSafety, HOWTO.outageHealth], note: "Rice, beans, oats, pasta, oil and canned goods are cheapest at a grocery store or warehouse club." };
    case "cooking": return { buy: ["camp-stove", "propane-1lb", "propane-20"], links: [HOWTO.co] };
    case "sanitation": return { buy: ["toilet-kit", "bleach"], links: [HOWTO.kit], note: "Toilet paper, trash bags, soap and wipes: any grocery or warehouse store." };
    case "firstaid": return { buy: ["first-aid"], links: [HOWTO.firstAidClass, HOWTO.olderAdults] };
    case "heat": return { buy: ["buddy-heater", "propane-1lb", "sleep-system", "pipe-insulation", "firewood", "fans-cooling"], links: [...hazardLinks, HOWTO.co] };
    case "power": return { buy: [...GENS, "generator-standby", "gen-cord", "gas-cans", "propane-20", "inlet-interlock", "solar-panel", "well-switch", "med-battery"], links: [HOWTO.powerOutages, HOWTO.co] };
    case "comms": return { buy: ["radio", "frs-radios", "gmrs", "sat-messenger", "power-bank", "docs-pouch"], links: [alertLink(p), HOWTO.plan] };
    case "security": return { buy: ["lights", "frs-radios"], links: [HOWTO.plan] };
    case "kids": return { buy: ["morale-kit"], links: [HOWTO.kids] };
    case "pets": return { buy: ["pet-kit"], links: [HOWTO.pets] };
    case "evacuation": return { buy: [...GO_BAG, ...VEHICLE, "docs-pouch", "tent", "tarp-shelter", "canvas-tent"], links: [evacZoneLink(p) ?? READY_EVACUATION, READY_EVACUATION].filter((l, i, a) => a.findIndex((x) => x.url === l.url) === i) };
    case "budget": return { buy: [], links: [HOWTO.lowCost] };
    case "maintenance": return { buy: ["batteries"], links: [HOWTO.kit] };
    default: return null; // snapshot (your answers) and gear (already every item with Buy)
  }
}

/** Apply step help to every checklist and append the "What you need" strip to each section. */
export function addHelp<T extends { id: string; blocks: Block[] }>(sections: T[], p: ZipProfile): void {
  for (const sec of sections) {
    for (const b of sec.blocks) {
      if (b.type !== "checklist") continue;
      b.items = b.items.map((it) => {
        // A Buy option alone isn't enough (the item may be one the household already owns), so every step
        // also gets a link or pointer; buy lists merge, keeping the step's own choices first.
        if (it.link || it.see) return it;
        const h = stepHelp(it.text, p);
        if (!h) return it;
        const buy = [...new Set([...(it.buy ?? []), ...(h.buy ?? [])])];
        return { ...it, ...(buy.length ? { buy } : {}), ...(h.link ? { link: h.link } : {}), ...(h.see ? { see: h.see } : {}) };
      });
    }
    const sh = sectionHelp(sec.id, p);
    if (sh && (sh.buy.length || sh.links.length)) sec.blocks.push({ type: "help", buy: sh.buy, links: sh.links, ...(sh.note ? { note: sh.note } : {}) });
  }
}
