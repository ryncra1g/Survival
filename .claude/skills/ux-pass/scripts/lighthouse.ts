import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { chromium, type BrowserContext, type Page } from "@playwright/test";
import lighthouse from "lighthouse";
import { ALL_SCREENS_HOUSEHOLD, BASE_OFF, BASE_ON, makePlan, signIn, visitorIp, writeJson } from "./common";

/**
 * /ux-pass step 4 (Lighthouse mobile). Lighthouse audits page loads, so each URL-addressable screen is audited:
 * the public pages, every questionnaire screen (its saved draft sets the step), the plan and its sub-pages,
 * and the account pages (flags-on server). Menus and expanded cards share a URL with their page; axe covers them.
 *   npx tsx .claude/skills/ux-pass/scripts/lighthouse.ts
 * Uses Lighthouse's default mobile emulation (Moto G Power, simulated slow 4G). Writes <OUT>/lighthouse.json.
 *
 * Named pages only, one browser each (e.g. one page per process, nothing else running):
 *   npx tsx .claude/skills/ux-pass/scripts/lighthouse.ts front q-01-location
 * writes <OUT>/lighthouse-<names>.json. Each run uses a free debugging port: a fixed port let a leftover browser from
 * an earlier, interrupted run answer instead, and every page then timed out ("Network.enable timed out").
 */
const ONLY = process.argv.slice(2);
const want = (name: string) => !ONLY.length || ONLY.includes(name);
let PORT = 0;
const freePort = () =>
  new Promise<number>((resolve, reject) => {
    const srv = net.createServer();
    srv.once("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const port = (srv.address() as net.AddressInfo).port;
      srv.close(() => resolve(port));
    });
  });
type Target = { name: string; url: string; before?: (page: Page) => Promise<void> };

async function openBrowser() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ux-lh-"));
  PORT = await freePort();
  const ctx = await chromium.launchPersistentContext(dir, { headless: true, args: [`--remote-debugging-port=${PORT}`], extraHTTPHeaders: { "x-forwarded-for": visitorIp() } });
  return { ctx, dir };
}

async function audit(ctx: BrowserContext, targets: Target[], page: Page) {
  const rows = [];
  for (const t of targets.filter((x) => want(x.name))) {
    try {
      if (t.before) await t.before(page);
      const r = await lighthouse(t.url, { port: PORT, output: "json", logLevel: "error", disableStorageReset: true, onlyCategories: ["performance", "accessibility", "best-practices", "seo"] });
      const lhr = r!.lhr;
      const score = (k: string) => Math.round((lhr.categories[k]?.score ?? 0) * 100);
      const failing = Object.values(lhr.audits)
        .filter((a) => a.score !== null && a.score < 0.9 && a.scoreDisplayMode !== "informative" && a.scoreDisplayMode !== "notApplicable" && a.scoreDisplayMode !== "manual")
        .map((a) => ({ id: a.id, title: a.title, score: a.score, value: a.displayValue ?? "" }));
      const row = {
        name: t.name,
        finalUrl: lhr.finalDisplayedUrl,
        performance: score("performance"), accessibility: score("accessibility"), bestPractices: score("best-practices"), seo: score("seo"),
        lcp: lhr.audits["largest-contentful-paint"]?.displayValue, cls: lhr.audits["cumulative-layout-shift"]?.displayValue, tbt: lhr.audits["total-blocking-time"]?.displayValue,
        failing,
      };
      rows.push(row);
      console.log(`ok   ${t.name.padEnd(22)} perf ${row.performance} a11y ${row.accessibility} bp ${row.bestPractices} seo ${row.seo}`);
    } catch (e) {
      rows.push({ name: t.name, error: (e as Error).message.split("\n")[0] });
      console.log(`FAIL ${t.name}: ${(e as Error).message.split("\n")[0]}`);
    }
  }
  void ctx;
  return rows;
}

async function main() {
  const rows = [];
  // Flags off (the real defaults).
  if (!ONLY.length || ONLY.some((n) => !n.startsWith("on-"))) {
    const { ctx } = await openBrowser();
    const page = ctx.pages()[0] ?? (await ctx.newPage());
    const { planId } = await makePlan(page, BASE_OFF);
    // A fresh questionnaire for the per-step audits.
    await page.goto(`${BASE_OFF}/`);
    await page.getByRole("button", { name: "Build my free plan" }).first().click();
    await page.waitForURL(/\/q\//);
    const q = page.url().split("/q/")[1];
    const step = (n: number) => async (p: Page) => {
      await p.goto(`${BASE_OFF}/q/${q}`);
      await p.evaluate(([a, s, id]) => localStorage.setItem(`rp_q_${id}`, JSON.stringify({ ...(a as object), _step: s })), [ALL_SCREENS_HOUSEHOLD, n, q] as const);
      // Save the draft on the server too, as the app's autosave does: a returning visitor's page renders on their step.
      // (Only writing localStorage measured an offline-only case: step 1 rendered, then a jump to step n, CLS 0.33.)
      await p.request.put(`${BASE_OFF}/api/questionnaire/${q}`, { headers: { origin: BASE_OFF }, data: { answers: { ...ALL_SCREENS_HOUSEHOLD, _step: n } } });
      await p.goto("about:blank");
    };
    const names = ["location", "household", "toddlers", "pets", "medical", "home", "heat", "power", "storage", "evacuation", "budget"];
    const targets: Target[] = [
      ...["/", "/start", "/help", "/about", "/sources", "/terms", "/privacy", "/sample"].map((u) => ({ name: u === "/" ? "front" : u.slice(1), url: `${BASE_OFF}${u}` })),
      ...names.map((n, i) => ({ name: `q-${String(i + 1).padStart(2, "0")}-${n}`, url: `${BASE_OFF}/q/${q}`, before: step(i) })),
      { name: "plan", url: `${BASE_OFF}/plan/${planId}` },
      { name: "places", url: `${BASE_OFF}/plan/${planId}/places` },
      { name: "maintenance", url: `${BASE_OFF}/plan/${planId}/maintenance` },
      { name: "account", url: `${BASE_OFF}/account`, before: (p) => signIn(p, BASE_OFF, planId) },
    ];
    try {
      rows.push(...(await audit(ctx, targets, page)));
    } finally {
      await ctx.close();
    }
  }
  // Test-only server with ACCOUNTS_ENABLED and DIY_TIPS_ENABLED on.
  if (!ONLY.length || ONLY.some((n) => n.startsWith("on-"))) {
    const { ctx } = await openBrowser();
    const page = ctx.pages()[0] ?? (await ctx.newPage());
    const { planId } = await makePlan(page, BASE_ON);
    const targets: Target[] = [
      { name: "on-plan", url: `${BASE_ON}/plan/${planId}` },
      { name: "on-plan-inventory", url: `${BASE_ON}/plan/${planId}/inventory` },
      { name: "on-account-plans", url: `${BASE_ON}/account/plans`, before: (p) => signIn(p, BASE_ON, planId) },
      { name: "on-account-inventory", url: `${BASE_ON}/account/inventory` },
      { name: "on-account-places", url: `${BASE_ON}/account/places` },
      { name: "on-account-reminders", url: `${BASE_ON}/account/reminders` },
    ];
    try {
      rows.push(...(await audit(ctx, targets, page)));
    } finally {
      await ctx.close();
    }
  }
  writeJson(ONLY.length ? `lighthouse-${ONLY.join("+")}.json` : "lighthouse.json", rows);
}

void main();
