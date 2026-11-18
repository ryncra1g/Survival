import { defineConfig, devices } from "@playwright/test";
import fs from "node:fs";

const PORT = 3100;
const dataDir = ".data/e2e";
const chromium = "/opt/pw-browsers/chromium";

export default defineConfig({
  testDir: "e2e",
  timeout: 120_000,
  workers: 1,
  use: {
    baseURL: `http://localhost:${PORT}`,
    ...devices["iPhone 13"],
    browserName: "chromium",
    launchOptions: fs.existsSync(chromium) ? { executablePath: chromium } : {},
  },
  webServer: {
    command: `rm -rf ${dataDir} && npx next start -p ${PORT}`,
    port: PORT,
    reuseExistingServer: false,
    timeout: 120_000,
    env: { READYPLAN_DATA_DIR: dataDir, APP_URL: `http://localhost:${PORT}`, ADMIN_EMAILS: "admin@example.com", CRON_SECRET: "test-cron" },
  },
});
