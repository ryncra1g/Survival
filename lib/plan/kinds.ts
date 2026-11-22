import type { Block } from "./document";

/**
 * D8 / PL-02: every plan line is one of three kinds.
 * - know ("Good to know"): plain text, no checkbox.
 * - do ("To do"): a checkbox; only these count toward progress.
 * - have ("To have"): an item with have/need status and a Buy link if missing.
 */
export type Kind = "know" | "do" | "have";

export const KIND_LABEL: Record<Kind, string> = { know: "Good to know", do: "To do", have: "To have" };

/** The kind a block type has by default. Used to label new plans, and for plans saved before kinds existed. */
export function defaultKind(b: Pick<Block, "type">): Kind {
  switch (b.type) {
    case "checklist":
      return "do";
    case "products":
    case "help":
    case "levelchoice":
      return "have";
    default:
      return "know";
  }
}

export const kindOf = (b: Block): Kind => b.kind ?? defaultKind(b);

/** Label every block (keeps a kind a block already has). Run on every section the builder produces. */
export function labelKinds<T extends { blocks: Block[] }>(sections: T[]): T[] {
  for (const s of sections) for (const b of s.blocks) b.kind ??= defaultKind(b);
  return sections;
}

/** Show a kind label only where the kind changes, so a run of "To do" lists isn't labelled over and over. */
export function kindLabelsAt(blocks: Block[]): (Kind | null)[] {
  let prev: Kind | null = null;
  return blocks.map((b) => {
    const k = kindOf(b);
    if (b.type === "subheading") return null;
    const show = k !== prev ? k : null;
    prev = k;
    return show;
  });
}
