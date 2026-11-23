import { defineConfig, devices } from "@playwright/test";
import fs from "node:fs";

const PORT = 3100;
/** Accounts track and DIY tips switched on, for e2e/accounts.spec.ts only. The real defaults stay off. */
const FLAGS_PORT = 3101;
const chromium = "/opt/pw-browsers/chromium";

// Clear test data with Node so this works in Windows cmd as well as bash.
const server = (port: number, dataDir: string, extraEnv: Record<string, string> = {}) => ({
  command: `node -e "require('fs').rmSync('${dataDir}',{recursive:true,force:true})" && npx next start -p ${port}`,
  port,
  reuseExistingServer: false,
  timeout: 120_000,
  env: { READYPLAN_DATA_DIR: dataDir, APP_URL: `http://localhost:${port}`, ADMIN_EMAILS: "admin@example.com", CRON_SECRET: "test-cron", ...extraEnv },
});

const phone = {
  ...devices["iPhone 13"],
  browserName: "chromium" as const,
  launchOptions: fs.existsSync(chromium) ? { executablePath: chromium } : {},
};

export default defineConfig({
  testDir: "e2e",
  timeout: 120_000,
  workers: 1,
  projects: [
    { name: "default", testIgnore: /accounts\.spec\.ts/, use: { ...phone, baseURL: `http://localhost:${PORT}` } },
    { name: "flags-on", testMatch: /accounts\.spec\.ts/, use: { ...phone, baseURL: `http://localhost:${FLAGS_PORT}` } },
  ],
  webServer: [
    server(PORT, ".data/e2e"),
    server(FLAGS_PORT, ".data/e2e-flags", { ACCOUNTS_ENABLED: "true", DIY_TIPS_ENABLED: "true" }),
  ],
});
