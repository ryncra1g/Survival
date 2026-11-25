import { expect, test, type Page } from "@playwright/test";
import { SAMPLE_HOUSEHOLD as SAMPLE } from "../lib/plan/sample";

/**
 * docs/DESIGN.md, checked on rendered screens (phone viewport):
 * - C5: at most one primary (amber .btn) button visible on a screen, at any scroll position.
 * - C3: red (the --danger color) appears only inside safety warnings (marked data-safety).
 * tests/design.test.ts checks the source; /ux-pass re-scores every screen by eye.
 */
const O = { Origin: "http://localhost:3100" };

async function amberButtons(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>(".btn")]
      // Visible only: the skip link is a .btn too, but sr-only (1px) until it gets keyboard focus.
      .filter((el) => el.classList.contains("btn") && el.checkVisibility({ visibilityProperty: true }) && el.getBoundingClientRect().width > 2)
      .map((el) => el.innerText.trim()),
  );
}

async function redOutsideSafety(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const probe = document.createElement("span");
    probe.style.color = "var(--danger)";
    document.body.appendChild(probe);
    const red = getComputedStyle(probe).color;
    probe.remove();
    const out: string[] = [];
    for (const el of document.querySelectorAll<HTMLElement>("body *")) {
      if (el.offsetParent === null) continue;
      const cs = getComputedStyle(el);
      const uses = [cs.color, cs.borderLeftColor, cs.borderTopColor, cs.backgroundColor].includes(red);
      if (uses && !el.closest("[data-safety]")) out.push(`${el.tagName.toLowerCase()}: ${el.innerText.trim().slice(0, 60)}`);
    }
    return out;
  });
}

async function check(page: Page, name: string) {
  const amber = await amberButtons(page);
  expect(amber.length, `${name}: amber buttons ${JSON.stringify(amber)}`).toBeLessThanOrEqual(1);
  expect(await redOutsideSafety(page), `${name}: red outside a safety warning`).toEqual([]);
}

async function newPlan(page: Page): Promise<string> {
  await page.goto("/");
  await page.getByRole("button", { name: "Build my free plan" }).click();
  await expect(page).toHaveURL(/\/q\//);
  const id = page.url().split("/q/")[1];
  const r = await page.request.post(`/api/questionnaire/${id}/generate`, { data: { answers: SAMPLE, consent: { terms: true, health: true } }, headers: O });
  return (await r.json()).planId;
}

test("design: one amber button, red only for safety, on every public screen", async ({ page }) => {
  for (const path of ["/", "/start", "/help", "/about", "/sources", "/terms", "/privacy", "/sample", "/plan/00000000-0000-4000-8000-000000000000"]) {
    await page.goto(path);
    await check(page, path);
  }
});

test("design: the questionnaire, the plan and its error and empty states", async ({ page }) => {
  // First question, then the ZIP error.
  await page.goto("/");
  await page.getByRole("button", { name: "Build my free plan" }).click();
  await page.locator("main h1").first().waitFor();
  await check(page, "first question");
  await page.locator("#zip").fill("123");
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.locator("#zip-error")).toHaveText("That's 3 digits. A ZIP code has 5, like 43215.");
  await expect(page.locator("#zip")).toHaveAttribute("aria-invalid", "true");
  await check(page, "ZIP error");
  // DA-6: Back on the first screen goes to the front page.
  await page.getByRole("link", { name: "Back" }).click();
  await expect(page).toHaveURL(/\/$/);

  // The plan, scrolled through: one amber button at every point, red only in safety callouts.
  const planId = await newPlan(page);
  await page.goto(`/plan/${planId}`);
  await expect(page.getByTestId("reassurance")).toBeVisible();
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < height; y += 700) {
    await page.evaluate((top) => window.scrollTo(0, top), y);
    const amber = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>(".btn")].filter((el) => {
        const r = el.getBoundingClientRect();
        // checkVisibility: closed <details> content keeps its layout in Chromium but isn't drawn.
        return el.checkVisibility({ visibilityProperty: true }) && r.width > 2 && r.bottom > 0 && r.top < innerHeight;
      }).map((el) => el.innerText.trim()),
    );
    expect(amber.length, `plan at y=${y}: ${JSON.stringify(amber)}`).toBeLessThanOrEqual(1);
  }
  // Open every section so every callout and "Don't do this" list is on screen for the color check.
  await page.evaluate(() => document.querySelectorAll("main details").forEach((d) => ((d as HTMLDetailsElement).open = true)));
  expect(await redOutsideSafety(page), "plan: red outside a safety warning").toEqual([]);
  expect(await page.locator("[data-safety]").count()).toBeGreaterThan(0);
});
