import { expect, test, type Page } from "@playwright/test";

async function pick(page: Page, name: string | RegExp) {
  await page.getByRole("button", { name, exact: typeof name === "string" }).first().click();
}
const next = (page: Page) => page.getByRole("button", { name: /^(Next|Build my plan)$/ }).click();

test("phone: email → questionnaire → plan → confirm → email + PDF → edit → export → delete", async ({ page, request }) => {
  const started = Date.now();
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Your family's emergency plan");
  await page.getByRole("link", { name: "Build my plan" }).click();

  await page.getByLabel("Email").fill("family@example.com");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Start my plan" }).click();
  await expect(page).toHaveURL(/\/q\//);

  // 1 location
  await page.getByLabel("ZIP code").fill("11746");
  await pick(page, /^90 days/);
  await next(page);
  // 2 household
  await page.getByLabel("Add a child age").selectOption("2");
  await page.getByLabel("Add a child age").selectOption("4");
  await next(page);
  // 3 toddlers
  await expect(page.getByRole("heading", { name: /little ones/ })).toBeVisible();
  await pick(page, "Diapers");
  await next(page);
  // 4 pets
  await pick(page, "+ Add a pet");
  await next(page);
  // 5 medical
  await next(page);
  // 6 home
  await pick(page, "Basement / lower level");
  await pick(page, "Garage");
  await pick(page, "Yard");
  await next(page);
  // 7 heat (natural gas default) — 8 water — 9 power
  await next(page);
  await next(page);
  await pick(page, "+ Gasoline");
  await next(page);
  // 10 storage + evacuation
  await pick(page, "Garage");
  await pick(page, "Raw land");
  await pick(page, "~120 mi");
  await next(page);
  // 11 budget
  await pick(page, "$1,500–5,000");
  // Back button + autosave check
  await page.getByRole("button", { name: "Back" }).click();
  await expect(page.getByRole("button", { name: "Raw land" })).toHaveAttribute("aria-pressed", "true");
  await next(page);
  await next(page);

  await expect(page).toHaveURL(/\/plan\//, { timeout: 60_000 });
  const planUrl = page.url();
  expect(Date.now() - started).toBeLessThan(5 * 60_000);
  await expect(page.getByRole("heading", { name: "1. Household snapshot & planning assumptions" })).toBeVisible();
  await expect(page.getByText("54 gal (14 days)")).toBeVisible();
  await expect(page.getByText(/check your inbox for our confirmation email/)).toBeVisible();
  await expect(page.getByRole("heading", { name: /Evacuation/ })).toBeVisible();
  // Answers never in URL
  expect(planUrl).not.toMatch(/11746|zip|answers/);

  // PDF download
  const pdf = await page.request.get(planUrl.replace("/plan/", "/api/plans/") + "/pdf");
  expect(pdf.status()).toBe(200);
  expect((await pdf.body()).subarray(0, 4).toString()).toBe("%PDF");

  // Another browser can't see the plan
  const anon = await request.get(planUrl);
  expect(anon.status()).toBe(404);

  // Confirm via demo link shown on the questionnaire page (stored in sessionStorage)
  const link = await page.evaluate(() => sessionStorage.getItem("rp_demo_link"));
  expect(link).toBeTruthy();
  await page.goto(link!);
  await expect(page).toHaveURL(/\/plan\/.*emailed=1/);
  await expect(page.getByText(/on its way to your inbox/)).toBeVisible();

  // Link is single-use
  await page.goto(link!);
  await expect(page).toHaveURL(/link=expired/);

  // Account: edit answers → regenerate
  await page.goto("/account");
  await expect(page.getByText("family@example.com")).toBeVisible();
  await page.getByRole("button", { name: "Edit answers & regenerate" }).click();
  await expect(page).toHaveURL(/\/q\//);
  await expect(page.getByLabel("ZIP code")).toHaveValue("11746");

  // Export
  await page.goto("/account");
  const exp = await page.request.get("/api/account/export");
  const data = await exp.json();
  expect(data.user.email).toBe("family@example.com");
  expect(data.plans.length).toBeGreaterThan(0);

  // Delete
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

test("bad origin and honeypot are rejected", async ({ request }) => {
  const r1 = await request.post("/api/signup", { data: { email: "x@example.com", consent: true }, headers: { origin: "https://evil.example" } });
  expect(r1.status()).toBe(403);
  const r2 = await request.post("/api/signup", { data: { email: "x@example.com", consent: true, website: "spam" }, headers: { origin: "http://localhost:3100" } });
  expect(r2.status()).toBe(400);
});

test("admin: dashboard, catalog and rule constants (no redeploy)", async ({ page }) => {
  await page.goto("/start");
  await page.getByLabel("Email").fill("admin@example.com");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Start my plan" }).click();
  await expect(page).toHaveURL(/\/q\//);
  const link = await page.evaluate(() => sessionStorage.getItem("rp_demo_link"));
  await page.goto(link!);
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Admin" })).toBeVisible();
  await expect(page.getByText("Signups")).toBeVisible();

  await page.goto("/admin/catalog");
  await expect(page.getByText("Carbon monoxide alarm")).toBeVisible();

  await page.goto("/admin/rules");
  await page.getByLabel(/Overrides/).fill('{ "water": { "adultGalPerDay": -5 } }');
  await page.getByRole("button", { name: /Validate & save/ }).click();
  await expect(page.getByText(/Invalid constants/)).toBeVisible();
  await page.getByLabel(/Overrides/).fill('{ "water": { "adultGalPerDay": 1.25 } }');
  await page.getByRole("button", { name: /Validate & save/ }).click();
  await expect(page.getByText(/Saved as version 1/)).toBeVisible();
  const r = await page.request.get("/api/admin/rules");
  expect((await r.json()).overrides.water.adultGalPerDay).toBe(1.25);
  // reset so other runs start from defaults
  await page.request.post("/api/admin/rules", { data: { overrides: {} }, headers: { origin: "http://localhost:3100" } });
});
