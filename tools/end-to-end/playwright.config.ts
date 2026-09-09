import { defineConfig, devices } from "@playwright/test";

export const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:5173";
export const graphqlUrl =
  process.env.GRAPHQL_URL ?? "http://localhost:4000/graphql";
export const resetSeedBeforeRun = process.env.RESET_SEED === "true";

export default defineConfig({
  testDir: "./tests",
  globalSetup: "./globalSetup.ts",
  fullyParallel: false,
  workers: 1,
  forbidOnly: process.env.CI === "true",
  retries: process.env.CI === "true" ? 1 : 0,
  reporter: [["list"]],
  timeout: 90_000,
  expect: { timeout: 20_000 },
  use: {
    baseURL: frontendUrl,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
