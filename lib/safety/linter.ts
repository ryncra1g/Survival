import type { PlanDocument } from "@/lib/plan/document";

/**
 * Safety linter. Runs on every piece of plan text (rules output AND LLM output).
 * Works clause by clause: an unsafe phrase is allowed only when the SAME clause contains
 * a negation ("never", "don't", "not", ...) or an explicit outdoor qualifier.
 */
export interface Violation {
  rule: "indoor_combustion" | "backfeed" | "dosing" | "weapons" | "unsafe_diy";
  text: string;
  clause: string;
}

const NEGATION = /\b(never|not|no|don'?t|do not|doesn'?t|avoid|without|unsafe|dangerous|banned|ban|prohibit\w*|outdoors?|outside|open air|away from|20\+? (?:ft|feet))\b/i;

const COMBUSTION = /\b(generators?|grills?|charcoal|camp ?stoves?|propane stoves?|kerosene|gas(?:oline)? (?:engine|heater)|hibachi|smoker|fire ?pit|bbq|barbecue|propane (?:grill|burner|appliance)s?|outdoor (?:heater|stove)s?|patio heaters?)\b/i;
const INDOOR_PLACE = /\b(indoors?|inside|in(?:to)? (?:the|your|a|an) (?:home|house|garage|basement|crawl ?space|living room|bedroom|kitchen|apartment|tent|car|vehicle|shed|porch|sunroom|room)|garage|basement|crawl ?space|living room|bedroom|kitchen|balcony|enclosed porch|breezeway|tent|cabin of)\b/i;

const BACKFEED = /\b(dryer (?:outlet|plug|receptacle)|suicide cord|double[- ]?male|male[- ]to[- ]male|back[- ]?feed\w*|plug (?:the|a|your) generator into (?:a|an|the|your) (?:wall|outlet|receptacle))\b/i;

const DOSING = /\b\d+(?:\.\d+)?\s*(?:mg|mcg|µg|milligrams?|micrograms?|ml|mL|cc|tablets?|pills?|capsules?|units? of insulin|iu)\b|\b(?:take|give|administer)\s+(?:\d+|one|two|three|half)\b(?!\s*(?:minutes?|hours?|days?|gallons?|liters?))|\bdos(?:e|age|ing) (?:of|is|for)\b/i;

/**
 * D3b: improvised practices that kill people in outages, blocked anywhere in a plan unless the clause says not to:
 * candle / terracotta-pot heaters; a gas oven or stovetop for heat; running a car in an attached garage;
 * plugging a generator into a wall outlet (grills and camp stoves indoors are the indoor_combustion rule).
 */
const UNSAFE_DIY = /\b(candle|terra ?-?cotta|flower ?-?pot|clay ?-?pot)(?:[- ]pot)? heaters?\b|\bterra ?-?cotta pots?\b[^.]*\bcandles?\b|\bcandles?\b[^.]*\bterra ?-?cotta\b|\b(?:gas )?(?:oven|stove ?top|range|burners?)\b[^.]*\b(?:to|for) (?:heat|warm)\b|\b(?:heat|warm)(?:ing)? (?:the |your |a )?(?:home|house|room|apartment|kitchen)\b[^.]*\b(?:oven|stove ?top)\b|\b(?:run|running|idle|idling|warm(?:ing)? up|start(?:ing)?)\b[^.]*\b(?:car|vehicle|truck|engine)\b[^.]*\b(?:attached )?garage\b|\bplug(?:ging|ged)? (?:a |the |your )?generator (?:in)?to (?:a |an |the |your )?(?:wall|house|home)?\s*(?:outlet|socket|receptacle)s?\b/i;
const DIY_NEGATION = /\b(never|not|no|don'?t|do not|avoid|instead of)\b/i;

const WEAPONS = /\b(guns?|firearms?|rifles?|shotguns?|pistols?|handguns?|ammo|ammunition|weapons?|tactical|booby[- ]?traps?|body armor|crossbows?|pepper spray|bear spray|knife fighting|shoot(?:ing)? (?:intruders?|looters?))\b/i;

/** Split into clauses on sentence/clause boundaries and contrastive connectives. */
export function clauses(text: string): string[] {
  return text
    .split(/(?<=[.!?;:])\s+|\n+|\s+(?:—|–|-)\s+|\b(?:but|instead|then|otherwise|however|so you can|so that)\b/i)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function lintText(text: string): Violation[] {
  const out: Violation[] = [];
  for (const clause of clauses(text)) {
    if (COMBUSTION.test(clause) && INDOOR_PLACE.test(clause) && !NEGATION.test(clause)) out.push({ rule: "indoor_combustion", text, clause });
    if (BACKFEED.test(clause) && !/\b(never|don'?t|do not|not)\b/i.test(clause)) out.push({ rule: "backfeed", text, clause });
    if (DOSING.test(clause)) out.push({ rule: "dosing", text, clause });
    if (WEAPONS.test(clause)) out.push({ rule: "weapons", text, clause });
    if (UNSAFE_DIY.test(clause) && !DIY_NEGATION.test(clause)) out.push({ rule: "unsafe_diy", text, clause });
  }
  return out;
}

/** Every string in a plan document, for linting. */
export function documentStrings(doc: PlanDocument): string[] {
  const s: string[] = [doc.title, doc.subtitle];
  for (const sec of doc.sections) {
    s.push(sec.title, sec.summary);
    for (const b of sec.blocks) {
      switch (b.type) {
        case "paragraph":
        case "subheading":
          s.push(b.text);
          break;
        case "bullets":
          s.push(...b.items);
          break;
        case "checklist":
          s.push(...b.items.flatMap((i) => [i.text, i.why ?? "", i.link?.label ?? ""]).filter(Boolean));
          break;
        case "table":
          if (b.caption) s.push(b.caption);
          s.push(...b.columns, ...b.rows.flat());
          break;
        case "ifthen":
          for (const r of b.rows) s.push(`If ${r.if}, then ${r.then}`);
          break;
        case "callout":
          s.push(b.title, b.text);
          break;
        case "products":
          if (b.caption) s.push(b.caption);
          for (const i of b.items) s.push(i.name, i.spec, ...i.models, ...(i.levels ?? []).map((l) => l.name));
          break;
        case "help":
          s.push(...b.links.map((l) => l.label), ...(b.note ? [b.note] : []));
          break;
        case "levelchoice":
          s.push(b.caption, ...b.levels.map((l) => l.name));
          break;
        case "tips":
          // Linted whether or not DIY_TIPS_ENABLED is on.
          for (const t of b.tips) s.push(t.situation, ...t.steps, t.source.label);
          s.push(...b.dontDo);
          break;
      }
    }
  }
  return s;
}

export function lintDocument(doc: PlanDocument): Violation[] {
  return documentStrings(doc).flatMap(lintText);
}
