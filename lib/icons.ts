/**
 * The one icon set (visual calm pass, item 6): simple line icons on a 24px grid, 1.75 stroke, round caps.
 * Shared by the web (components/Icon.tsx) and the plan PDF (lib/pdf/PlanPdf.tsx), so both use the same icons.
 */
export const ICON_PATHS = {
  checklist: "M9 11l3 3 8-8M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9",
  water: "M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z",
  food: "M4 11h16a8 8 0 0 1-16 0zM8 7c0-1.5 1-2 1-3.5M12 7c0-1.5 1-2 1-3.5M16 7c0-1.5 1-2 1-3.5",
  cooking: "M5 10h14v7a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3zM3 10h18M9 6.5c0-1 .8-1.5.8-2.5M14 6.5c0-1 .8-1.5.8-2.5",
  power: "M13 2L4 14h7l-1 8 9-12h-7l1-8z",
  heat: "M12 21a5 5 0 0 1-3-9V5a3 3 0 0 1 6 0v7a5 5 0 0 1-3 9zM12 17v-6",
  firstaid: "M4 7h16v13H4zM9 7V4h6v3M12 10.5v6M9 13.5h6",
  people: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8",
  evacuation: "M3 12h13M12 7l5 5-5 5M20 4v16",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2",
  map: "M12 21s-7-6.5-7-12a7 7 0 0 1 14 0c0 5.5-7 12-7 12zM12 11.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
  sanitation: "M6 4h12v4H6zM7 8v4a5 5 0 0 0 10 0V8M10 21h4M12 17v4",
  gear: "M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M4 7h16v13H4zM4 12h16",
  budget: "M3 7h15a3 3 0 0 1 3 3v8H3zM3 7l12-4v4M16.5 13.5h.01",
  comms: "M5 9a10 10 0 0 1 14 0M8 12.5a5.5 5.5 0 0 1 8 0M12 17h.01",
  security: "M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z",
  kids: "M12 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM8 22v-7l-3-3 3-2h8l3 2-3 3v7",
  pets: "M12 13c-3 0-5 3-5 5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2c0-2-2-5-5-5zM6 9a2 2 0 1 0 0-.1M18 9a2 2 0 1 0 0-.1M9.5 5a2 2 0 1 0 0-.1M14.5 5a2 2 0 1 0 0-.1",
  maintenance: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4M8 14h3",
  home: "M3 11l9-7 9 7M5 9.5V20h14V9.5M10 20v-5h4v5",
} as const;
export type IconName = keyof typeof ICON_PATHS;

/** Section and chapter ids → icon. Every section has one, so the set stays consistent. */
export const SECTION_ICON: Record<string, IconName> = {
  priorities: "checklist",
  day0: "clock",
  hazards: "map",
  water: "water",
  food: "food",
  cooking: "cooking",
  sanitation: "sanitation",
  firstaid: "firstaid",
  gear: "gear",
  budget: "budget",
  heat: "heat",
  power: "power",
  comms: "comms",
  security: "security",
  kids: "kids",
  pets: "pets",
  evacuation: "evacuation",
  maintenance: "maintenance",
  snapshot: "home",
};
export const CHAPTER_ICON: Record<string, IconName> = { "do-now": "checklist", supplies: "water", "power-heat": "power", "people-plans": "people" };
