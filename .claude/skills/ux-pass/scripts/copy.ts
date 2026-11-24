import fs from "node:fs";
import { OUT, writeJson } from "./common";

/**
 * /ux-pass step 3 (the measurable parts of the copy review), over <OUT>/texts.json (screens) and
 * <OUT>/personas/*-plan.txt (whole plans). Writes <OUT>/copy.json. The judgment calls stay with the reviewer:
 * this only collects the evidence (grade level, long sentences, term variants, promise / tone / family lines).
 *   npx tsx .claude/skills/ux-pass/scripts/copy.ts
 */
const texts: Record<string, string> = JSON.parse(fs.readFileSync(`${OUT}/texts.json`, "utf8"));
const plans = fs.existsSync(`${OUT}/personas`) ? fs.readdirSync(`${OUT}/personas`).filter((f) => f.endsWith("-plan.txt")) : [];
for (const f of plans) texts[`plan:${f.replace("-plan.txt", "")}`] = fs.readFileSync(`${OUT}/personas/${f}`, "utf8");

const syllables = (w: string) => {
  const s = w.toLowerCase().replace(/[^a-z]/g, "");
  if (s.length <= 3) return 1;
  const m = s.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "").replace(/^y/, "").match(/[aeiouy]{1,2}/g);
  return Math.max(1, m?.length ?? 1);
};
const words = (s: string) => s.match(/[A-Za-z][A-Za-z'’-]*|\d[\d,.]*/g) ?? [];
/** Prose only: lines of 8+ words. Buttons, labels and table cells would make the grade look easier than it is. */
const sentencesOf = (t: string) =>
  t.split(/\n+/).filter((l) => words(l).length >= 8).flatMap((l) => l.split(/(?<=[.!?])\s+(?=[A-Z0-9"“])/)).map((s) => s.trim()).filter((s) => words(s).length >= 3);

function grade(sents: string[]) {
  const ws = sents.flatMap(words);
  if (ws.length < 30) return null;
  const syl = ws.reduce((n, w) => n + syllables(w), 0);
  return Math.round((0.39 * (ws.length / sents.length) + 11.8 * (syl / ws.length) - 15.59) * 10) / 10;
}

/** The same thing should have one name. Each group lists names people might see for one concept. */
const TERM_GROUPS: Record<string, RegExp[]> = {
  "go-bag": [/\bgo[- ]bags?\b/gi, /\bgrab[- ]and[- ]go\b/gi, /\bbug[- ]out\b/gi, /\bemergency bags?\b/gi, /\bevacuation kits?\b/gi],
  "the plan itself": [/\byour plan\b/gi, /\byour report\b/gi, /\bReport\b/g],
  "sign in": [/\bsign in\b/gi, /\blog ?in\b/gi, /\bsign up\b/gi],
  "confirm email": [/\bconfirm (?:your )?email\b/gi, /\bverify (?:your )?email\b/gi, /\bmagic link\b/gi],
  "already own it": [/\bI have this\b/gi, /\bGot it\b/g, /\bAlready have\b/gi, /\bHave it\b/g],
  "buy": [/\bBuy\b/g, /\bShop\b/g, /\bGet it\b/g],
  "printable checklist": [/\bfridge checklist\b/gi, /\bfridge list\b/gi, /\bprintable checklist\b/gi, /\bone-page checklist\b/gi],
  "backup destination": [/\bbackup destination\b/gi, /\bMy places\b/gi, /\bsaved places?\b/gi, /\bmeeting (?:place|spot)\b/gi],
  "supplies list": [/\bgear list\b/gi, /\bshopping list\b/gi, /\bsupply list\b/gi, /\bsupplies list\b/gi, /\bbuy list\b/gi],
  "steps": [/\bsteps\b/gi, /\btasks\b/gi, /\bto-dos?\b/gi, /\bactions\b/gi],
  "outage length": [/\bscenario\b/gi, /\bplan length\b/gi, /\bplanning period\b/gi],
  "budget levels": [/\bEssential\b/g, /\bStandard\b/g, /\bPremium\b/g, /\bLower-cost\b/g, /\bUpgrade\b/g, /\bBasic\b/g],
};
const PROMISE = /\b(saved?|saving|sync\w*|any device|all (?:your )?devices|backed up|accurate|accuracy|guarantee\w*|exact(?:ly)?|precise|personali[sz]ed|tailored|expert|certified|approved|safe from|protect(?:s|ed)? you)\b/i;
const ALARM = /\b(deadly|die|dies|death|kill\w*|catastroph\w*|panic|urgent\w*|immediately|terrif\w*|disaster strikes|chaos|doomsday|survive|survival)\b/i;
const FAMILY = /\b(family|families|your kids|your children|spouse|husband|wife|loved ones|mom|dad)\b/i;

const lineHits = (t: string, re: RegExp) => [...new Set(t.split(/\n+/).map((l) => l.trim()).filter((l) => re.test(l)))].slice(0, 40);

const perScreen = Object.entries(texts).map(([name, t]) => {
  const sents = sentencesOf(t);
  return {
    name,
    words: words(t).length,
    grade: grade(sents),
    longSentences: sents.filter((s) => words(s).length > 25).map((s) => ({ words: words(s).length, text: s })),
    promise: lineHits(t, PROMISE),
    alarm: lineHits(t, ALARM),
    family: lineHits(t, FAMILY),
  };
});

const terms = Object.fromEntries(
  Object.entries(TERM_GROUPS).map(([g, res]) => [
    g,
    Object.fromEntries(
      res
        .map((re) => {
          const where: Record<string, number> = {};
          for (const [name, t] of Object.entries(texts)) {
            const n = t.match(re)?.length ?? 0;
            if (n) where[name] = n;
          }
          return [re.source, where] as const;
        })
        .filter(([, w]) => Object.keys(w).length),
    ),
  ]),
);

writeJson("copy.json", { perScreen, terms });
for (const s of perScreen) console.log(`${s.name.padEnd(28)} grade ${String(s.grade ?? "-").padEnd(5)} long ${s.longSentences.length} promise ${s.promise.length} alarm ${s.alarm.length} family ${s.family.length}`);
for (const [g, v] of Object.entries(terms)) if (Object.keys(v).length > 1) console.log(`terms "${g}": ${Object.keys(v).join(" | ")}`);
