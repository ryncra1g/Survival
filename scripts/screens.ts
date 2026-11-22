import fs from "node:fs";
import { chromium, devices, type Page } from "@playwright/test";
import { SAMPLE_HOUSEHOLD } from "@/lib/plan/sample";

/**
 * Phone screenshots (iPhone 13) of the screens a batch changed, in light and dark, for review.
 * Needs a running demo-mode server (same as the smoke loop):
 *   READYPLAN_DATA_DIR=.data/loop APP_URL=http://localhost:3300 npx next start -p 3300
 *   npx tsx scripts/screens.ts <batch>        → .data/screens/<batch>/<name>-<light|dark>.png (git-ignored)
 */
const BASE = process.env.SMOKE_URL || "http://localhost:3300";
const batch = process.argv[2] || "misc";
const OUT = `.data/screens/${batch}`;
const ONLY = process.argv.slice(3);

type Shot = { name: string; run: (page: Page, planId: string) => Promise<void> };

async function makePlan(page: Page): Promise<string> {
  const O = { origin: BASE };
  const start = await page.request.post(`${BASE}/api/start`, { headers: O, maxRedirects: 0 });
  const qid = (start.headers()["location"] ?? "").split("/q/")[1];
  const r = await page.request.post(`${BASE}/api/questionnaire/${qid}/generate`, { headers: O, data: { answers: SAMPLE_HOUSEHOLD, consent: { terms: true, health: true } } });
  return ((await r.json()) as { planId: string }).planId;
}

const open = async (page: Page, testId: string) => page.getByTestId(testId).locator("summary").first().click();

/** Open the questionnaire on screen `step` with the sample household's answers (via the local draft). */
async function questionScreen(page: Page, step: number) {
  await page.goto(`${BASE}/`);
  await page.getByRole("button", { name: "Build my free plan" }).click();
  await page.waitForURL(/\/q\//);
  await page.evaluate(([a, s]) => localStorage.setItem(`rp_q_${location.pathname.split("/q/")[1]}`, JSON.stringify({ ...(a as object), _step: s })), [SAMPLE_HOUSEHOLD, step] as const);
  await page.reload();
}

export const SHOTS: Shot[] = [
  { name: "q-home", run: (p) => questionScreen(p, 5) },
  { name: "q-water-filter", run: async (p) => { await questionScreen(p, 6); await p.getByText("Do you already have a water filter").scrollIntoViewIfNeeded(); } },
  { name: "q-storage", run: (p) => questionScreen(p, 8) },
  { name: "q-evacuation", run: (p) => questionScreen(p, 9) },
  { name: "front", run: async (p) => void (await p.goto(`${BASE}/`)) },
  { name: "front-menu", run: async (p) => { await p.goto(`${BASE}/`); await open(p, "site-menu"); } },
  { name: "sources", run: async (p) => void (await p.goto(`${BASE}/sources`)) },
  { name: "help", run: async (p) => void (await p.goto(`${BASE}/help`)) },
  { name: "plan-top", run: async (p, id) => void (await p.goto(`${BASE}/plan/${id}`)) },
  { name: "plan-share-menu", run: async (p, id) => { await p.goto(`${BASE}/plan/${id}`); await open(p, "share-menu"); } },
  { name: "plan-save-bar", run: async (p, id) => { await p.goto(`${BASE}/plan/${id}#email`); await p.getByTestId("save-bar").scrollIntoViewIfNeeded(); } },
  {
    name: "loading",
    run: async (p) => {
      // Hold the build request so the stages card stays on screen.
      await p.route("**/generate", () => new Promise(() => {}));
      await p.goto(`${BASE}/`);
      await p.getByRole("button", { name: "Build my free plan" }).click();
      await p.waitForURL(/\/q\//);
      await p.evaluate((a) => localStorage.setItem(`rp_q_${location.pathname.split("/q/")[1]}`, JSON.stringify({ ...a, _step: 99 })), SAMPLE_HOUSEHOLD);
      await p.reload();
      await p.getByLabel(/general guidance, not professional advice/).check();
      await p.getByRole("button", { name: /^(Next|Build my plan)$/ }).click();
      await p.getByTestId("build-progress").waitFor();
    },
  },
];

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const shots = SHOTS.filter((s) => !ONLY.length || ONLY.includes(s.name));
  for (const scheme of ["light", "dark"] as const) {
    const ctx = await browser.newContext({ ...devices["iPhone 13"], colorScheme: scheme });
    const page = await ctx.newPage();
    const planId = await makePlan(page);
    for (const s of shots) {
      try {
        await s.run(page, planId);
        await page.waitForTimeout(300);
        await page.screenshot({ path: `${OUT}/${s.name}-${scheme}.png`, fullPage: false });
        console.log(`ok   ${s.name}-${scheme}`);
      } catch (e) {
        console.log(`FAIL ${s.name}-${scheme}: ${(e as Error).message.split("\n")[0]}`);
      }
      await page.unrouteAll({ behavior: "ignoreErrors" });
    }
    await ctx.close();
  }
  await browser.close();
}

if (process.argv[1]?.includes("screens")) void main();
