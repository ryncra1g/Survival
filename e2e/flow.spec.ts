import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs";

const SAMPLE = JSON.parse(fs.readFileSync("samples/sample-answers.json", "utf8"));
const O = { origin: "http://localhost:3100" };

async function pick(page: Page, name: string | RegExp) {
  await page.getByRole("button", { name, exact: typeof name === "string" }).first().click();
}
const next = (page: Page) => page.getByRole("button", { name: /^(Next|Build my plan)$/ }).click();

/** Start a plan from the front page and build it via the API (same cookies). Returns the plan id. */
async function quickPlan(page: Page): Promise<string> {
  await page.goto("/");
  await page.getByRole("button", { name: "Build my free plan" }).click();
  await expect(page).toHaveURL(/\/q\//);
  const id = page.url().split("/q/")[1];
  const r = await page.request.post(`/api/questionnaire/${id}/generate`, { data: { answers: SAMPLE, consent: { terms: true, health: true } }, headers: O });
  expect(r.status()).toBe(200);
  return (await r.json()).planId;
}
test("API: no plan without the Terms box, or without health consent for health answers", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Build my free plan" }).click();
  await expect(page).toHaveURL(/\/q\//);
  const id = page.url().split("/q/")[1];
  const url = `/api/questionnaire/${id}/generate`;
  expect((await page.request.post(url, { data: { answers: SAMPLE }, headers: O })).status()).toBe(400);
  const health = { ...SAMPLE, hasPrescriptions: true };
  expect((await page.request.post(url, { data: { answers: health, consent: { terms: true } }, headers: O })).status()).toBe(400);
  expect((await page.request.post(url, { data: { answers: health, consent: { terms: true, health: true } }, headers: O })).status()).toBe(200);
});

/** Plan + optional email. Returns the demo-mode confirmation link. */
async function quickSignup(page: Page, email: string, updates = true): Promise<string> {
  const planId = await quickPlan(page);
  const r = await page.request.post(`/api/plans/${planId}/claim`, { data: { email, updates }, headers: O });
  expect(r.status()).toBe(200);
  return (await r.json()).demoLink;
}

test("phone: no sign-up → plan → optional email → confirm → email + PDFs → edit → export → delete", async ({ page, request }) => {
  const started = Date.now();
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Get what you need. Know what to do.");
  await expect(page.getByLabel("Your email")).toHaveCount(0); // no email up front
  await expect(page.getByTestId("chapter-cards").locator(":scope > li")).toHaveCount(4);
  await expect(page.getByRole("link", { name: "See a sample plan" })).toHaveAttribute("href", "/sample");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await page.getByRole("button", { name: "Build my free plan" }).click();
  await expect(page).toHaveURL(/\/q\//);

  await page.getByLabel("ZIP code").fill("11746");
  await expect(page.getByText(/Your area:.*Long Island, NY/)).toBeVisible();
  await expect(page.getByText(/Your plan will cover: Hurricanes \(high\), Flooding \(high\), Winter storms \(moderate\)/)).toBeVisible();
  await pick(page, /^90 days/);
  await next(page);
  await page.getByLabel("Add a child age").selectOption("2");
  await page.getByLabel("Add a child age").selectOption("4");
  await next(page);
  await pick(page, "Diapers");
  await next(page);
  await pick(page, "+ Add a pet");
  await next(page);
  await next(page);
  await pick(page, "Basement / lower level");
  await pick(page, "Garage");
  await pick(page, "Yard");
  await next(page);
  await expect(page.getByRole("heading", { name: "Heat, cooking and water" })).toBeVisible();
  await next(page);
  await pick(page, "+ Gasoline");
  await next(page);
  await pick(page, "Garage");
  await pick(page, "Raw land");
  await pick(page, "~120 mi");
  await next(page);
  await pick(page, "$1,500–5,000");
  await page.getByRole("button", { name: "Back" }).click();
  await expect(page.getByRole("button", { name: "Raw land" })).toHaveAttribute("aria-pressed", "true");
  await next(page);
  await expect(page.getByText("54 gal")).toBeVisible();
  // Clickwrap: the plan isn't built until the Terms box is ticked
  await next(page);
  await expect(page.getByText("Please tick the box to agree to the Terms of Use")).toBeVisible();
  await expect(page).toHaveURL(/\/q\//);
  await page.getByLabel(/general guidance, not professional advice/).check();
  await next(page);

  await expect(page).toHaveURL(/\/plan\//, { timeout: 60_000 });
  const planUrl = page.url();
  expect(Date.now() - started).toBeLessThan(5 * 60_000);
  expect(planUrl).not.toMatch(/11746|zip|answers/);
  // Dashboard first: this week's progress, Next up (with why + Buy), key numbers, shopping list
  const dash = page.getByTestId("dashboard");
  await expect(dash.getByTestId("stage-progress")).toHaveText(/^0 of \d+ done$/);
  await expect(dash.getByRole("heading", { name: "Next up" })).toBeVisible();
  await expect(dash.getByText(/^Test or install CO alarms/)).toBeVisible();
  await expect(dash.getByText("water to store")).toBeVisible();
  await expect(dash.getByText(/gal\/day × \d+ days/)).toBeVisible();
  // No affiliate tag set yet: Buy links still show (plain store search), but no commission disclosure
  await expect(dash.getByRole("link", { name: /^Buy carbon monoxide alarm/ })).toBeVisible();
  await expect(page.getByTestId("affiliate-disclosure")).toHaveCount(0);

  // Ticking a Next-up step shows Undo, counts toward this week, and the next step moves up
  await dash.getByRole("checkbox", { name: /^Done: Test or install CO alarms/ }).check();
  await expect(dash.getByRole("button", { name: "Undo" })).toBeVisible();
  await expect(dash.getByTestId("stage-progress")).toHaveText(/^1 of \d+ done$/);

  // Shopping list: "I have this" ticks persist and remove that item's Buy buttons
  await dash.getByText("Shopping list").click();
  const gearTotal = await dash.locator("#shopping").getByRole("checkbox").count();
  await dash.getByRole("checkbox", { name: "I have: Carbon monoxide alarm" }).check();
  await expect(dash.getByTestId("overall-progress")).toContainText(`you have 1 of ${gearTotal} gear items`);
  await expect(page.getByRole("link", { name: /^Buy carbon monoxide alarm/ })).toHaveCount(0);
  await page.waitForTimeout(800);
  await page.reload();
  await expect(page.getByTestId("dashboard").getByTestId("overall-progress")).toContainText(`you have 1 of ${gearTotal} gear items`);
  await expect(page.getByTestId("dashboard").getByTestId("stage-progress")).toHaveText(/^1 of \d+ done$/);

  // The plan below is a short index: every section collapsed to title + summary until opened
  await expect(page.locator("details[data-section][open]")).toHaveCount(0);
  await expect(page.getByText(/Store 54 gallons \(14 days\)/)).toBeVisible();
  await expect(page.getByRole("heading", { name: /Your area's hazards/ })).toBeVisible();
  await page.getByTestId("dashboard").getByRole("link", { name: /See every step/ }).click();
  await expect(page.locator("details#priorities")).toHaveAttribute("open", "");
  const nav = page.getByRole("navigation", { name: "Plan sections" });
  await nav.getByRole("link", { name: "Supplies" }).click();
  await expect(nav.getByRole("link", { name: "Supplies" })).toHaveAttribute("aria-current", "true");
  await page.locator("#ch-supplies").getByRole("link", { name: "Gear", exact: true }).click();
  await expect(page.locator("details#gear")).toHaveAttribute("open", "");

  // Ticks are saved to the plan, not just this browser (the dashboard tick above shows in the full list too)
  await page.locator("details#priorities").evaluate((d) => ((d as HTMLDetailsElement).open = true));
  await expect(page.locator("details#priorities input[type=checkbox]").first()).toBeChecked();
  await page.locator("details#priorities input[type=checkbox]").nth(1).check();
  await expect(page.locator("details#priorities").getByText(/^2 of \d+ done/).first()).toBeVisible();
  await page.waitForTimeout(800);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.locator("details#priorities").evaluate((d) => ((d as HTMLDetailsElement).open = true));
  await expect(page.locator("details#priorities input[type=checkbox]").nth(1)).toBeChecked();

  // Change one answer without redoing the questionnaire
  await page.getByText("Something not right? Change an answer").click();
  await page.getByRole("button", { name: "Household", exact: true }).click();
  await expect(page).toHaveURL(/\/q\//);
  await expect(page.getByRole("heading", { name: "Who lives with you?" })).toBeVisible();
  await page.getByRole("button", { name: "More adults" }).click();
  await page.getByLabel(/general guidance, not professional advice/).check();
  await page.getByRole("button", { name: "Update my plan" }).click();
  await expect(page).toHaveURL(/\/plan\//, { timeout: 60_000 });
  await expect(page.getByText(/^5 people · Long Island/)).toBeVisible();
  await page.goto(planUrl);

  // PDFs work without an email
  for (const p of ["pdf", "checklist"]) {
    const r = await page.request.get(planUrl.replace("/plan/", "/api/plans/") + "/" + p);
    expect((await r.body()).subarray(0, 4).toString()).toBe("%PDF");
  }
  expect((await request.get(planUrl)).status()).toBe(404); // another browser can't see it

  // Share menu: PDF, fridge checklist, print, email
  const share = page.getByTestId("share-menu");
  await share.locator("summary").click();
  await expect(share.getByRole("link", { name: "Download PDF" })).toHaveAttribute("href", /\/pdf$/);
  await expect(share.getByRole("link", { name: "Fridge checklist" })).toHaveAttribute("href", /\/checklist$/);
  await expect(share.getByRole("button", { name: "Print" })).toBeVisible();
  // One slim save bar instead of the big email box; it says where the plan is saved.
  await expect(page.getByTestId("save-bar")).toHaveCount(1);
  await expect(page.getByTestId("save-bar")).toContainText("Saved on this device for 30 days. Confirm your email to keep it and use it on any device.");
  await expect(page.locator("form", { has: page.getByRole("heading", { name: "Email me my plan" }) })).toHaveCount(1);
  await share.getByRole("link", { name: "Email me my plan" }).click();

  // Optional email: typo check, then confirm flow
  const box = page.locator("form", { has: page.getByRole("heading", { name: "Email me my plan" }) }).first();
  await expect(box).toBeVisible();
  await box.getByPlaceholder("you@example.com").fill("family@gmial.com");
  await box.getByRole("button", { name: "Email my plan" }).click();
  await expect(box.getByText("Did you mean")).toBeVisible();
  await box.getByRole("button", { name: "family@gmail.com" }).click();
  await box.getByPlaceholder("you@example.com").fill("family@example.com");
  await expect(box.getByRole("checkbox")).not.toBeChecked(); // marketing is opt-in
  await box.getByRole("checkbox").check();
  await box.getByRole("button", { name: "Email my plan" }).click();
  await expect(page.getByText(/Almost there: check your inbox/)).toBeVisible();
  const link = await page.getByRole("link", { name: "open the confirmation link" }).getAttribute("href");

  await page.goto(link!);
  await expect(page).toHaveURL(/\/plan\/.*emailed=1/);
  await expect(page.getByText(/on their way to family@example.com/)).toBeVisible();
  await expect.poll(() => fs.readdirSync(".data/e2e/outbox").some((f) => f.endsWith("fridge-checklist.pdf"))).toBe(true);
  // The plan PDF itself, not just the fridge checklist.
  expect(fs.readdirSync(".data/e2e/outbox").some((f) => f.endsWith(".pdf") && !f.endsWith("fridge-checklist.pdf"))).toBe(true);
  await page.goto(link!);
  await expect(page).toHaveURL(/link=expired/);

  await page.goto("/account");
  await expect(page.getByText("family@example.com")).toBeVisible();
  await page.getByRole("button", { name: "Edit answers & regenerate" }).click();
  await expect(page).toHaveURL(/\/q\//);
  await expect(page.getByLabel("ZIP code")).toHaveValue("11746");

  await page.goto("/account");
  const data = await (await page.request.get("/api/account/export")).json();
  expect(data.user.email).toBe("family@example.com");
  expect(data.user.followups_opt_in).toBe(true);
  expect(data.plans.length).toBeGreaterThan(0);
  await page.getByRole("button", { name: "Delete my data" }).click();
  await page.getByRole("button", { name: "Yes, delete everything" }).click();
  await expect(page).toHaveURL(/deleted=1/);
  expect((await page.request.get(planUrl)).status()).toBe(404);
});

test("cron requires the secret and the admin area is hidden", async ({ request }) => {
  expect((await request.get("/api/cron/emails")).status()).toBe(401);
  expect((await request.get("/api/cron/emails", { headers: { authorization: "Bearer test-cron" } })).status()).toBe(200);
  expect((await request.get("/admin")).status()).toBe(404);
});

test("bad origin and honeypot are rejected; unchecked updates stays opted out", async ({ page }) => {
  expect((await page.request.post("/api/start", { headers: { origin: "https://evil.example" } })).status()).toBe(403);
  const planId = await quickPlan(page);
  expect((await page.request.post(`/api/plans/${planId}/claim`, { data: { email: "x@example.com", website: "spam" }, headers: O })).status()).toBe(400);
  expect((await page.request.post(`/api/plans/${planId}/claim`, { data: { email: "nope" }, headers: O })).status()).toBe(400);
  expect((await page.request.post(`/api/plans/${planId}/claim`, { data: { email: "quiet@example.com" }, headers: O })).status()).toBe(200);
});

test("front page works without JavaScript", async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto("/");
  await page.getByRole("button", { name: "Build my free plan" }).click();
  await expect(page).toHaveURL(/\/q\//);
  await ctx.close();
});

test("admin: dashboard, catalog, rule constants, affiliate tag → tracked Buy clicks", async ({ page }) => {
  const link = await quickSignup(page, "admin@example.com");
  await page.goto(link);
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Admin" })).toBeVisible();
  await expect(page.getByText("Email capture")).toBeVisible();

  await page.goto("/admin/catalog");
  await expect(page.getByText("Carbon monoxide alarm")).toBeVisible();

  await page.goto("/admin/rules");
  await page.getByLabel(/Overrides/).fill('{ "water": { "adultGalPerDay": -5 } }');
  await page.getByRole("button", { name: /Validate & save/ }).click();
  await expect(page.getByText(/Invalid constants/)).toBeVisible();
  await page.getByLabel(/Overrides/).fill('{ "water": { "adultGalPerDay": 1.25 } }');
  await page.getByRole("button", { name: /Validate & save/ }).click();
  await expect(page.getByText(/Saved as version/)).toBeVisible();

  // Affiliate tag on → new plans get Buy buttons that go through /go and are counted
  await page.goto("/admin");
  await page.getByLabel("Amazon Associates tag").fill("mysite-20");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText(/New plans show Buy buttons/)).toBeVisible();
  const planId = await quickPlan(page);
  await page.goto(`/plan/${planId}`);
  await expect(page.getByText(/Affiliate disclosure/).first()).toBeVisible();
  const buy = page.getByTestId("dashboard").getByRole("link", { name: /^Buy carbon monoxide alarm/ });
  await expect(buy).toHaveAttribute("rel", /sponsored/);
  const href = await buy.getAttribute("href");
  const r = await page.request.get(href!, { maxRedirects: 0 });
  expect(r.status()).toBe(302);
  expect(r.headers()["location"]).toMatch(/^https:\/\/www\.amazon\.com\/s\?k=Kidde.*tag=mysite-20$/);
  expect((await page.request.get("/go/not-an-item", { maxRedirects: 0 })).headers()["location"]).toMatch(/localhost:3100\/$/);
  await page.goto("/admin");
  await expect(page.getByText("Carbon monoxide alarm — 1")).toBeVisible();

  // reset so other runs start from defaults
  await page.request.post("/api/admin/rules", { data: { overrides: {} }, headers: O });
});

test("sample plan is public", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "See a sample plan" }).click();
  await expect(page).toHaveURL(/\/sample/);
  await expect(page.getByText(/Store 54 gallons \(14 days\)/)).toBeVisible();
});

test("unconfirmed emails with a plan get exactly one reminder", async ({ page, request }) => {
  await quickSignup(page, "forgetful@example.com");
  const file = ".data/e2e/db.json";
  const db = JSON.parse(fs.readFileSync(file, "utf8"));
  const u = db.users.find((x: { email: string }) => x.email === "forgetful@example.com");
  u.created_at = new Date(Date.now() - 2 * 86_400_000).toISOString();
  fs.writeFileSync(file, JSON.stringify(db));
  const auth = { headers: { authorization: "Bearer test-cron" } };
  expect((await (await request.get("/api/cron/emails", auth)).json()).sent.confirm_reminder).toBe(1);
  expect((await (await request.get("/api/cron/emails", auth)).json()).sent.confirm_reminder).toBeUndefined();
});

test("à la carte: switch a gear item's level from the plan", async ({ page }) => {
  const planId = await quickPlan(page);
  await page.goto(`/plan/${planId}#gear`);
  const gear = page.locator("details#gear");
  await expect(gear).toHaveAttribute("open", "");
  const premiumWater = gear.getByRole("button", { name: /Switch to Premium: Stackable water bricks/ });
  await premiumWater.click();
  await expect(page).toHaveURL(/\/plan\/[0-9a-f-]{36}#gear/);
  expect(page.url()).not.toContain(planId);
  await expect(page.locator("details#gear").getByText("Stackable water bricks").first()).toBeVisible();
  await expect(page.locator("details#gear [aria-current=true]").filter({ hasText: "Premium" }).first()).toBeVisible();
});
