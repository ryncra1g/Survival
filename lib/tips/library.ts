/**
 * D3b: "No time to buy? Use what you have." One library of short, sourced tips.
 *
 * Rules (owner brief): official sources only (Ready.gov, CDC, EPA, Red Cross); no amounts from memory
 * (link to the official instructions instead); every box carries the "Don't do this" list; shown only
 * when DIY_TIPS_ENABLED is on, after the owner approves docs/FACTCHECK.md. The library is always linted.
 */
export type TipArea = "water" | "heat" | "sanitation" | "light_power" | "day0";

export interface Tip {
  id: string;
  area: TipArea;
  situation: string;
  materials: string[];
  steps: string[];
  source: { label: string; url: string };
  /** Extra "don't" lines for this tip (the common list is added to every box). */
  dontDo: string[];
  lastReviewed: string;
}

/** The owner's list, shown in every box. Each line is phrased as a "don't", so the linter allows it. */
export const DONT_DO = [
  "Don't use candle or terracotta-pot heaters.",
  "Never use a grill or camp stove indoors or in a garage.",
  "Don't use a gas oven or stovetop to heat your home.",
  "Never run a car in an attached garage, even with the door open.",
  "Never plug a generator into a wall outlet.",
];

export const ALLOWED_SOURCE_HOSTS = ["www.ready.gov", "www.cdc.gov", "www.epa.gov", "www.redcross.org", "www.fema.gov", "www.foodsafety.gov"];

const R = "2026-11-22";

export const TIPS: Tip[] = [
  {
    id: "water-fill-now",
    area: "water",
    situation: "A storm is coming and you have no stored water.",
    materials: ["clean pots and pitchers", "bathtub"],
    steps: ["Fill clean pots, pitchers and bottles with tap water for drinking while it's still safe.", "Fill the bathtub for flushing and washing, not for drinking."],
    source: { label: "Ready.gov: Water", url: "https://www.ready.gov/water" },
    dontDo: ["Don't store drinking water in containers that held chemicals."],
    lastReviewed: R,
  },
  {
    id: "water-boil",
    area: "water",
    situation: "You have no filter and no treatment tablets.",
    materials: ["pot", "lid", "heat source used outdoors or a working stove"],
    steps: ["Let cloudy water settle, or strain it through a clean cloth.", "Boil it as CDC directs, let it cool, and store it in clean covered containers."],
    source: { label: "CDC: Make water safe in an emergency", url: "https://www.cdc.gov/water-emergency/about/index.html" },
    dontDo: ["Don't drink water that may have fuel or chemicals in it; boiling won't fix that."],
    lastReviewed: R,
  },
  {
    id: "heat-one-room",
    area: "heat",
    situation: "The power is out in cold weather and you have no backup heat.",
    materials: ["blankets", "towels", "warm clothes", "sleeping bags"],
    steps: ["Pick one room to keep warm and close the doors to the rest.", "Cover windows and drafts with blankets or towels.", "Wear layers, and sleep under extra blankets together in that room."],
    source: { label: "Ready.gov: Winter weather", url: "https://www.ready.gov/winter-weather" },
    dontDo: [],
    lastReviewed: R,
  },
  {
    id: "sanitation-bag-toilet",
    area: "sanitation",
    situation: "The toilet won't flush and you have no sanitation kit.",
    materials: ["heavy trash bags", "a bucket or the toilet bowl", "ties", "kitty litter or sawdust if you have it"],
    steps: ["Line the bucket or bowl with a heavy trash bag.", "Cover waste with litter or sawdust if you have it, tie the bag closed, and keep it outside, away from water."],
    source: { label: "Ready.gov: Build a kit (garbage bags and ties for sanitation)", url: "https://www.ready.gov/kit" },
    dontDo: ["Don't dump waste where it can reach drinking water."],
    lastReviewed: R,
  },
  {
    id: "light-flashlights",
    area: "light_power",
    situation: "The power is out and you have no lanterns or power bank.",
    materials: ["phones", "flashlights", "spare batteries"],
    steps: ["Use flashlights for light, and keep phones for calls and alerts.", "Dim screens and turn on battery saver."],
    source: { label: "Ready.gov: Power outages", url: "https://www.ready.gov/power-outages" },
    dontDo: ["Use flashlights, not candles: candles can start fires."],
    lastReviewed: R,
  },
  {
    id: "day0-now",
    area: "day0",
    situation: "It's happening and you haven't bought anything yet.",
    materials: ["tap water", "phones", "freezer"],
    steps: ["Fill containers and the tub with water, and charge every phone.", "Keep the fridge and freezer closed."],
    source: { label: "Ready.gov: Power outages", url: "https://www.ready.gov/power-outages" },
    dontDo: [],
    lastReviewed: R,
  },
];

export const tipsFor = (area: TipArea) => TIPS.filter((t) => t.area === area);
