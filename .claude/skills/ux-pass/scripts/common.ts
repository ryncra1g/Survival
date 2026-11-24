import fs from "node:fs";
import type { BrowserContext, Page } from "@playwright/test";
import { DEFAULT_ANSWERS, type Answers } from "@/lib/answers/schema";

/**
 * Shared helpers for /ux-pass. Read-only against the app: these scripts only drive a running demo-mode server.
 *   UX_OFF = flags off (the real defaults), UX_ON = test-only server with ACCOUNTS_ENABLED and DIY_TIPS_ENABLED on.
 */
export const BASE_OFF = process.env.UX_OFF || "http://localhost:3300";
export const BASE_ON = process.env.UX_ON || "http://localhost:3301";
export const DATE = process.env.UX_DATE || new Date().toLocaleDateString("en-CA");
export const OUT = `.data/ux/${DATE}`;
export const VIEWPORTS = [
  { name: "375", width: 375, height: 812, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  { name: "768", width: 768, height: 1024, isMobile: true, hasTouch: true, deviceScaleFactor: 1 },
] as const;
export const SCHEMES = ["light", "dark"] as const;

/** Each scripted browser counts as its own visitor, so the app's per-IP limits (30 starts an hour) don't trip. */
export const visitorIp = () => `10.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.${1 + Math.floor(Math.random() * 250)}`;

export const ensureDir = (d: string) => fs.mkdirSync(d, { recursive: true });
export const writeJson = (file: string, v: unknown) => {
  ensureDir(OUT);
  fs.writeFileSync(`${OUT}/${file}`, JSON.stringify(v, null, 2));
};

/** Answers that make every questionnaire screen appear (a toddler, a pet, a powered device). */
export const ALL_SCREENS_HOUSEHOLD: Answers = {
  ...DEFAULT_ANSWERS,
  zip: "43215",
  childrenAges: [2, 7],
  toddlerNeeds: ["diapers"],
  pets: [{ type: "dog", size: "medium", count: 1, specialDiet: false, medications: false }],
  hasPrescriptions: true,
  poweredDevices: ["cpap"],
  hasGarage: true,
  hasYard: true,
  storage: ["garage", "closets"],
  evacuation: { destination: "friends_family", distanceMiles: 50 },
  approach: "family_friends",
};

/** Build a plan through the API (same calls the app makes) and return its id. Sets this context's session cookie. */
export async function makePlan(page: Page, base: string, answers: Answers = ALL_SCREENS_HOUSEHOLD): Promise<{ planId: string; qid: string }> {
  const O = { origin: base };
  const start = await page.request.post(`${base}/api/start`, { headers: O, maxRedirects: 0 });
  const qid = (start.headers()["location"] ?? "").split("/q/")[1];
  const r = await page.request.post(`${base}/api/questionnaire/${qid}/generate`, { headers: O, data: { answers, consent: { terms: true, health: true } } });
  const j = (await r.json()) as { planId?: string; error?: string };
  if (!j.planId) throw new Error(`plan build failed: ${j.error}`);
  return { planId: j.planId, qid };
}

/** Confirm an email for the plan (demo mode returns the magic link), so account pages open. */
export async function signIn(page: Page, base: string, planId: string) {
  const r = await page.request.post(`${base}/api/plans/${planId}/claim`, { headers: { origin: base }, data: { email: `ux-${Date.now()}@example.com`, updates: false } });
  const link = (await r.json()).demoLink as string | undefined;
  if (!link) throw new Error("no demo sign-in link (is the server in demo mode?)");
  await page.goto(link);
}

/** Open the questionnaire at a screen index with a saved local draft. */
export async function openQuestion(page: Page, base: string, step: number, answers: Answers = ALL_SCREENS_HOUSEHOLD) {
  await page.goto(`${base}/`);
  await page.getByRole("button", { name: "Build my free plan" }).first().click();
  await page.waitForURL(/\/q\//);
  await page.evaluate(([a, s]) => localStorage.setItem(`rp_q_${location.pathname.split("/q/")[1]}`, JSON.stringify({ ...(a as object), _step: s })), [answers, step] as const);
  await page.reload();
  await page.locator("h1").first().waitFor();
}

const AXE = fs.readFileSync("node_modules/axe-core/axe.min.js", "utf8");

export interface Metrics {
  url: string;
  title: string;
  overflowX: boolean;
  overflowCulprits: string[];
  smallTargets: { label: string; w: number; h: number }[];
  smallInlineLinks: number;
  primaryButtons: string[];
  firstPrimaryInView: boolean | null;
  docHeight: number;
  viewportHeight: number;
  axe: { id: string; impact: string | null; help: string; nodes: number; sample: string[] }[];
  /** Rules axe checked and passed: proves axe ran when it finds nothing. */
  axePasses?: number;
}

/** Layout and accessibility facts for the page as it is on screen now. */
export async function measure(page: Page, withAxe = true): Promise<Metrics> {
  const m = await page.evaluate(() => {
    const doc = document.documentElement;
    const cw = doc.clientWidth;
    const vis = (e: Element) => {
      const r = e.getBoundingClientRect();
      const s = getComputedStyle(e);
      // checkVisibility catches content inside closed <details> (Chrome keeps boxes for it but doesn't render it).
      const shown = (e as HTMLElement & { checkVisibility?: (o: object) => boolean }).checkVisibility?.({ contentVisibilityAuto: true, opacityProperty: true, visibilityProperty: true }) ?? true;
      return shown && r.width > 1 && r.height > 1 && s.visibility !== "hidden" && s.display !== "none" && !e.closest("[hidden],[aria-hidden=true]");
    };
    const label = (e: Element) => ((e as HTMLElement).innerText || e.getAttribute("aria-label") || e.getAttribute("title") || (e as HTMLInputElement).value || e.id || `${e.tagName.toLowerCase()}.${String((e as HTMLElement).className).split(" ").slice(0, 3).join(".")}`).replace(/\s+/g, " ").trim().slice(0, 60);
    const overflowX = doc.scrollWidth > cw + 1;
    const overflowCulprits = overflowX ? [...document.querySelectorAll("body *")].filter((e) => vis(e) && e.getBoundingClientRect().right > cw + 1).slice(0, 5).map((e) => `${e.tagName.toLowerCase()} "${label(e)}"`) : [];
    const els = [...document.querySelectorAll("a[href], button, input:not([type=hidden]), select, textarea, summary, [role=button]")].filter(vis);
    let smallInlineLinks = 0;
    const smallTargets: { label: string; w: number; h: number }[] = [];
    for (const e of els) {
      // A checkbox or radio inside a label: the label is the tap target.
      const target = e.matches("input[type=checkbox],input[type=radio]") ? e.closest("label") ?? e : e;
      const r = target.getBoundingClientRect();
      if (r.width >= 44 && r.height >= 44) continue;
      const inline = e.tagName === "A" && getComputedStyle(e).display === "inline" && !!e.closest("p,li,dd,td");
      if (inline) smallInlineLinks++;
      else smallTargets.push({ label: label(e), w: Math.round(r.width), h: Math.round(r.height) });
    }
    const primaries = [...document.querySelectorAll(".btn")].filter(vis);
    const first = primaries[0]?.getBoundingClientRect();
    return {
      url: location.pathname + location.hash,
      title: (document.querySelector("main h1, h1")?.textContent ?? document.title).trim(),
      overflowX,
      overflowCulprits,
      smallTargets,
      smallInlineLinks,
      primaryButtons: primaries.map(label),
      firstPrimaryInView: first ? first.top >= 0 && first.bottom <= innerHeight : null,
      docHeight: doc.scrollHeight,
      viewportHeight: innerHeight,
    };
  });
  let axe: Metrics["axe"] = [];
  let axePasses: number | undefined;
  if (withAxe) {
    await page.evaluate(AXE);
    const res = await page.evaluate(async () => {
      const w = window as unknown as { axe: { run: (c: unknown, o: unknown) => Promise<{ passes: unknown[]; violations: { id: string; impact: string | null; help: string; nodes: { target: string[] }[] }[] }> } };
      const r = await w.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"] } });
      return { passes: r.passes.length, violations: r.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.length, sample: v.nodes.slice(0, 3).map((n) => n.target.join(" ")) })) };
    });
    axe = res.violations;
    axePasses = res.passes;
  }
  return { ...m, axe, axePasses };
}

/** Visible text of the main region, for the copy checks. */
export const mainText = (page: Page) => page.evaluate(() => (document.querySelector("main") ?? document.body).innerText);

export async function newCtx(browser: { newContext: (o: object) => Promise<BrowserContext> }, vp: (typeof VIEWPORTS)[number], scheme: "light" | "dark") {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: vp.isMobile, hasTouch: vp.hasTouch, deviceScaleFactor: vp.deviceScaleFactor, colorScheme: scheme, bypassCSP: true, extraHTTPHeaders: { "x-forwarded-for": visitorIp() }, userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1 ux-pass" });
  // tsx (esbuild keepNames) wraps named functions inside page.evaluate in __name(); give the page a no-op one.
  await ctx.addInitScript({ content: "globalThis.__name = globalThis.__name || ((f) => f);" });
  return ctx;
}
