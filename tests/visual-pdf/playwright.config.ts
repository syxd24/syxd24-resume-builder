import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: /visual-pdf\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  outputDir: "../../test-results/visual-pdf/playwright",
  snapshotPathTemplate: "{testDir}/baselines/{testFilePath}/{arg}{ext}",
  use: {
    baseURL: "http://127.0.0.1:3107",
    browserName: "chromium",
    colorScheme: "light",
    locale: "en-GB",
    timezoneId: "UTC",
    trace: "retain-on-failure",
    viewport: { width: 1440, height: 900 },
  },
  webServer: {
    command: "npm run dev -- --port 3107",
    url: "http://127.0.0.1:3107",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
