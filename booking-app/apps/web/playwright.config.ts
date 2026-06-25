import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 60000,
  use: {
    baseURL: "http://localhost:5174",
    trace: "on-first-retry"
  },
  webServer: [
    {
      command: "STRIPE_USE_MOCK=true npm run dev -w apps/api",
      url: "http://localhost:4000/api/health",
      cwd: "../..",
      reuseExistingServer: true,
      timeout: 60000
    },
    {
      command: "npm run dev -w apps/web",
      url: "http://localhost:5174",
      cwd: "../..",
      reuseExistingServer: true,
      timeout: 60000
    }
  ],
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }]
});
