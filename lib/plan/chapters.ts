import type { Section } from "./document";

/**
 * On the web, plan sections are grouped into 4 chapters (the PDF and email keep the numbered order).
 * Any section not listed here goes into the last chapter, so nothing can disappear.
 */
export interface Chapter {
  id: string;
  title: string;
  /** Shorter tab label for phones. */
  short: string;
  sections: string[];
}

export const CHAPTERS: Chapter[] = [
  { id: "do-now", title: "Do now", short: "Do now", sections: ["priorities", "day0", "hazards"] },
  { id: "supplies", title: "Supplies", short: "Supplies", sections: ["water", "food", "cooking", "sanitation", "firstaid", "gear", "budget"] },
  { id: "power-heat", title: "Power & heat", short: "Power", sections: ["heat", "power"] },
  { id: "people-plans", title: "People & plans", short: "People", sections: ["comms", "security", "kids", "pets", "evacuation", "maintenance", "snapshot"] },
];

export function groupIntoChapters<T extends Pick<Section, "id">>(sections: T[]): (Chapter & { items: T[] })[] {
  const byId = new Map(sections.map((s) => [s.id, s]));
  const placed = new Set<string>();
  const out = CHAPTERS.map((ch) => {
    const items = ch.sections.map((id) => byId.get(id)).filter((s): s is T => !!s);
    items.forEach((s) => placed.add(s.id));
    return { ...ch, items };
  });
  const leftovers = sections.filter((s) => !placed.has(s.id));
  out[out.length - 1].items.push(...leftovers);
  return out.filter((ch) => ch.items.length > 0);
}
