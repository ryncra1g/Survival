import { chromium, type Page } from "@playwright/test";
import { ALL_SCREENS_HOUSEHOLD, BASE_OFF, BASE_ON, OUT, SCHEMES, VIEWPORTS, ensureDir, mainText, makePlan, measure, newCtx, openQuestion, signIn, writeJson, type Metrics } from "./common";

/**
 * /ux-pass step 1 + 4 (axe): every screen at 375×812 and 768×1024, light and dark.
 *   npx tsx .claude/skills/ux-pass/scripts/capture.ts [only-name ...]
 * Writes <OUT>/screens/<name>-<vp>-<scheme>.png (+ -full.png at 375 light), metrics.json, texts.json.
 */
type Ctx = { page: Page; base: string; planId: string };
type Shot = { name: string; server: "off" | "on"; signedIn?: boolean; expect?: RegExp; run: (c: Ctx) => Promise<void> };

const go = async ({ page, base }: Ctx, path: string) => void (await page.goto(`${base}${path}`));
const openMenu = async (page: Page, testId: string) => page.getByTestId(testId).locator("summary").first().click();
const plan = (c: Ctx, hash = "") => go(c, `/plan/${c.planId}${hash}`);
const scrollTo = async (page: Page, sel: string) => {
  await page.locator(sel).first().scrollIntoViewIfNeeded();
  await page.evaluate((s) => document.querySelector(s)?.scrollIntoView({ block: "start" }), sel);
};

const Q = ["location", "household", "toddlers", "pets", "medical", "home", "heat", "power", "storage", "evacuation", "budget"];
const Q_TITLE: Record<string, RegExp> = {
  location: /Where is home/, household: /Who lives with you/, toddlers: /little ones/, pets: /pets/i, medical: /Medical needs/,
  home: /about your home/, heat: /Heat, cooking/, power: /Power and vehicles/, storage: /^Storage/, evacuation: /If you have to leave/, budget: /Budget and skills/,
};

export const SHOTS: Shot[] = [
  { name: "front", server: "off", run: (c) => go(c, "/") },
  { name: "front-menu", server: "off", run: async (c) => { await go(c, "/"); await openMenu(c.page, "site-menu"); } },
  { name: "start", server: "off", run: (c) => go(c, "/start") },
  { name: "help", server: "off", run: (c) => go(c, "/help") },
  { name: "about", server: "off", run: (c) => go(c, "/about") },
  { name: "sources", server: "off", run: (c) => go(c, "/sources") },
  { name: "terms", server: "off", run: (c) => go(c, "/terms") },
  { name: "privacy", server: "off", run: (c) => go(c, "/privacy") },
  { name: "sample", server: "off", run: (c) => go(c, "/sample") },
  ...Q.map((id, i): Shot => ({ name: `q-${String(i + 1).padStart(2, "0")}-${id}`, server: "off", expect: Q_TITLE[id], run: (c) => openQuestion(c.page, c.base, i) })),
  {
    name: "q-error-zip",
    server: "off",
    run: async (c) => {
      await openQuestion(c.page, c.base, 0, { ...ALL_SCREENS_HOUSEHOLD, zip: "" });
      await c.page.getByRole("button", { name: "Next" }).click();
    },
  },
  {
    name: "loading",
    server: "off",
    run: async (c) => {
      await c.page.route("**/generate", () => new Promise(() => {}));
      await openQuestion(c.page, c.base, 99);
      await c.page.locator("#termsConsent").check();
      if (await c.page.locator("#healthConsent").isVisible()) await c.page.locator("#healthConsent").check();
      await c.page.getByRole("button", { name: "Build my plan" }).click();
      await c.page.getByTestId("build-progress").waitFor();
    },
  },
  {
    // An error state: the plan build fails on the server.
    name: "error-build",
    server: "off",
    run: async (c) => {
      await c.page.route("**/generate", (r) => r.fulfill({ status: 200, contentType: "application/x-ndjson", body: JSON.stringify({ error: "Couldn't build the plan. Try again." }) + "\n" }));
      await openQuestion(c.page, c.base, 99);
      await c.page.locator("#termsConsent").check();
      if (await c.page.locator("#healthConsent").isVisible()) await c.page.locator("#healthConsent").check();
      await c.page.getByRole("button", { name: "Build my plan" }).click();
      // Not getByRole("alert"): Next's route announcer also has that role.
      const msg = c.page.locator("main [role=alert]").first();
      await msg.waitFor();
      await msg.evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 300));
    },
  },
  { name: "plan-top", server: "off", run: (c) => plan(c) },
  {
    // "This week": the dashboard's next steps, scrolled so the list fills the screen.
    name: "plan-this-week",
    server: "off",
    run: async (c) => {
      await plan(c);
      await c.page.getByTestId("dashboard").evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 70));
    },
  },
  { name: "plan-ch-do-now", server: "off", run: async (c) => { await plan(c); await scrollTo(c.page, "#ch-do-now"); } },
  { name: "plan-ch-supplies", server: "off", run: async (c) => { await plan(c); await scrollTo(c.page, "#ch-supplies"); } },
  { name: "plan-ch-power-heat", server: "off", run: async (c) => { await plan(c); await scrollTo(c.page, "#ch-power-heat"); } },
  { name: "plan-ch-people-plans", server: "off", run: async (c) => { await plan(c); await scrollTo(c.page, "#ch-people-plans"); } },
  { name: "plan-card-water-open", server: "off", run: async (c) => { await plan(c, "#water"); await scrollTo(c.page, "details#water"); } },
  { name: "plan-card-evacuation-open", server: "off", run: async (c) => { await plan(c, "#evacuation"); await scrollTo(c.page, "details#evacuation"); } },
  {
    name: "plan-compare",
    server: "off",
    run: async (c) => {
      await plan(c, "#gear");
      const box = c.page.locator("details#gear").getByTestId("compare-options").first();
      await box.getByText("Compare options").first().click();
      await box.scrollIntoViewIfNeeded();
    },
  },
  {
    name: "plan-shopping-list",
    server: "off",
    run: async (c) => {
      await plan(c);
      const list = c.page.getByTestId("dashboard").locator("details").filter({ hasText: "Shopping list" }).first();
      await list.locator("summary").first().click();
      await list.scrollIntoViewIfNeeded();
    },
  },
  { name: "plan-share-menu", server: "off", run: async (c) => { await plan(c); await openMenu(c.page, "share-menu"); await c.page.getByTestId("share-menu").scrollIntoViewIfNeeded(); } },
  { name: "plan-site-menu", server: "off", run: async (c) => { await plan(c); await openMenu(c.page, "site-menu"); } },
  {
    name: "plan-save-bar",
    server: "off",
    run: async (c) => {
      await plan(c);
      const bar = c.page.getByTestId("save-bar");
      await bar.scrollIntoViewIfNeeded();
      const opener = bar.locator("summary, button").first();
      if (await opener.isVisible()) await opener.click();
      await bar.scrollIntoViewIfNeeded();
    },
  },
  { name: "places", server: "off", run: async (c) => { await go(c, `/plan/${c.planId}/places`); await c.page.getByLabel("Address").first().fill("1 Example Road"); } },
  { name: "maintenance", server: "off", run: (c) => go(c, `/plan/${c.planId}/maintenance`) },
  { name: "not-found", server: "off", run: (c) => go(c, "/plan/not-a-real-plan") },
  { name: "account", server: "off", signedIn: true, run: (c) => go(c, "/account") },
  { name: "site-menu-signed-in", server: "off", signedIn: true, run: async (c) => { await go(c, "/"); await openMenu(c.page, "site-menu"); } },
  // Accounts track: test-only server with ACCOUNTS_ENABLED=true DIY_TIPS_ENABLED=true. The real defaults stay off.
  { name: "on-plan-tabs", server: "on", run: (c) => plan(c) },
  { name: "on-plan-food-card", server: "on", run: async (c) => { await plan(c); await c.page.getByTestId("food-mix-card").scrollIntoViewIfNeeded(); } },
  { name: "on-plan-tips", server: "on", run: async (c) => { await plan(c, "#water"); await c.page.locator("details#water").getByTestId("diy-tips").first().scrollIntoViewIfNeeded(); } },
  { name: "on-plan-inventory", server: "on", run: (c) => go(c, `/plan/${c.planId}/inventory`) },
  { name: "on-account-plans", server: "on", signedIn: true, run: (c) => go(c, "/account/plans") },
  { name: "on-account-inventory", server: "on", signedIn: true, run: (c) => go(c, "/account/inventory") },
  { name: "on-account-places", server: "on", signedIn: true, run: (c) => go(c, "/account/places") },
  { name: "on-account-reminders", server: "on", signedIn: true, run: (c) => go(c, "/account/reminders") },
  { name: "on-site-menu-signed-in", server: "on", signedIn: true, run: async (c) => { await go(c, "/"); await openMenu(c.page, "site-menu"); } },
];

