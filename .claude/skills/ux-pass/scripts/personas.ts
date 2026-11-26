import fs from "node:fs";
import { chromium, type Locator, type Page } from "@playwright/test";
import { PDFDocument } from "pdf-lib";
import { DEFAULT_ANSWERS, LABELS, type Answers } from "@/lib/answers/schema";
import { BASE_OFF, OUT, VIEWPORTS, ensureDir, mainText, newCtx, writeJson } from "./common";

/**
 * /ux-pass step 2: 8 households go through the real flow by tapping, from the front page to the plan.
 *   npx tsx .claude/skills/ux-pass/scripts/personas.ts [persona-id ...]
 * Records taps, screens, scroll needed, helper text shown, errors hit, plan length and the first 3 steps.
 * Writes <OUT>/personas.json and <OUT>/personas/<id>-plan.txt (full plan text, for the contradiction read).
 */
type P = { id: string; who: string; answers: Answers };
const A = (o: Partial<Answers>): Answers => ({ ...DEFAULT_ANSWERS, ...o });

export const PERSONAS: P[] = [
  { id: "solo-renter", who: "Solo apartment renter, Chicago, no car", answers: A({ zip: "60614", adults: 1, homeType: "apartment", floors: 1, heatSources: ["electric"], cooking: "electric", vehicleFuels: [], storage: ["closets"], budget: "500_1500", evacuation: { destination: "friends_family", distanceMiles: 25 } }) },
  { id: "toddlers", who: "Two parents, kids 1, 3 and 6, a dog, Columbus suburb", answers: A({ zip: "43215", adults: 2, childrenAges: [1, 3, 6], toddlerNeeds: ["diapers", "milk"], pets: [{ type: "dog", size: "medium", count: 1, specialDiet: false, medications: false }], hasGarage: true, hasYard: true, storage: ["garage", "closets"], scenarioDays: 14, vehicleFuels: ["gas", "hybrid"], approach: "family_friends", evacuation: { destination: "friends_family", distanceMiles: 120 } }) },
  { id: "elderly-mobility", who: "Couple in their 80s, limited mobility, daily prescriptions, Maine winter", answers: A({ zip: "04101", adults: 2, elderlyOrMobility: true, hasPrescriptions: true, homeType: "townhouse", floors: 1, heatSources: ["oil"], cooking: "electric", budget: "1500_5000", vehicleFuels: ["gas"], storage: ["closets", "other_indoor"] }) },
  { id: "powered-device", who: "Adult on oxygen and CPAP, Phoenix apartment, no backup power", answers: A({ zip: "85004", adults: 1, hasPrescriptions: true, poweredDevices: ["oxygen", "cpap"], homeType: "apartment", floors: 1, heatSources: ["electric"], cooking: "electric", vehicleFuels: ["gas"], storage: ["closets"], budget: "500_1500" }) },
  { id: "rural-wildfire", who: "Rural couple, well water, propane, two big dogs, wildfire country", answers: A({ zip: "95969", adults: 2, pets: [{ type: "dog", size: "large", count: 2, specialDiet: false, medications: false }], hasGarage: true, hasYard: true, hasShed: true, heatSources: ["propane", "wood"], cooking: "gas", waterSource: "well", vehicleFuels: ["diesel", "gas"], storage: ["garage", "shed"], approach: "family_friends", evacuation: { destination: "friends_family", distanceMiles: 120 }, budget: "1500_5000", skills: ["camping", "tools"], scenarioDays: 30 }) },
  { id: "gulf-hurricane", who: "Family of four in New Orleans with a cat, plans a hotel inland", answers: A({ zip: "70112", adults: 2, childrenAges: [8, 12], pets: [{ type: "cat", size: "small", count: 1, specialDiet: false, medications: false }], heatSources: ["electric"], cooking: "gas", approach: "hotel_shelter", evacuation: { destination: "hotel", distanceMiles: 250 }, vehicleFuels: ["gas"], budget: "500_1500" }) },
  { id: "tight-budget", who: "Single parent with a 9-year-old, Atlanta apartment, under $500, no car", answers: A({ zip: "30310", adults: 1, childrenAges: [9], homeType: "apartment", floors: 1, heatSources: ["electric"], cooking: "electric", vehicleFuels: [], storage: ["limited"], budget: "under_500", scenarioDays: 3, evacuation: { destination: "public_shelter" }, approach: "hotel_shelter" }) },
  { id: "generous-budget", who: "Couple with teens, Boulder house with basement, $5,000+, 90 days", answers: A({ zip: "80302", adults: 2, childrenAges: [14, 16], hasBasement: true, hasGarage: true, hasYard: true, storage: ["basement", "garage"], scenarioDays: 90, budget: "5000_plus", vehicleFuels: ["ev", "gas"], waterFilter: "personal", backupPower: "none", skills: ["first_aid"], evacuation: { destination: "second_property", distanceMiles: 250 }, approach: "another_property" }) },
];

