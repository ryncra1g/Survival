import { BRAND } from "@/lib/brand";
/**
 * Safety text that the plan builder inserts verbatim. It's written by code, never by the LLM,
 * and the guardrail tests assert it is present wherever it applies.
 */
export const CO_RULE =
  "Never run a generator, grill, camp stove, charcoal or any fuel-burning device not rated for indoor use inside your home, garage, basement, crawlspace, tent or on a balcony — not even with doors or windows open. " +
  "Keep generators outdoors at least 20 feet from doors, windows and vents, with the exhaust pointed away from buildings. " +
  "Put battery-powered or battery-backup CO alarms on every level and outside sleeping areas. If a CO alarm sounds or anyone feels dizzy, headachy or nauseous, get everyone outside to fresh air right away and call 911.";

export const TRANSFER_RULE =
  "Never back-feed your house through a dryer outlet or any double-male (\"suicide\") cord — it can electrocute you, your neighbors and utility line workers, and start fires. " +
  "Power house circuits only through a power inlet with an interlock or a transfer switch installed by a licensed electrician. Until then, plug appliances directly into the generator with outdoor-rated extension cords.";

export const MED_RULE =
  `${BRAND.name} never gives medication doses. For any medicine — for people or pets — follow the label or your doctor, pharmacist or vet.`;

export const APARTMENT_GENERATOR_RULE =
  "Portable generators are not safe to run in or next to an apartment: balconies, patios, breezeways, parking garages and spots near windows all let exhaust into homes, including your neighbors'. " +
  "Use battery power stations indoors instead, and only run a generator if you have open ground 20+ feet from every building opening and your building allows it.";

export const INDOOR_HEATER_RULE =
  "Use only a propane heater labeled for indoor use with an oxygen depletion sensor (ODS) and tip-over shutoff, follow its manual's ventilation requirement, keep 3 feet of clearance, never leave it running while everyone sleeps, and keep a working CO alarm in the same room.";

export const BLEACH_RULE =
  "EPA emergency disinfection: if water is cloudy, filter it first. Add 8 drops of regular unscented 6% bleach (or 6 drops of 8.25%) per gallon, stir, and wait 30 minutes. It should smell slightly of chlorine — if not, repeat once and wait another 15 minutes. Boiling for 1 full minute (3 minutes above 6,500 ft) also works.";
