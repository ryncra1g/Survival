import type { PlanDocument } from "@/lib/plan/document";

/**
 * Safety linter. Runs on every piece of plan text (rules output AND LLM output).
 * Works clause by clause. An unsafe phrase is allowed only when a negation directly governs it
 * ("never run a generator indoors", "don't use a grill", "generators are never safe indoors"),
 * when the clause calls it dangerous, or (for fuel-burning equipment) when it says outdoors / 20 ft away.
 * A negation elsewhere in the clause doesn't count: "don't hesitate to run a grill indoors",
 * "heat the kitchen with the oven, not the stove" and "it's not hard" are all blocked.
 */
export interface Violation {
  rule: "indoor_combustion" | "backfeed" | "dosing" | "weapons" | "unsafe_diy";
  text: string;
  clause: string;
}

/** Qualifiers that make fuel-burning equipment acceptable in the same clause. */
const OUTDOOR = /\b(outdoors?|outside|open air|away from|20\+? (?:ft|feet))\b/i;

const NEG = String.raw`never|don'?t|do not|does not|doesn'?t|should(?:n'?t| not)|must(?:n'?t| not)|can'?t|cannot|won'?t|avoid(?:ing)?|no|not|instead of|rather than`;
const VERB = String.raw`run|running|use|using|bring|bringing|operate|operating|plug|plugging|connect|connecting|start|starting|idle|idling|heat|heating|warm|warming|burn|burning|light|lighting|cook|cooking|put|putting|place|placing|set|leave|leaving|keep|keeping|store|storing|move|moving|make|making|build|building|turn on|back-?feed\w*|wire|wiring|fuel|refuel|let|suggest|recommend|advise`;
const DET = String.raw`a|an|the|your|any|this|that|these|those`;
/** Up to three filler words between the negated verb and the hazard ("never run a portable gas generator"), but never another verb. */
const FILL = String.raw`(?:(?!(?:${VERB})\b)[\w'-]+,?\s+){0,3}`;
/** A negation right before the hazard: negator, then a verb and/or determiner (or nothing), then fillers. "Don't hesitate to…" fails: "hesitate" is neither. */
const GOVERNS_BEFORE = new RegExp(
  String.raw`\b(?:${NEG})\s+(?:ever\s+)?(?:(?:(?:${VERB})\s+(?:(?:it|them|to)\s+)?(?:(?:${VERB})\s+)?(?:(?:${DET})\s+)?|(?:${DET})\s+)${FILL})?$`,
  "i",
);
const INDOOR_WORDS = String.raw`indoors?|inside|in(?:to)? (?:the|your|a|an) (?:home|house|garage|basement|room|kitchen|apartment|tent)|garage|basement`;
/**
 * A negation right after the hazard that is about the hazard's placement or safety: "generators are never safe
 * indoors", "grills don't belong inside", "must not be used indoors", "back-feeding is never safe." The negated
 * verb must reach an indoor place or the end of the clause within three words, so "generators shouldn't be left
 * in the rain, keep yours in the garage" is not governed. Contractions need the apostrophe ("went" isn't one).
 */
const GOVERNS_AFTER = new RegExp(
  String.raw`^\s+(?:(?:must|should|can|do|does|are|is|will|may)\s+)?(?:never|not|cannot|\w+n['’]t)\s+(?:ever\s+)?(?:be\s+)?(?:${VERB}|safe|ok|okay|allowed|permitted|belong|go|used|operated|brought|plugged|connected|left|kept)\b(?:\s+[\w'-]+){0,3}?\s*(?:\b(?:${INDOOR_WORDS})\b|[.!?]?\s*$)`,
  "i",
);
/** The clause calls the practice dangerous: not negated, hedged ("less dangerous", "only dangerous") or conditional ("dangerous unless…"). */
const DANGER_WORD = String.raw`unsafe|dangerous|deadly|lethal|kills?|banned|prohibit\w*|poisons?`;
const DANGER = new RegExp(String.raw`(?<!\b(?:not|never|isn['’]?t|aren['’]?t|less|only|hardly|rarely|barely|somewhat|slightly|that|very|too|so)\s+(?:\w+\s+)?)\b(?:${DANGER_WORD})\b`, "i");
const DANGER_HEDGED = new RegExp(String.raw`\b(?:${DANGER_WORD})\b[^.]*\b(?:unless|without|if|except|than|when|until)\b`, "i");
const isDanger = (clause: string) => DANGER.test(clause) && !DANGER_HEDGED.test(clause);

/** True when a negation directly governs the first match of `re` in the clause. */
function governed(clause: string, re: RegExp): boolean {
  const m = re.exec(clause);
  if (!m) return false;
  return GOVERNS_BEFORE.test(clause.slice(0, m.index)) || GOVERNS_AFTER.test(clause.slice(m.index + m[0].length));
}

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
    const danger = isDanger(clause);
    if (COMBUSTION.test(clause) && INDOOR_PLACE.test(clause) && !OUTDOOR.test(clause) && !danger && !governed(clause, COMBUSTION) && !governed(clause, INDOOR_PLACE))
      out.push({ rule: "indoor_combustion", text, clause });
    if (BACKFEED.test(clause) && !danger && !governed(clause, BACKFEED)) out.push({ rule: "backfeed", text, clause });
    if (DOSING.test(clause)) out.push({ rule: "dosing", text, clause });
    if (WEAPONS.test(clause)) out.push({ rule: "weapons", text, clause });
    if (UNSAFE_DIY.test(clause) && !danger && !governed(clause, UNSAFE_DIY)) out.push({ rule: "unsafe_diy", text, clause });
  }
  return out;
}

/**
 * Strict mode for LLM output: a summary never needs to mention fuel-burning equipment, back-feeding or the
 * improvised practices at all, negated or not, so any mention is rejected and the template is used instead.
 */
const HAZARD_WORDS = /\b(candles?|ovens?|stove ?tops?|stoves?|burners?|(?:propane|kerosene|gas|fuel-burning|buddy) heaters?|fuel-burning|exhaust|idl(?:e|ing)|carbon monoxide|wall (?:outlet|socket)s?)\b/i;
export function mentionsHazard(text: string): boolean {
  return COMBUSTION.test(text) || BACKFEED.test(text) || UNSAFE_DIY.test(text) || HAZARD_WORDS.test(text);
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
          // The card title is the step's headline on the dashboard: linted like the text (code review).
          s.push(...b.items.flatMap((i) => [i.title ?? "", i.text, i.why ?? "", i.link?.label ?? ""]).filter(Boolean));
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
