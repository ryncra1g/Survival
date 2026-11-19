import { atLeast, type ZipProfile } from "./profile";

/**
 * Official resources by place. Government sites only (never affiliate links). These URLs were taken from
 * official-site search results on 2026-11-19; /release-check asks the owner to click through them before a release.
 */
export interface OfficialLink {
  label: string;
  url: string;
}

/** Federal fallbacks. */
export const READY_ALERTS: OfficialLink = { label: "How to get emergency alerts (Ready.gov)", url: "https://www.ready.gov/alerts" };
export const READY_EVACUATION: OfficialLink = { label: "Plan your evacuation (Ready.gov)", url: "https://www.ready.gov/evacuation" };
export const FEMA_FLOOD_MAP: OfficialLink = { label: "Look up your flood zone (FEMA Flood Map Service Center)", url: "https://msc.fema.gov/portal/search" };

/** Statewide alert sign-ups. */
const STATE_ALERTS: Record<string, OfficialLink> = {
  NY: { label: "Sign up for NY-Alert (New York State)", url: "https://alert.ny.gov/sign-up-ny-alert" },
};

/** Address-level hurricane evacuation zone lookups, by state, then by region label where a state has none. */
const STATE_EVAC_ZONES: Record<string, OfficialLink> = {
  FL: { label: "Know Your Zone (Florida Division of Emergency Management)", url: "https://www.floridadisaster.org/knowyourzone/" },
  NC: { label: "Know Your Zone (North Carolina Emergency Management)", url: "https://knowyourzone.nc.gov/" },
  VA: { label: "Hurricane evacuation zone lookup (Virginia Dept. of Emergency Management)", url: "https://vaemergency.gov/hurricane-evacuation-zone-lookup/" },
  MA: { label: "Hurricane evacuation zones (Massachusetts)", url: "https://www.mass.gov/knowyourzone" },
};
const REGION_EVAC_ZONES: Record<string, OfficialLink> = {
  "New York City": { label: "Hurricane evacuation zones (NYC Emergency Management)", url: "https://www.nyc.gov/site/em/ready/hurricane-evacuation.page" },
  "Long Island": {
    label: "Storm surge zone map (Suffolk County OEM; Nassau residents: check with Nassau County OEM)",
    url: "https://suffolkcountyny.gov/Departments/FRES/Office-of-Emergency-Management/Storm-Surge-Zone-Interactive-Map",
  },
};

export function alertLink(p: ZipProfile): OfficialLink {
  return STATE_ALERTS[p.state] ?? READY_ALERTS;
}

/** The evacuation-zone lookup for this place, or null when hurricanes aren't a moderate+ hazard here. */
export function evacZoneLink(p: ZipProfile): OfficialLink | null {
  if (!atLeast(p.hurricane, "moderate")) return null;
  return REGION_EVAC_ZONES[p.region] ?? STATE_EVAC_ZONES[p.state] ?? READY_EVACUATION;
}

/** Every link this module can return, for tests and the release check. */
export const ALL_OFFICIAL_LINKS: OfficialLink[] = [READY_ALERTS, READY_EVACUATION, FEMA_FLOOD_MAP, ...Object.values(STATE_ALERTS), ...Object.values(STATE_EVAC_ZONES), ...Object.values(REGION_EVAC_ZONES)];

/**
 * National how-to pages (Ready.gov, Red Cross, CDC, EPA, FoodSafety.gov). Confirmed via official-site search
 * results on 2026-11-19, like the links above.
 */
export const HOWTO = {
  plan: { label: "Make a plan (Ready.gov)", url: "https://www.ready.gov/plan" },
  kit: { label: "Build a kit (Ready.gov)", url: "https://www.ready.gov/kit" },
  powerOutages: { label: "Power outages (Ready.gov)", url: "https://www.ready.gov/power-outages" },
  pets: { label: "Prepare your pets (Ready.gov)", url: "https://www.ready.gov/pets" },
  kids: { label: "Planning with kids (Ready.gov)", url: "https://www.ready.gov/kids/family-emergency-planning" },
  olderAdults: { label: "Older adults and people with disabilities (Ready.gov)", url: "https://www.ready.gov/older-adults" },
  heat: { label: "Extreme heat (Ready.gov)", url: "https://www.ready.gov/heat" },
  winter: { label: "Winter weather (Ready.gov)", url: "https://www.ready.gov/winter-weather" },
  floods: { label: "Floods (Ready.gov)", url: "https://www.ready.gov/floods" },
  wildfires: { label: "Wildfires (Ready.gov)", url: "https://www.ready.gov/wildfires" },
  severeWeather: { label: "Severe weather and tornadoes (Ready.gov)", url: "https://www.ready.gov/severe-weather" },
  hazards: { label: "Hazard-by-hazard guides (Ready.gov)", url: "https://www.ready.gov/be-informed" },
  lowCost: { label: "Low- and no-cost preparedness (Ready.gov)", url: "https://www.ready.gov/low-and-no-cost" },
  firstAidClass: { label: "Find a First Aid/CPR class (American Red Cross)", url: "https://www.redcross.org/take-a-class" },
  co: { label: "Carbon monoxide safety (CDC)", url: "https://www.cdc.gov/carbon-monoxide/prevention/" },
  waterSafety: { label: "Make water safe to drink (EPA)", url: "https://www.epa.gov/ground-water-and-drinking-water/emergency-disinfection-drinking-water" },
  foodSafety: { label: "Food safety in a power outage (FoodSafety.gov)", url: "https://www.foodsafety.gov/food-safety-charts/food-safety-during-power-outage" },
  outageHealth: { label: "Power outage food and water safety (CDC)", url: "https://www.cdc.gov/natural-disasters/safety/power-outage-safety.html" },
} satisfies Record<string, OfficialLink>;

ALL_OFFICIAL_LINKS.push(...Object.values(HOWTO));
