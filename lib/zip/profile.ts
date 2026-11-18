import { ZIP_ROWS, type Rating } from "./data";

export type Level = "none" | "low" | "moderate" | "high";
const LEVELS: Level[] = ["none", "low", "moderate", "high"];

export interface ZipProfile {
  zip: string;
  state: string;
  region: string;
  climateZone: number;
  winter: Level;
  heat: Level;
  hurricane: Level;
  flood: Level;
  wildfire: Level;
  earthquake: Level;
  tornado: Level;
  /** True when the ZIP prefix wasn't in the table and we used national defaults. */
  approximate: boolean;
}

const lvl = (r: Rating): Level => LEVELS[r];

export function lookupZip(zip: string): ZipProfile {
  const prefix = Number.parseInt(zip.slice(0, 3), 10);
  let match: (typeof ZIP_ROWS)[number] | undefined;
  if (Number.isFinite(prefix)) {
    for (const row of ZIP_ROWS) {
      if (prefix >= row[0] && prefix <= row[1]) match = row; // last match wins
    }
  }
  if (!match) {
    return {
      zip,
      state: "US",
      region: "your area",
      climateZone: 4,
      winter: "moderate",
      heat: "moderate",
      hurricane: "low",
      flood: "moderate",
      wildfire: "low",
      earthquake: "low",
      tornado: "low",
      approximate: true,
    };
  }
  const [, , state, cz, winter, heat, hurricane, flood, wildfire, earthquake, tornado, label] = match;
  return {
    zip,
    state,
    region: label,
    climateZone: cz,
    winter: lvl(winter),
    heat: lvl(heat),
    hurricane: lvl(hurricane),
    flood: lvl(flood),
    wildfire: lvl(wildfire),
    earthquake: lvl(earthquake),
    tornado: lvl(tornado),
    approximate: false,
  };
}

export const atLeast = (l: Level, min: Level) => LEVELS.indexOf(l) >= LEVELS.indexOf(min);
