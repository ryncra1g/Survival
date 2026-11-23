# Safety

## Diff of lib/safety/ (PRs #7–#10)

````diff
diff --git a/lib/safety/linter.ts b/lib/safety/linter.ts
index 0ff9b75..4a1bad7 100644
--- a/lib/safety/linter.ts
+++ b/lib/safety/linter.ts
@@ -6,7 +6,7 @@ import type { PlanDocument } from "@/lib/plan/document";
  * a negation ("never", "don't", "not", ...) or an explicit outdoor qualifier.
  */
 export interface Violation {
-  rule: "indoor_combustion" | "backfeed" | "dosing" | "weapons";
+  rule: "indoor_combustion" | "backfeed" | "dosing" | "weapons" | "unsafe_diy";
   text: string;
   clause: string;
 }
@@ -20,6 +20,14 @@ const BACKFEED = /\b(dryer (?:outlet|plug|receptacle)|suicide cord|double[- ]?ma
 
 const DOSING = /\b\d+(?:\.\d+)?\s*(?:mg|mcg|µg|milligrams?|micrograms?|ml|mL|cc|tablets?|pills?|capsules?|units? of insulin|iu)\b|\b(?:take|give|administer)\s+(?:\d+|one|two|three|half)\b(?!\s*(?:minutes?|hours?|days?|gallons?|liters?))|\bdos(?:e|age|ing) (?:of|is|for)\b/i;
 
+/**
+ * D3b: improvised practices that kill people in outages, blocked anywhere in a plan unless the clause says not to:
+ * candle / terracotta-pot heaters; a gas oven or stovetop for heat; running a car in an attached garage;
+ * plugging a generator into a wall outlet (grills and camp stoves indoors are the indoor_combustion rule).
+ */
+const UNSAFE_DIY = /\b(candle|terra ?-?cotta|flower ?-?pot|clay ?-?pot)(?:[- ]pot)? heaters?\b|\bterra ?-?cotta pots?\b[^.]*\bcandles?\b|\bcandles?\b[^.]*\bterra ?-?cotta\b|\b(?:gas )?(?:oven|stove ?top|range|burners?)\b[^.]*\b(?:to|for) (?:heat|warm)\b|\b(?:heat|warm)(?:ing)? (?:the |your |a )?(?:home|house|room|apartment|kitchen)\b[^.]*\b(?:oven|stove ?top)\b|\b(?:run|running|idle|idling|warm(?:ing)? up|start(?:ing)?)\b[^.]*\b(?:car|vehicle|truck|engine)\b[^.]*\b(?:attached )?garage\b|\bplug(?:ging|ged)? (?:a |the |your )?generator (?:in)?to (?:a |an |the |your )?(?:wall|house|home)?\s*(?:outlet|socket|receptacle)s?\b/i;
+const DIY_NEGATION = /\b(never|not|no|don'?t|do not|avoid|instead of)\b/i;
+
 const WEAPONS = /\b(guns?|firearms?|rifles?|shotguns?|pistols?|handguns?|ammo|ammunition|weapons?|tactical|booby[- ]?traps?|body armor|crossbows?|pepper spray|bear spray|knife fighting|shoot(?:ing)? (?:intruders?|looters?))\b/i;
 
 /** Split into clauses on sentence/clause boundaries and contrastive connectives. */
@@ -37,6 +45,7 @@ export function lintText(text: string): Violation[] {
     if (BACKFEED.test(clause) && !/\b(never|don'?t|do not|not)\b/i.test(clause)) out.push({ rule: "backfeed", text, clause });
     if (DOSING.test(clause)) out.push({ rule: "dosing", text, clause });
     if (WEAPONS.test(clause)) out.push({ rule: "weapons", text, clause });
+    if (UNSAFE_DIY.test(clause) && !DIY_NEGATION.test(clause)) out.push({ rule: "unsafe_diy", text, clause });
   }
   return out;
 }
@@ -78,6 +87,11 @@ export function documentStrings(doc: PlanDocument): string[] {
         case "levelchoice":
           s.push(b.caption, ...b.levels.map((l) => l.name));
           break;
+        case "tips":
+          // Linted whether or not DIY_TIPS_ENABLED is on.
+          for (const t of b.tips) s.push(t.situation, ...t.steps, t.source.label);
+          s.push(...b.dontDo);
+          break;
       }
     }
   }
diff --git a/lib/safety/required.ts b/lib/safety/required.ts
index 6f35c8d..4d68305 100644
--- a/lib/safety/required.ts
+++ b/lib/safety/required.ts
@@ -23,4 +23,4 @@ export const INDOOR_HEATER_RULE =
   "Use only a propane heater labeled for indoor use with an oxygen depletion sensor (ODS) and tip-over shutoff, follow its manual's ventilation requirement, keep 3 feet of clearance, never leave it running while everyone sleeps, and keep a working CO alarm in the same room.";
 
 export const BLEACH_RULE =
-  "EPA emergency disinfection: if water is cloudy, filter it first. Add 8 drops of regular unscented 6% bleach (or 6 drops of 8.25%) per gallon, stir, and wait 30 minutes. It should smell slightly of chlorine — if not, repeat once and wait another 15 minutes. Boiling for 1 full minute (3 minutes above 6,500 ft) also works.";
+  "If water is cloudy, let it settle or filter it first. Then disinfect it with regular unscented bleach, using the amount and wait time on the bleach label and in EPA's emergency disinfection steps, or bring it to a rolling boil for 1 minute (3 minutes above 6,500 ft), as CDC advises. Never guess an amount.";
````

## Linter tests

`tests/safety.test.ts` diff in #7–#10: **unchanged** (the 300-household fuzz runs every rule, including the new one, over every plan).

The `unsafe_diy` rule and the tip library are tested in `tests/tips.test.ts` (new, full source):

### `tests/tips.test.ts`

````ts
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { ALLOWED_SOURCE_HOSTS, DONT_DO, TIPS } from "@/lib/tips/library";
import { lintText } from "@/lib/safety/linter";
import { renderPlanEmail } from "@/lib/email/render";
import { PlanView } from "@/components/PlanView";
import { buildPlan } from "./helpers/build";

const meta = { appUrl: "https://app.example", unsubscribeUrl: "https://app.example/u", mailingAddress: "x", planUrl: "x", pdfAttached: true };

describe("D3b: the tip library", () => {
  it("every tip has an official source, materials, steps and a last-reviewed date", () => {
    for (const t of TIPS) {
      expect(ALLOWED_SOURCE_HOSTS, t.id).toContain(new URL(t.source.url).host);
      expect(t.steps.length, t.id).toBeGreaterThan(0);
      expect(t.materials.length, t.id).toBeGreaterThan(0);
      expect(t.lastReviewed).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
  it("gives no amounts from memory (no numbers in situations or steps)", () => {
    for (const t of TIPS) for (const line of [t.situation, ...t.steps]) expect(line, t.id).not.toMatch(/\d/);
  });
  it("passes the safety linter, including every 'Don't do this' line", () => {
    for (const t of TIPS) for (const line of [t.situation, ...t.steps, ...t.dontDo]) expect(lintText(line), line).toEqual([]);
    for (const d of DONT_DO) expect(lintText(d), d).toEqual([]);
  });
  it("covers water, heat, sanitation, light & power and Day 0", () => {
    expect(new Set(TIPS.map((t) => t.area))).toEqual(new Set(["water", "heat", "sanitation", "light_power", "day0"]));
  });
});

describe("D3b: the linter blocks the owner's 'don't do this' list anywhere", () => {
  const unsafe = [
    "Make a terracotta pot heater with tea candles.",
    "Build a candle heater for the bedroom.",
    "Turn on the gas oven to heat the kitchen.",
    "Use the stovetop for heat overnight.",
    "Warm up the car in the attached garage.",
    "Plug the generator into a wall outlet.",
    "Run a camp stove indoors to stay warm.",
  ];
  const safe = DONT_DO.concat(["A gas range usually works in an outage if you light the burners with a match.", "Keep the car above half a tank."]);
  it("flags unsafe phrasings", () => {
    for (const u of unsafe) expect(lintText(u).length, u).toBeGreaterThan(0);
  });
  it("allows the same practices when the sentence says not to", () => {
    for (const s of safe) expect(lintText(s), s).toEqual([]);
  });
});

describe("D3b: hidden unless DIY_TIPS_ENABLED is on", () => {
  it("plans carry the boxes, but web and email show them only with the flag", async () => {
    const doc = (await buildPlan()).document;
    const areas = doc.sections.filter((s) => s.blocks.some((b) => b.type === "tips")).map((s) => s.id).sort();
    expect(areas).toEqual(["day0", "heat", "power", "sanitation", "water"].sort());
    const web = (diyTips: boolean) => renderToStaticMarkup(createElement(PlanView, { doc, planId: "x", diyTips }));
    expect(web(false)).not.toContain("No time to buy?");
    expect(web(true)).toContain("No time to buy?");
    expect(renderPlanEmail(doc, meta).html).not.toContain("No time to buy?");
    expect(renderPlanEmail(doc, { ...meta, diyTips: true }).html).toContain("No time to buy?");
  });
});
````

## Tip library

### `lib/tips/library.ts`

````ts
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

/** Materials per tip id, for matching against the inventory (accounts track). */
export const TIP_MATERIALS: Record<string, string[]> = Object.fromEntries(TIPS.map((t) => [t.id, t.materials]));
````

### `lib/tips/match.ts`

````ts
/**
 * D3b × D2 (accounts track): which of a tip's materials the household already has, from the names of
 * inventory items marked have or bought. Simple word matching on the material's main word.
 */
const STOP = new Set(["a", "an", "the", "or", "and", "if", "you", "have", "it", "of", "used", "with", "your", "clean", "spare", "extra"]);

const words = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w))
    .map((w) => w.replace(/(es|s)$/, ""));

export function matchMaterials(materials: string[], ownedNames: string[]): string[] {
  const have = new Set(ownedNames.flatMap(words));
  return materials.filter((m) => words(m).some((w) => have.has(w)));
}
````

## New or changed user-facing sentences on water, food, heat, power, fuel, generators, CO, kids or evacuation

Method: every added line (`+`) in `lib/`, `app/` and `components/` (.ts/.tsx, not tests, not the ZIP table) in `git diff claude/headline-copy...claude/accounts-d`, keeping string literals and JSX text of 12+ characters that read as words and contain a topic word. Line numbers are in the current file. Text built from `${…}` templates is shown as written in the code. 150 strings.

| File:line | Text |
| --- | --- |
| `app/account/places/page.tsx:17` | If we have to leave, we go to: |
| `app/account/places/page.tsx:18` | Where you&apos;d go if you had to leave home. Saved to your account and encrypted. We never use these addresses in emails, analytics or AI. |
| `app/account/reminders/page.tsx:21` | Get an email when it&apos;s time to test alarms, rotate water and check your supplies. |
| `app/plan/[id]/places/page.tsx:19` | Write down where you'd go if you had to leave, then print one copy for each go-bag. |
| `app/sources/page.tsx:16` | In an emergency, follow official instructions from local emergency management. Official evacuation orders override any plan. |
| `app/sources/page.tsx:34` | Never run a generator, grill, camp stove or fuel-burning heater indoors, in a garage or near open windows. |
| `app/sources/page.tsx:35` | Never plug a generator into a wall outlet or dryer outlet. |
| `app/sources/page.tsx:37` | For water treatment, follow the product label and CDC/EPA guidance. |
| `components/ChangeAnswer.tsx:13` | If you have to leave |
| `components/Landing.tsx:6` | Exactly how much water and food to keep, and what to buy first. |
| `components/Landing.tsx:7` | Staying warm and powered in an outage, with generator and CO safety. |
| `components/Landing.tsx:8` | Kids, pets, medical needs, contacts and when you must leave. |
| `components/PlacesEditor.tsx:51` | Official evacuation orders override this plan. |
| `components/PlacesForm.tsx:43` | If we have to leave, we go to: |
| `components/PlacesForm.tsx:47` | Official evacuation orders override this plan. |
| `components/Questionnaire.tsx:310` | Do you already have a water filter for emergencies? |
| `components/Questionnaire.tsx:310` | Not a fridge or pitcher filter. |
| `components/Questionnaire.tsx:312` | Household filter |
| `components/Questionnaire.tsx:313` | Personal filter |
| `components/Questionnaire.tsx:376` | If you have to leave |
| `components/Questionnaire.tsx:387` | If your home becomes unsafe or officials order an evacuation, where could you go? |
| `components/Questionnaire.tsx:441` | calories of food |
| `lib/answers/schema.ts:26` | If your home becomes unsafe or officials order an evacuation, where could you go? |
| `lib/answers/schema.ts:222` | Public shelter |
| `lib/answers/schema.ts:229` | Hotel or public shelter |
| `lib/answers/schema.ts:242` | Household filter |
| `lib/answers/schema.ts:243` | Personal filter |
| `lib/catalog/seed.ts:53` | Water treatment tablets (chlorine dioxide) |
| `lib/catalog/seed.ts:54` | Chlorine dioxide tablets as a light backup to your filter or boiling; follow the label for amount and wait time |
| `lib/catalog/seed.ts:55` | Aquamira water treatment tablets |
| `lib/catalog/seed.ts:59` | Spare filter elements or cartridges |
| `lib/catalog/seed.ts:60` | Replacement elements for your household filter, or a backflush kit; match your filter's brand and model |
| `lib/catalog/seed.ts:61` | Your filter maker's replacement elements |
| `lib/catalog/seed.ts:234` | One food-grade 5-gal bucket with a gamma seal lid, mylar bag and oxygen absorbers for rice, beans or oats; enough buckets for your bulk staples |
| `lib/plan/aiSummary.ts:16` | Follow the product label and CDC/EPA guidance for water treatment; never give dosages. |
| `lib/plan/aiSummary.ts:17` | Never suggest grills, generators or heaters indoors or in a garage. |
| `lib/plan/aiSummary.ts:18` | Official evacuation orders override this plan. |
| `lib/plan/build.ts:74` | water to store |
| `lib/plan/build.ts:75` | calories of food |
| `lib/plan/build.ts:83` | fuel reserve per vehicle |
| `lib/plan/build.ts:122` | Plan to stay home when it's safe, and still know where you'd go if officials order an evacuation. |
| `lib/plan/build.ts:125` | Know your options for a hotel or a public shelter: hotels outside your area, and your nearest shelter${pets ? ", and whether it accepts pets" : ""}. |
| `lib/plan/build.ts:126` | Decide where you'd go if you had to leave home: family or friends, a hotel, or a public shelter. |
| `lib/plan/build.ts:135` | List 2–3 hotels or motels in different directions from home, and call ahead before you leave. |
| `lib/plan/build.ts:137` | Find your nearest public shelter and how you'd get there; shelters open when officials announce them. |
| `lib/plan/build.ts:278` | ${a.waterSource === "well" ? "Private well" : "Municipal"}${a.waterFilter !== "none" ? |
| `lib/plan/build.ts:282` | If you must leave |
| `lib/plan/build.ts:389` | Complete the full ${LABELS.scenarioDays[a.scenarioDays]} food list: ${n(cp.foodMix.bulk.totalLbs)} lb of bulk staples plus the rest of your food mix. |
| `lib/plan/build.ts:389` | Complete the full ${LABELS.scenarioDays[a.scenarioDays]} food supply: ${n(cp.food.totalKcal)} calories in all (see Food). |
| `lib/plan/build.ts:427` | Water: filter and disinfect one gallon start to finish. |
| `lib/plan/build.ts:561` | Other indoor space (a spare room, under the stairs or beds): water bricks and labelled bins, away from heaters and direct sun. |
| `lib/plan/build.ts:563` | Shed: even if it isn't right for supplies, it's the place for gas cans and propane cylinders, away from the house. |
| `lib/plan/build.ts:567` | No suitable storage: keep the first 3 days of water and a go-bag, and buy the rest as soon as a storm or shortage is forecast, before stores sell out. |
| `lib/plan/build.ts:626` | Safe water, in this order |
| `lib/plan/build.ts:629` | 1. Stored water |
| `lib/plan/build.ts:629` | Nothing to treat if it was stored clean; replace tap-filled water every 6 months. |
| `lib/plan/build.ts:630` | 2. Household filter (gravity or pump) |
| `lib/plan/build.ts:630` | The main way to make more water. |
| `lib/plan/build.ts:630` | Viruses and chemicals: disinfect after filtering. |
| `lib/plan/build.ts:631` | A light backup to the filter. |
| `lib/plan/build.ts:631` | Chemicals and fuel. Iodine and chlorine tablets don't reliably kill Cryptosporidium; chlorine dioxide can, when you follow the label. |
| `lib/plan/build.ts:632` | The fallback if you have no filter or tablets. |
| `lib/plan/build.ts:632` | Chemicals, fuel and toxins. |
| `lib/plan/build.ts:633` | 5. Straw or bottle filter |
| `lib/plan/build.ts:636` | Fuel or chemicals in the water |
| `lib/plan/build.ts:636` | Water with fuel or toxic chemicals in it can't be made safe by boiling or disinfecting. Use stored or bottled water, and contact your health department. |
| `lib/plan/build.ts:638` | Your water kit |
| `lib/plan/build.ts:641` | A way to get water out: the drum pump or siphon, and the spigot on each jug. |
| `lib/plan/build.ts:641` | A way to get water out: the spigot on each jug, or a clean pitcher. |
| `lib/plan/build.ts:643` | Spare filter elements or a backflush kit for your household filter. |
| `lib/plan/build.ts:644` | A backup method: treatment tablets, plus unscented bleach, used as the labels direct. |
| `lib/plan/build.ts:646` | You already have a household filter: test it now, and keep spare cartridges or a backflush kit with it. |
| `lib/plan/build.ts:647` | Your straw or bottle filter is for one person on the move: keep it in your go-bag. |
| `lib/plan/build.ts:802` | Daily calories |
| `lib/plan/build.ts:805` | Your food mix: ${fm.choice === "mix" ? "recommended for your household" : "your choice"} (${n(f.totalKcal)} kcal in all) |
| `lib/plan/build.ts:826` | Infant formula: plan on ${plural(cp.formula.cans, "can")} of powdered formula (planning figure). Ask your pediatrician what to use and follow the label for mixing; use stored or boiled water. |
| `lib/plan/build.ts:828` | Toddler milk: add shelf-stable UHT milk boxes or powdered milk to your ready-to-eat food. |
| `lib/plan/build.ts:836` | Fridge perishables that are still below 40°F, then freezer food (a full freezer holds ~48 h). |
| `lib/plan/build.ts:837` | Pantry and canned food, ready-to-eat items. |
| `lib/plan/build.ts:838` | The rest of your ready-to-eat food and kits. |
| `lib/plan/build.ts:843` | Compare food options |
| `lib/plan/build.ts:848` | Open and eat; heat if you can |
| `lib/plan/build.ts:848` | Add hot water to freeze-dried meals; ration bars are ready |
| `lib/plan/build.ts:849` | Water and fuel |
| `lib/plan/build.ts:849` | Water and fuel to cook |
| `lib/plan/build.ts:849` | Hot water for freeze-dried meals |
| `lib/plan/build.ts:850` | Buckets: compact for the calories |
| `lib/plan/build.ts:850` | Most space for the calories |
| `lib/plan/build.ts:857` | Store bulk staples in sealed food-grade buckets or mylar, cool and dry: about ${plural(fm.bulk.buckets, "5-gallon bucket")} for ${n(fm.bulk.totalLbs)} lb. |
| `lib/plan/build.ts:859` | Freeze-dried meals need hot water: count it in your water and cooking fuel. |
| `lib/plan/build.ts:861` | Include comfort foods, spices, and a manual can opener. |
| `lib/plan/build.ts:866` | Switch or mix your food: the calorie total stays the same |
| `lib/plan/build.ts:870` | Your household needs about {{food.dailyKcal}} calories a day — {{food.totalKcal}} for the full {{scenario.label}}. Your mix: {{food.mix}}. Eat perishables first, then pantry food, then bulk staples. |
| `lib/plan/build.ts:1059` | Official evacuation orders override this plan |
| `lib/plan/build.ts:1059` | Official evacuation orders override this plan. If officials tell you to leave, go, using the routes they give. |
| `lib/plan/build.ts:1088` | When you must leave |
| `lib/plan/build.ts:1123` | Water (1 L) and your straw or bottle filter |
| `lib/plan/build.ts:1123` | Water (1 L) and filter bottle |
| `lib/plan/build.ts:1123` | Child ID card and comfort item |
| `lib/plan/build.ts:1123` | Pet food, leash, records |
| `lib/plan/build.ts:1135` | If you have to leave, your plan is a public shelter. Know where the nearest one is and how you'd get there, and leave when officials say so. |
| `lib/plan/build.ts:1136` | You haven't picked a backup destination yet. Choose one now, write it down, and leave when officials say so. |
| `lib/plan/build.ts:1144` | Mandatory evacuation order for your zone |
| `lib/plan/build.ts:1144` | Leave immediately. |
| `lib/plan/build.ts:1145` | A voluntary evacuation is announced |
| `lib/plan/build.ts:1145` | Leave now with anyone who has mobility or medical needs — they need extra time. |
| `lib/plan/build.ts:1146` | Leave now; call 911/utility from a safe place. |
| `lib/plan/build.ts:1149` | Shelters open when officials announce them: check your county's alerts and local news.${a.pets.length ? " Most public shelters allow only service animals, so plan where your pets would go." : ""} |
| `lib/plan/document.ts:112` | water to store |
| `lib/plan/maintenance.ts:23` | Test CO and smoke alarms. |
| `lib/plan/maintenance.ts:24` | Run the generator under load outdoors for 20 minutes. |
| `lib/plan/maintenance.ts:25` | Replace tap-filled stored water; check food dates and rotate into meals; refresh go-bags for the season. |
| `lib/plan/maintenance.ts:26` | Rotate stabilized gasoline into cars; replace bleach; check first aid kit; update documents, photos and medication lists. |
| `lib/plan/maintenance.ts:28` | Winter check: heat plan, pipe insulation, sleeping bags, propane. |
| `lib/plan/maintenance.ts:29` | Hurricane season check: window protection, evacuation zone, insurance, fuel. |
| `lib/plan/sampleSummary.ts:43` | ${n(cp.water.storedGal)} gal of water |
| `lib/plan/sampleSummary.ts:43` | ${n(cp.food.totalKcal)} calories of food |
| `lib/plan/sampleSummary.ts:44` | ${range(p.gasolineGalPerDay[0], p.gasolineGalPerDay[1])} gal of gasoline a day |
| `lib/plan/sampleSummary.ts:44` | ${n(p.hoursPerDay)} generator hours a day |
| `lib/plan/sampleSummary.ts:46` | ${n(cp.evacuation.reserveGalPerVehicle)} gal fuel reserve per car |
| `lib/plan/stages.ts:10` | Calculating water, food and fuel for your household |
| `lib/rules/engine.ts:831` | Food, days ${p2Days + 1}–${a.scenarioDays} (build up with each grocery trip) |
| `lib/rules/engine.ts:839` | Compare food options |
| `lib/rules/engine.ts:854` | Recommended mix: ${mixLabel(foodMix.shares)} |
| `lib/safety/required.ts:26` | If water is cloudy, let it settle or filter it first. Then disinfect it with regular unscented bleach, using the amount and wait time on the bleach label and in EPA's emergency disinfection steps, or bring it to a rolling boil for 1 minute (3 minutes above 6,500 ft), as CDC advises. Never guess an amount. |
| `lib/tips/library.ts:24` | Don't use candle or terracotta-pot heaters. |
| `lib/tips/library.ts:25` | Never use a grill or camp stove indoors or in a garage. |
| `lib/tips/library.ts:26` | Don't use a gas oven or stovetop to heat your home. |
| `lib/tips/library.ts:28` | Never plug a generator into a wall outlet. |
| `lib/tips/library.ts:39` | A storm is coming and you have no stored water. |
| `lib/tips/library.ts:41` | Fill clean pots, pitchers and bottles with tap water for drinking while it's still safe. |
| `lib/tips/library.ts:43` | Don't store drinking water in containers that held chemicals. |
| `lib/tips/library.ts:49` | You have no filter and no treatment tablets. |
| `lib/tips/library.ts:50` | heat source used outdoors or a working stove |
| `lib/tips/library.ts:51` | Let cloudy water settle, or strain it through a clean cloth. |
| `lib/tips/library.ts:51` | Boil it as CDC directs, let it cool, and store it in clean covered containers. |
| `lib/tips/library.ts:52` | CDC: Make water safe in an emergency |
| `lib/tips/library.ts:53` | Don't drink water that may have fuel or chemicals in it; boiling won't fix that. |
| `lib/tips/library.ts:59` | The power is out in cold weather and you have no backup heat. |
| `lib/tips/library.ts:60` | warm clothes |
| `lib/tips/library.ts:61` | Pick one room to keep warm and close the doors to the rest. |
| `lib/tips/library.ts:71` | Cover waste with litter or sawdust if you have it, tie the bag closed, and keep it outside, away from water. |
| `lib/tips/library.ts:73` | Don't dump waste where it can reach drinking water. |
| `lib/tips/library.ts:79` | The power is out and you have no lanterns or power bank. |
| `lib/tips/library.ts:81` | Dim screens and turn on battery saver. |
| `lib/tips/library.ts:82` | Ready.gov: Power outages |
| `lib/tips/library.ts:83` | Use flashlights, not candles: candles can start fires. |
| `lib/tips/library.ts:91` | Fill containers and the tub with water, and charge every phone. |
| `lib/zip/resources.ts:70` | How to make water safe in an emergency (CDC) |
| `lib/zip/resources.ts:75` | Find an open shelter (American Red Cross) |
