/**
 * Screenshot an email HTML file at phone width, light and dark (design review of everything that leaves the site).
 *   npx tsx scripts/email-shot.ts <email.html> <out-prefix>   → <out-prefix>-light.png, <out-prefix>-dark.png
 * Chromium honours the email's color-scheme meta and prefers-color-scheme styles, like Apple Mail does.
 */
import { chromium } from "@playwright/test";
import { pathToFileURL } from "node:url";
import path from "node:path";

const [file, out] = process.argv.slice(2);
if (!file || !out) throw new Error("usage: npx tsx scripts/email-shot.ts <email.html> <out-prefix>");
(async () => {
  const browser = await chromium.launch();
  for (const scheme of ["light", "dark"] as const) {
    const page = await (await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, colorScheme: scheme })).newPage();
    await page.goto(pathToFileURL(path.resolve(file)).href);
    await page.screenshot({ path: `${out}-${scheme}.png` });
    const sideways = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    console.log(`${out}-${scheme}.png${sideways ? "  SIDEWAYS SCROLL" : ""}`);
  }
  await browser.close();
})();