interface ScreenLog {
  screen: string;
  taps: number;
  keys: number;
  /** Something the persona had to tap sat below the first screenful. */
  scrolledToAnswer: boolean;
  lowestTapY: number;
  mainButtonVisibleWithoutScroll: boolean;
  docHeight: number;
  questions: string[];
  helperText: string[];
  errors: string[];
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

class Driver {
  taps = 0;
  keys = 0;
  lowest = 0;
  constructor(public page: Page) {}
  group(legend: RegExp | string, within?: Locator) {
    return (within ?? this.page.locator("main")).locator("fieldset").filter({ has: this.page.locator("legend", { hasText: legend }) }).last();
  }
  choice(scope: Locator, label: string) {
    return scope.locator("button[aria-pressed]").filter({ has: this.page.locator("span.font-semibold", { hasText: new RegExp(`^${esc(label)}$`) }) }).first();
  }
  async tap(l: Locator) {
    await l.scrollIntoViewIfNeeded();
    const y = await this.page.evaluate(() => scrollY);
    const box = await l.boundingBox();
    if (box) this.lowest = Math.max(this.lowest, box.y + y + box.height);
    await l.click();
    this.taps++;
  }
  async pick(scope: Locator, label: string, want = true) {
    const b = this.choice(scope, label);
    const on = (await b.getAttribute("aria-pressed")) === "true";
    if (on !== want) await this.tap(b);
  }
  async stepper(scope: Locator, label: string, from: number, to: number) {
    for (let n = from; n < to; n++) await this.tap(scope.getByRole("button", { name: `More ${label}` }));
    for (let n = from; n > to; n--) await this.tap(scope.getByRole("button", { name: `Fewer ${label}` }));
  }
}

async function answerScreen(d: Driver, id: string, a: Answers) {
  const p = d.page;
  const D = DEFAULT_ANSWERS;
  switch (id) {
    case "location": {
      await d.tap(p.locator("#zip"));
      await p.locator("#zip").pressSequentially(a.zip);
      d.keys += a.zip.length;
      await d.pick(d.group("Plan for"), LABELS.scenarioDays[a.scenarioDays]);
      break;
    }
    case "household": {
      await d.stepper(d.group("Adults"), "adults", D.adults, a.adults);
      for (const age of a.childrenAges) {
        await d.tap(p.locator("#childAge"));
        await p.locator("#childAge").selectOption(String(age));
        d.taps++;
      }
      if (a.elderlyOrMobility) await d.pick(d.group("elderly"), "Yes");
      break;
    }
    case "toddlers": {
      const g = d.group("Select all");
      const names = { diapers: "Diapers", formula: "Infant formula", milk: "Toddler milk" } as const;
      for (const n of a.toddlerNeeds) await d.pick(g, names[n]);
      if (!a.toddlerNeeds.length) await d.tap(d.choice(g, "None of these"));
      break;
    }
    case "pets": {
      if (!a.pets.length) { await d.tap(d.choice(p.locator("main"), "No pets")); break; }
      for (const [i, pet] of a.pets.entries()) {
        await d.tap(d.choice(p.locator("main"), "+ Add a pet"));
        const card = p.locator("main .card").filter({ hasText: `Pet group ${i + 1}` });
        await d.pick(d.group("Type", card), pet.type[0].toUpperCase() + pet.type.slice(1));
        await d.pick(d.group("Size", card), pet.size[0].toUpperCase() + pet.size.slice(1));
        await d.stepper(d.group("How many", card), "pets", 1, pet.count);
        if (pet.specialDiet) await d.pick(d.group("Special diet", card), "Yes");
        if (pet.medications) await d.pick(d.group("medication", card), "Yes");
      }
      break;
    }
    case "medical": {
      if (a.hasPrescriptions) await d.pick(d.group("prescription"), "Yes");
      for (const dev of a.poweredDevices) await d.pick(d.group("powered medical device"), LABELS.device[dev]);
      if (await p.locator("#healthConsent").isVisible()) { await d.tap(p.locator("#healthConsent")); }
      break;
    }
    case "home": {
      await d.pick(d.group("Home type"), LABELS.home[a.homeType]);
      await d.stepper(d.group("Floors"), "floors", D.floors, a.floors);
      const g = d.group("Your home has");
      await d.pick(g, "Basement / lower level", a.hasBasement);
      await d.pick(g, "Garage", a.hasGarage);
      await d.pick(g, "Yard", a.hasYard);
      await d.pick(g, "Shed", a.hasShed);
      break;
    }
    case "heat": {
      const g = d.group("heated");
      for (const h of ["natural_gas", "oil", "propane", "electric", "wood"] as const) await d.pick(g, LABELS.heat[h], a.heatSources.includes(h));
      await d.pick(d.group("stove"), LABELS.cooking[a.cooking]);
      await d.pick(d.group("water come from"), a.waterSource === "well" ? "Private well" : "Public water");
      await d.pick(d.group("water filter"), LABELS.waterFilter[a.waterFilter]);
      break;
    }
    case "power": {
      await d.pick(d.group("Backup power"), LABELS.backupPower[a.backupPower]);
      const g = d.group("Vehicles");
      // Fewest taps: keep a default vehicle the household has, remove the rest, add what's missing.
      const add = [...a.vehicleFuels];
      for (const f of D.vehicleFuels) {
        const i = add.indexOf(f);
        if (i >= 0) add.splice(i, 1);
        else await d.tap(g.getByRole("button", { name: `Remove ${LABELS.fuel[f]} vehicle` }).first());
      }
      for (const f of add) await d.tap(d.choice(g, `+ ${LABELS.fuel[f]}`));
      break;
    }
    case "storage": {
      const g = d.group("Which spaces");
      const single = a.storage.find((s) => s === "limited" || s === "none");
      if (single) await d.pick(g, LABELS.storage[single]);
      else for (const s of ["garage", "basement", "shed", "closets", "other_indoor"] as const) if (await d.choice(g, LABELS.storage[s]).count()) await d.pick(g, LABELS.storage[s], a.storage.includes(s));
      break;
    }
    case "evacuation": {
      // UX-5 screen: a place approach pre-fills the destination ("Which one?" only when there are two kinds).
      const APPROACH_UI = { stay_home: "Stay home when it's safe", family_friends: "Go to family or friends", another_property: "Go to another place I own", hotel_shelter: "Go to a hotel or shelter", not_sure: "Not sure yet" } as const;
      const DEST_UI = { friends_family: "A friend's or relative's home", second_property: "A second home or cabin", raw_land: "Land with no buildings", hotel: "A hotel or motel", public_shelter: "A public shelter", not_sure: "I don't know yet" } as const;
      const approachGroup = (await d.group("what would you rather do").count()) ? d.group("what would you rather do") : d.group("preferred approach");
      await d.pick(approachGroup, APPROACH_UI[a.approach] ?? LABELS.approach[a.approach]);
      const full = d.group("where could you go");
      const which = d.group("Which one");
      if (await full.count()) await d.pick(full, DEST_UI[a.evacuation.destination] ?? LABELS.fallback[a.evacuation.destination]);
      else if (await which.count()) await d.pick(which, DEST_UI[a.evacuation.destination]);
      const mi = a.evacuation.distanceMiles;
      if (mi) await d.pick(d.group("how far"), mi === 1000 ? "500+ mi" : `~${mi} mi`);
      break;
    }
    case "budget": {
      await d.pick(d.group("spend on preparedness"), LABELS.budget[a.budget]);
      const g = d.group("Skills");
      for (const s of a.skills) await d.pick(g, { first_aid: "First aid", camping: "Camping", tools: "Tools / DIY" }[s]);
      await d.tap(p.locator("#termsConsent"));
      const health = p.locator("#healthConsent");
      if ((await health.isVisible()) && !(await health.isChecked())) await d.tap(health);
      break;
    }
  }
}

const SCREEN_OF: [RegExp, string][] = [
  [/Where is home/, "location"], [/Who lives with you/, "household"], [/little ones/, "toddlers"], [/Any pets/, "pets"], [/Medical needs/, "medical"],
  [/about your home/, "home"], [/Heat, cooking/, "heat"], [/Power and vehicles/, "power"], [/^Storage/, "storage"], [/If you have to leave/, "evacuation"], [/Budget and skills/, "budget"],
];

async function walk(browser: Awaited<ReturnType<typeof chromium.launch>>, persona: P) {
  const ctx = await newCtx(browser, VIEWPORTS[0], "light");
  const page = await ctx.newPage();
  const d = new Driver(page);
  const screens: ScreenLog[] = [];
  const t0 = Date.now();
  await page.goto(`${BASE_OFF}/`);
  await d.tap(page.getByRole("button", { name: "Build my free plan" }).first());
  await page.waitForURL(/\/q\//);
  for (let guard = 0; guard < 20 && /\/q\//.test(page.url()); guard++) {
    const h1 = (await page.locator("main h1").first().textContent())?.trim() ?? "";
    const id = SCREEN_OF.find(([re]) => re.test(h1))?.[1] ?? `unknown:${h1}`;
    if (screens.at(-1)?.screen === id) break; // stuck on the same screen
    await page.evaluate(() => scrollTo(0, 0));
    const startTaps = d.taps, startKeys = d.keys;
    d.lowest = 0;
    const facts = await page.evaluate(() => ({
      questions: [...document.querySelectorAll("main legend, main label[for=zip]")].map((e) => (e as HTMLElement).innerText.trim()),
      helperText: [...document.querySelectorAll("main p.text-muted, main p.text-sm, main button[aria-pressed] span.block")].map((e) => (e as HTMLElement).innerText.trim()).filter(Boolean),
      docHeight: document.documentElement.scrollHeight,
    }));
    const errors: string[] = [];
    await answerScreen(d, id, persona.answers);
    await page.evaluate(() => scrollTo(0, 0));
    const main = page.getByRole("button", { name: /^(Next|Build my plan)$/ });
    const mainBox = await main.boundingBox();
    const vh = page.viewportSize()!.height;
    await d.tap(main);
    await page.waitForTimeout(150);
    const alert = page.locator("main [role=alert]").first();
    const msg = (await alert.isVisible().catch(() => false)) ? (await alert.innerText()).trim() : "";
    if (msg) errors.push(msg);
    screens.push({ screen: id, taps: d.taps - startTaps, keys: d.keys - startKeys, scrolledToAnswer: d.lowest > vh, lowestTapY: Math.round(d.lowest), mainButtonVisibleWithoutScroll: !!mainBox && mainBox.y + mainBox.height <= vh, docHeight: facts.docHeight, questions: facts.questions, helperText: facts.helperText, errors });
    if (errors.length) break;
    if (id === "budget") break;
    await page.waitForTimeout(150);
  }
  let plan: Record<string, unknown> = { reached: false };
  try {
    await page.waitForURL(/\/plan\//, { timeout: 60_000 });
    const planId = page.url().split("/plan/")[1].split(/[?#]/)[0];
    await page.getByTestId("dashboard").waitFor();
    ensureDir(`${OUT}/personas`);
    await page.screenshot({ path: `${OUT}/personas/${persona.id}-plan-top.png` });
    const collapsedWords = (await mainText(page)).split(/\s+/).filter(Boolean).length;
    // Open every section so the saved text is the whole plan, as someone reading it all would see it.
    await page.evaluate(() => document.querySelectorAll("main details").forEach((d) => ((d as HTMLDetailsElement).open = true)));
    const text = await mainText(page);
    fs.writeFileSync(`${OUT}/personas/${persona.id}-plan.txt`, text);
    const facts = await page.evaluate(() => {
      // The step cards on the first screen (short titles; the full text is under "How to do it").
      const steps = [...document.querySelectorAll("[data-testid=next-up] > ul > li")].map((li) => (li.querySelector("p") as HTMLElement | null)?.innerText.trim() ?? "");
      return {
        firstSteps: steps.slice(0, 3),
        sections: document.querySelectorAll("details[data-section]").length,
        wholePlan: (document.querySelector("[data-testid=dashboard]") as HTMLElement | null)?.innerText.match(/Whole plan: [^\n]+/)?.[0] ?? null,
        stageCount: (document.querySelector("[data-testid=stage-progress]") as HTMLElement | null)?.innerText ?? null,
        stepCounts: ((document.querySelector("[data-testid=dashboard]") as HTMLElement | null)?.innerText.match(/\b\d+ of \d+ (done|steps)\b|\(\d+ left\)/g) ?? []).length,
        overBudget: (document.querySelector("[data-testid=over-budget]") as HTMLElement | null)?.innerText ?? null,
        stats: [...document.querySelectorAll("[data-testid^=stat-]:not([data-testid=stat-value])")].map((e) => (e as HTMLElement).innerText.replace(/\s+/g, " ").trim()),
        pageHeightScreens: Math.round((document.documentElement.scrollHeight / innerHeight) * 10) / 10,
      };
    });
    const pdf = await page.request.get(`${BASE_OFF}/api/plans/${planId}/pdf`);
    const pdfPages = pdf.ok() ? (await PDFDocument.load(await pdf.body())).getPageCount() : null;
    plan = { reached: true, planId, words: text.split(/\s+/).filter(Boolean).length, collapsedWords, pdfPages, ...facts };
  } catch (e) {
    plan = { reached: false, error: (e as Error).message.split("\n")[0], url: page.url() };
  }
  await ctx.close();
  const total = { taps: screens.reduce((s, x) => s + x.taps, 0) + 1, keys: screens.reduce((s, x) => s + x.keys, 0), screens: screens.length, seconds: Math.round((Date.now() - t0) / 1000) };
  return { id: persona.id, who: persona.who, answers: persona.answers, total, screens, plan };
}

async function main() {
  const only = process.argv.slice(2);
  const browser = await chromium.launch();
  const out = [];
  for (const p of PERSONAS.filter((x) => !only.length || only.includes(x.id))) {
    try {
      const r = await walk(browser, p);
      out.push(r);
      console.log(`${r.plan.reached ? "ok  " : "FAIL"} ${p.id.padEnd(17)} taps ${r.total.taps} keys ${r.total.keys} screens ${r.total.screens} words ${r.plan.words ?? "-"} pdf ${r.plan.pdfPages ?? "-"}  ${r.screens.flatMap((s) => s.errors).join(" | ")}`);
    } catch (e) {
      out.push({ id: p.id, error: (e as Error).message.split("\n")[0] });
      console.log(`FAIL ${p.id}: ${(e as Error).message.split("\n")[0]}`);
    }
  }
  await browser.close();
  writeJson("personas.json", out);
}

void main();
