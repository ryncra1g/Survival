import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs";

/** Runs only in the "flags-on" project (ACCOUNTS_ENABLED and DIY_TIPS_ENABLED on, port 3101). */
const SAMPLE = JSON.parse(fs.readFileSync("samples/sample-answers.json", "utf8"));
const O = { origin: "http://localhost:3101" };

async function quickPlan(page: Page): Promise<string> {
  await page.goto("/");
  await page.getByRole("button", { name: "Build my free plan" }).click();
  await expect(page).toHaveURL(/\/q\//);
  const id = page.url().split("/q/")[1];
  const r = await page.request.post(`/api/questionnaire/${id}/generate`, { data: { answers: SAMPLE, consent: { terms: true, health: true } }, headers: O });
  expect(r.status()).toBe(200);
  return (await r.json()).planId;
}

test("accounts on: tabs, food card, tips, inventory feeds the shopping list", async ({ page }) => {
  const planId = await quickPlan(page);
  await page.goto(`/plan/${planId}`);
  const tabs = page.getByTestId("plan-tabs");
  // UX-9: the accounts-track tabs are 44px tall too
  for (const name of ["Overview", "Inventory", "Report"]) expect((await tabs.getByRole("link", { name }).boundingBox())!.height).toBeGreaterThanOrEqual(44);
  for (const t of ["Overview", "Inventory", "Report"]) await expect(tabs.getByRole("link", { name: t })).toBeVisible();
  await expect(page.getByTestId("food-mix-card")).toBeVisible();
  await expect(page.getByTestId("save-bar")).toContainText("Your plan and inventory are saved on this device for 30 days.");
  // DIY tips appear with the flag on
  await page.locator("details#water > summary").click();
  await expect(page.locator("details#water").getByTestId("diy-tips")).toContainText("Don't do this");
  // Inventory: mark the CO alarm as "Have"; it leaves the shopping list
  await page.goto(`/plan/${planId}/inventory`);
  await page.getByLabel("Carbon monoxide alarm: status").selectOption("have");
  await expect(page.getByRole("status").first()).toHaveText("Saved.");
  await page.goto(`/plan/${planId}`);
  await expect(page.getByRole("link", { name: /^Buy carbon monoxide alarm/ })).toHaveCount(0);
  await expect(page.getByTestId("to-have-inventory").first()).toHaveAttribute("href", new RegExp(`/plan/${planId}/inventory#`));
});

test("accounts on: confirmed account menu, My places and reminders, all in the export", async ({ page }) => {
  const planId = await quickPlan(page);
  const claim = await page.request.post(`/api/plans/${planId}/claim`, { data: { email: "acct@example.com", updates: false }, headers: O });
  await page.goto((await claim.json()).demoLink);
  await page.goto("/");
  await page.getByTestId("site-menu").locator("summary").click();
  for (const l of ["My plans", "Household & inventory", "My places", "Reminders", "Privacy & data", "Sign out"]) await expect(page.getByTestId("site-menu").getByText(l, { exact: true })).toBeVisible();

  await page.goto("/account/plans");
  await expect(page.getByTestId("my-plans").getByRole("link").first()).toBeVisible();

  await page.goto("/account/places");
  await page.getByLabel("Place").fill("Aunt Rosa's");
  await page.getByLabel("Address").fill("12 Sample Lane");
  await page.getByRole("button", { name: "Save my places" }).click();
  await expect(page.getByText("Saved to your account.")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Address")).toHaveValue("12 Sample Lane");

  await page.goto("/account/reminders");
  await page.getByText("Email me when maintenance is due").click();
  await expect(page.getByText("Saved.")).toBeVisible();

  const data = await (await page.request.get("/api/account/export")).json();
  expect(data.places[0].address).toBe("12 Sample Lane");
  expect(data.reminderPrefs.enabled).toBe(true);
  expect(data.plans.length).toBeGreaterThan(0);
});
