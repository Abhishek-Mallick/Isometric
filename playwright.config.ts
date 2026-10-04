import { defineConfig } from "@playwright/test"

// Runs against the static export in out/, so `pnpm build` first.
export default defineConfig({
  testDir: "e2e",
  use: { baseURL: "http://localhost:3300" },
  webServer: { command: "npx -y serve out -l 3300", url: "http://localhost:3300", reuseExistingServer: true },
})
