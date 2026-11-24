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
  // D5: storage offers only the spaces this home has (basement + garage, no shed), plus indoor options
  await expect(page.getByRole("heading", { name: "Storage" })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Shed/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^No suitable storage/ })).toBeVisible();
  await pick(page, "Garage");
  await next(page);
  // D4 / UX-5: preferred approach; a place answer fills in where they'd go, so only "which one" and the distance are left
  await expect(page.getByRole("heading", { name: "If you have to leave" })).toBeVisible();
  await pick(page, "Stay home when it's safe");
  await expect(page.getByRole("group", { name: "If officials told you to leave, where could you go?" })).toBeVisible();
  await pick(page, "Go to another place I own");
  await expect(page.getByRole("group", { name: "If officials told you to leave, where could you go?" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^A second home or cabin/ })).toHaveAttribute("aria-pressed", "true");
  await pick(page, /^Land with no buildings/);
  await pick(page, "~120 mi");
  await next(page);
  await pick(page, "$1,500–5,000");
  await page.getByRole("button", { name: "Back" }).click();
  await expect(page.getByRole("button", { name: /^Land with no buildings/ })).toHaveAttribute("aria-pressed", "true");
  await next(page);
  await expect(page.getByText("54 gal")).toBeVisible();
  // Clickwrap: the plan isn't built until the Terms box is ticked
  await next(page);
  await expect(page.getByText("Please tick the box to agree to the Terms of Use")).toBeVisible();
  await expect(page).toHaveURL(/\/q\//);
  // UX-4: the unticked box is scrolled into view above the sticky bar, focused, with its message beside it
  await expect(page.locator("#termsConsent")).toBeFocused();
  await expect(page.locator("#termsConsent")).toHaveAttribute("aria-describedby", "termsConsent-error");
  await expect(page.locator("#termsConsent-error")).toHaveText(/Terms of Use/);
  const termsBox = (await page.locator("label[for=termsConsent]").boundingBox())!;
  const buildBar = (await page.getByRole("button", { name: "Build my plan" }).boundingBox())!;
  expect(termsBox.y).toBeGreaterThanOrEqual(0);
  expect(termsBox.y + termsBox.height).toBeLessThanOrEqual(buildBar.y);
  await page.getByLabel(/general guidance, not professional advice/).check();
  const qid = page.url().split("/q/")[1];
  await next(page);

  await expect(page).toHaveURL(/\/plan\//, { timeout: 60_000 });
  const planUrl = page.url();
  // D11: the build streams its three real stages in order, then the plan id.
  const streamed = await page.request.post(`/api/questionnaire/${qid}/generate`, {
    headers: { Accept: "application/x-ndjson", Origin: new URL(planUrl).origin },
    data: { consent: { terms: true } },
  });
  expect(streamed.headers()["content-type"]).toContain("application/x-ndjson");
  const lines = (await streamed.text()).trim().split("\n").map((l) => JSON.parse(l));
  expect(lines.map((l) => l.stage ?? (l.planId ? "plan" : l.error))).toEqual(["hazards", "quantities", "steps", "plan"]);
  expect(Date.now() - started).toBeLessThan(5 * 60_000);
  expect(planUrl).not.toMatch(/11746|zip|answers/);
  // Dashboard first: this week's progress, Next up (with why + Buy), key numbers, shopping list
  const dash = page.getByTestId("dashboard");
  await expect(dash.getByTestId("stage-progress")).toHaveText(/^0 of \d+ done$/);
  // UX-6: one step count on screen (this stage's To do items); no whole-plan or "steps left" count
  const dashText = await dash.innerText();
  expect(dashText.match(/\d+ of \d+ (done|steps)|\(\d+ left\)/g)).toEqual([expect.stringMatching(/^0 of \d+ done$/)]);
  expect(dashText).not.toContain("Whole plan");
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

  // D10: the plan below is a card grid per chapter (2 across on a phone), each card with its key number
  await expect(page.locator("details[data-section][open]")).toHaveCount(0);
  await expect(page.locator("details#water").getByTestId("card-key")).toContainText("54 gal");
  await expect(page.locator("details#water").getByTestId("card-key")).toContainText("water to store");
  await expect(page.getByRole("heading", { name: /Your area's hazards/ })).toBeVisible();
  const cols = await page.getByTestId("section-cards").first().evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(" ").length);
  expect(cols).toBe(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  // D8: content kinds are labelled
  await page.locator("details#water > summary").click();
  await expect(page.locator("details#water [data-kind]").first()).toBeVisible();
  const waterBox = await page.locator("details#water").boundingBox();
  expect(waterBox!.width).toBeGreaterThan(300); // an opened card spans the full row
  await page.locator("details#water > summary").click();
  await page.getByTestId("dashboard").getByRole("link", { name: /full priority list/ }).click();
  await expect(page.locator("details#priorities")).toHaveAttribute("open", "");
  const nav = page.getByRole("navigation", { name: "Plan sections" });
  await nav.getByRole("link", { name: "Supplies" }).click();
  await expect(nav.getByRole("link", { name: "Supplies" })).toHaveAttribute("aria-current", "true");
  await page.locator("details#gear > summary").click();
  await expect(page.locator("details#gear")).toHaveAttribute("open", "");
  await page.goto(`${planUrl}#water`); // a link to a section opens its card
  await expect(page.locator("details#water")).toHaveAttribute("open", "");

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
  await expect(page.locator("form:has(input[type=email])")).toHaveCount(1); // one email entry point
  await share.getByRole("link", { name: "Save my plan" }).click();

  // Optional email: typo check, then confirm flow
  const box = page.locator("form", { has: page.getByRole("heading", { name: "Save my plan" }) }).first();
  await expect(box).toBeVisible();
  await box.getByPlaceholder("you@example.com").fill("family@gmial.com");
  await box.getByRole("button", { name: "Save my plan" }).click();
  await expect(box.getByText("Did you mean")).toBeVisible();
  await box.getByRole("button", { name: "family@gmail.com" }).click();
  await box.getByPlaceholder("you@example.com").fill("family@example.com");
  await expect(box.getByRole("checkbox")).not.toBeChecked(); // marketing is opt-in
  await box.getByRole("checkbox").check();
  await box.getByRole("button", { name: "Save my plan" }).click();
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

  // D12b / D13: Copy for your AI assistant copies the summary and is counted on the admin dashboard
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto(`/plan/${planId}`);
  await page.getByTestId("share-menu").locator("summary").click();
  await page.getByTestId("share-menu").getByRole("button", { name: "Copy for your AI assistant" }).click();
  await expect(page.getByTestId("stay-ready").getByRole("button", { name: "Copy for your AI assistant" })).toBeVisible(); // also next to Add to my calendar
  await expect(page.getByText("Copied. Paste it into your AI assistant to get started.")).toBeVisible();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toContain("Use these amounts exactly; don't recalculate them.");
  expect(copied).not.toMatch(/\b\d{5}\b/);
  await page.goto("/admin");
  await expect(page.getByTestId("stat-Copy for AI").getByTestId("stat-value")).toHaveText("1");

  // reset so other runs start from defaults
  await page.request.post("/api/admin/rules", { data: { overrides: {} }, headers: O });
});

test("sample plan is public", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "See a sample plan" }).click();
  await expect(page).toHaveURL(/\/sample/);
  await expect(page.locator("details#water").getByTestId("card-key")).toContainText("54 gal");
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
  // D3: each slot shows its main pick; "Compare options" lists Lower-cost / Upgrade with the difference and new total
  const water = gear.getByTestId("compare-options").filter({ hasText: "7-gallon" }).first();
  await water.getByText("Compare options").click();
  await expect(water.getByText("Upgrade", { exact: true })).toBeVisible();
  await expect(water.getByText(/new total \$/).first()).toBeVisible();
  const premiumWater = water.getByRole("button", { name: /Switch to Premium: Stackable water bricks/ });
  await premiumWater.click();
  await expect(page).toHaveURL(/\/plan\/[0-9a-f-]{36}#gear/);
  expect(page.url()).not.toContain(planId);
  await expect(page.locator("details#gear").getByText("Stackable water bricks").first()).toBeVisible();
  await expect(page.locator("details#gear [aria-current=true]").filter({ hasText: "Premium" }).first()).toBeVisible();
});

test("site menu (D9): visitor items on a phone, and every page it links to exists", async ({ page }) => {
  await page.goto("/");
  const menu = page.getByTestId("site-menu");
  await menu.locator("summary").click();
  const nav = menu.getByRole("navigation", { name: "Site menu" });
  for (const label of ["Sign in", "Help", "About", "Sources & safety", "Terms", "Privacy"]) await expect(nav.getByRole("link", { name: label })).toBeVisible();
  await expect(nav.getByRole("link", { name: "My places" })).toHaveCount(0); // accounts track is off
  await page.keyboard.press("Escape");
  await expect(nav).toBeHidden();
  for (const p of ["/help", "/about", "/sources"]) expect((await page.request.get(p)).status()).toBe(200);
  await page.goto("/sources");
  await expect(page.getByRole("heading", { name: "Sources & safety" })).toBeVisible();
});

test("D4 places page: the typed address is printed but never sent anywhere", async ({ page }) => {
  const planId = await quickPlan(page);
  await page.goto(`/plan/${planId}#evacuation`);
  await expect(page.locator("details#evacuation")).toContainText("Official evacuation orders override this plan.");
  await page.locator("details#evacuation").getByRole("link", { name: /Add your backup destination/ }).click();
  await expect(page).toHaveURL(new RegExp(`/plan/${planId}/places$`));
  const SENTINEL = "742 Evergreen Terrace Testville";
  const sent: string[] = [];
  page.on("request", (r) => sent.push(r.url() + " " + (r.postData() ?? "")));
  await page.getByLabel("Address").fill(SENTINEL);
  await page.getByLabel("Place").fill("Aunt test house");
  await expect(page.getByText("This isn't saved. Print this page or write it down.")).toBeVisible();
  await expect(page.getByTestId("places-form")).not.toContainText("Confirm your email");
  await expect(page.getByRole("link", { name: "Directions (Apple Maps)" })).toHaveAttribute("href", /maps\.apple\.com/);
  await page.emulateMedia({ media: "print" });
  await expect(page.getByTestId("places-print")).toContainText(SENTINEL);
  await page.emulateMedia({ media: "screen" });
  await page.waitForTimeout(500);
  expect(sent.some((s) => s.includes("Evergreen") || s.includes("742%20Evergreen"))).toBe(false);
});

test("D12: Add to my calendar downloads a .ics; the maintenance list prints", async ({ page }) => {
  const planId = await quickPlan(page);
  await page.goto(`/plan/${planId}`);
  await expect(page.getByTestId("stay-ready").getByRole("link", { name: "Add to my calendar" })).toBeVisible();
  const r = await page.request.get(`/api/plans/${planId}/calendar`);
  expect(r.status()).toBe(200);
  expect(r.headers()["content-type"]).toContain("text/calendar");
  expect(await r.text()).toContain("BEGIN:VEVENT");
  await page.goto(`/plan/${planId}/maintenance`);
  await expect(page.getByTestId("maintenance-list")).toContainText("Test CO and smoke alarms.");
});

test("UX-4 medical screen: Next with the health box unticked focuses it, with the message beside it", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Build my free plan" }).first().click();
  await page.waitForURL(/\/q\//);
  const draft = { ...SAMPLE, poweredDevices: ["cpap"], _step: 4 };
  await page.evaluate((d) => localStorage.setItem(`rp_q_${location.pathname.split("/q/")[1]}`, JSON.stringify(d)), draft);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Medical needs" })).toBeVisible();
  await next(page);
  await expect(page.getByRole("heading", { name: "Medical needs" })).toBeVisible();
  await expect(page.locator("#healthConsent")).toBeFocused();
  await expect(page.locator("#healthConsent-error")).toBeVisible();
  const box = (await page.locator("label[for=healthConsent]").boundingBox())!;
  const bar = (await page.getByRole("button", { name: "Next" }).boundingBox())!;
  expect(box.y + box.height).toBeLessThanOrEqual(bar.y);
  await page.locator("#healthConsent").check();
  await expect(page.locator("#healthConsent-error")).toHaveCount(0);
  await next(page);
  await expect(page.getByRole("heading", { name: "Tell us about your home" })).toBeVisible();
});

test("UX-9: every control on the plan page is at least 44px tall (or has a 44px padded hit area)", async ({ page }) => {
  const planId = await quickPlan(page);
  await page.goto(`/plan/${planId}`);
  // Open everything a person can open, so hidden controls are measured too.
  await page.getByRole("button", { name: "Expand all" }).click();
  await page.locator("details[data-stage]").evaluateAll((ds) => ds.forEach((d) => ((d as HTMLDetailsElement).open = true)));
  await page.getByTestId("dashboard").locator("details").evaluateAll((ds) => ds.forEach((d) => ((d as HTMLDetailsElement).open = true)));
  await page.getByTestId("compare-options").locator("details").evaluateAll((ds) => ds.forEach((d) => ((d as HTMLDetailsElement).open = true)));
  await page.getByTestId("share-menu").locator("summary").first().click();
  await page.waitForTimeout(300);
  const small = await page.evaluate(() => {
    const out: string[] = [];
    const els = document.querySelectorAll("a[href], button, summary, input:not([type=hidden]), select, textarea, [role=button]");
    for (const e of els) {
      const vis = (e as HTMLElement & { checkVisibility?: (o: object) => boolean }).checkVisibility?.({ visibilityProperty: true, opacityProperty: true }) ?? true;
      const r0 = e.getBoundingClientRect();
      if (!vis || r0.width <= 1 || r0.height <= 1) continue; // the sr-only skip link until focused
      // A checkbox inside a label: the label is what you tap.
      const target = e.matches("input[type=checkbox],input[type=radio]") ? (e.closest("label") ?? e) : e;
      const r = target.getBoundingClientRect();
      if (r.height < 44) out.push(`${e.tagName.toLowerCase()} "${((e as HTMLElement).innerText || e.getAttribute("aria-label") || "").trim().slice(0, 50)}" ${Math.round(r.height)}px`);
    }
    return [...new Set(out)];
  });
  expect(small).toEqual([]);
});

test("UX-21: header and footer links are at least 44px tall on every kind of page", async ({ page }) => {
  for (const path of ["/", "/help", "/sources", "/start"]) {
    await page.goto(path);
    const small = await page.evaluate(() =>
      [...document.querySelectorAll("header a[href], footer a[href], header summary")]
        .filter((e) => e.getBoundingClientRect().height > 1)
        .filter((e) => e.getBoundingClientRect().height < 44)
        .map((e) => `${(e as HTMLElement).innerText.trim()} ${Math.round(e.getBoundingClientRect().height)}px`),
    );
    expect(small, path).toEqual([]);
  }
});
