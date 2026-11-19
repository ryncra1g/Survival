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