async function main() {
  const only = process.argv.slice(2);
  const shots = SHOTS.filter((s) => !only.length || only.includes(s.name));
  ensureDir(`${OUT}/screens`);
  const browser = await chromium.launch();
  const metrics: (Metrics & { name: string; vp: string; scheme: string; error?: string; titleMismatch?: boolean })[] = [];
  const texts: Record<string, string> = {};
  for (const vp of VIEWPORTS) {
    for (const scheme of SCHEMES) {
      for (const server of ["off", "on"] as const) {
        const base = server === "off" ? BASE_OFF : BASE_ON;
        const ctx = await newCtx(browser, vp, scheme);
        const page = await ctx.newPage();
        const { planId } = await makePlan(page, base);
        let signed = false;
        // Signed-out shots first, then sign in once for the rest.
        const mine = shots.filter((s) => s.server === server).sort((a, b) => Number(!!a.signedIn) - Number(!!b.signedIn));
        for (const s of mine) {
          const file = `${OUT}/screens/${s.name}-${vp.name}-${scheme}`;
          try {
            if (s.signedIn && !signed) { await signIn(page, base, planId); signed = true; }
            await s.run({ page, base, planId });
            await page.waitForTimeout(350);
            await page.screenshot({ path: `${file}.png` });
            if (vp.name === "375" && scheme === "light") {
              await page.screenshot({ path: `${file}-full.png`, fullPage: true });
              texts[s.name] = await mainText(page);
            }
            const m = await measure(page);
            const titleMismatch = s.expect ? !s.expect.test(m.title) : undefined;
            metrics.push({ name: s.name, vp: vp.name, scheme, ...m, ...(titleMismatch ? { titleMismatch } : {}) });
            console.log(`ok   ${s.name}-${vp.name}-${scheme}${titleMismatch ? `  (title "${m.title}")` : ""}`);
          } catch (e) {
            const error = (e as Error).message.split("\n")[0];
            metrics.push({ name: s.name, vp: vp.name, scheme, error } as never);
            console.log(`FAIL ${s.name}-${vp.name}-${scheme}: ${error}`);
          }
          await page.unrouteAll({ behavior: "ignoreErrors" });
        }
        await ctx.close();
      }
    }
  }
  await browser.close();
  writeJson("metrics.json", metrics);
  writeJson("texts.json", texts);
  console.log(`${metrics.length} captures, ${metrics.filter((m) => m.error).length} failed → ${OUT}`);
}

void main();
