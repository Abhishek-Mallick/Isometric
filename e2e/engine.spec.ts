import { expect, test, type Page } from "@playwright/test"

/** Whether the engine's canvas has anything painted on it. */
const painted = (page: Page) =>
  page.locator("[data-iso] canvas").evaluate((c: HTMLCanvasElement) => {
    const d = c.getContext("2d")!.getImageData(0, 0, c.width, c.height).data
    let n = 0
    for (let i = 3; i < d.length; i += 16) if (d[i] > 0) n++
    return n
  })

const stage = (page: Page) => page.locator("[data-iso][data-mode]")

test("the engine page draws the engine without errors", async ({ page }) => {
  const errors: string[] = []
  page.on("pageerror", (e) => errors.push(e.message))
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text())
  })
  await page.goto("/engine/")
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Engine anatomy")
  await expect(page.getByRole("link", { name: "Engine", exact: true })).toBeVisible()
  await expect(stage(page)).toHaveAttribute("data-mode", "xray")
  await expect.poll(() => painted(page)).toBeGreaterThan(2000)
  expect(errors).toEqual([])
})

test("Start cranks the engine and it settles at idle", async ({ page }) => {
  await page.goto("/engine/")
  await page.getByRole("button", { name: "Start" }).click()
  await expect(stage(page)).toHaveAttribute("data-run", "running", { timeout: 5000 })
  await expect(page.getByRole("img", { name: /^Engine speed: / })).toHaveAttribute("aria-label", /: [5-8]\d0 rpm$/, { timeout: 8000 })
  // more throttle, more speed
  await stage(page).focus()
  for (let i = 0; i < 4; i++) await page.keyboard.press("ArrowUp")
  await expect(page.getByRole("img", { name: /^Engine speed: / })).toHaveAttribute("aria-label", /: [1-9],\d{3} rpm$/, { timeout: 8000 })
  await page.getByRole("button", { name: "Stop" }).click()
  await expect(stage(page)).toHaveAttribute("data-run", "off", { timeout: 15000 })
})

test("the engine explodes and goes back together from the keyboard", async ({ page }) => {
  await page.goto("/engine/")
  await stage(page).focus()
  await page.keyboard.press("3")
  await expect(stage(page)).toHaveAttribute("data-drawn", "exploded")
  // every part gets its name once it is apart
  await expect.poll(() => page.locator("[data-engine-callouts] > g:not([style*='none'])").count(), { timeout: 6000 }).toBeGreaterThan(15)
  await page.keyboard.press("2")
  await expect(stage(page)).toHaveAttribute("data-mode", "xray")
  await expect(stage(page)).toHaveAttribute("data-drawn", "xray", { timeout: 8000 })
})

test("a part is isolated and cleared from the keyboard", async ({ page }) => {
  await page.goto("/engine/")
  await stage(page).focus()
  await page.keyboard.press("ArrowRight")
  await expect(page.getByText("click or Enter to isolate")).toBeVisible()
  await page.keyboard.press("Enter")
  await expect(page.getByText("Isolated", { exact: true })).toBeVisible()
  await expect(page.locator("#engine-caption")).toContainText("isolated")
  await page.keyboard.press("Escape")
  await expect(page.getByText("Isolated", { exact: true })).toBeHidden()
})

test("one cylinder at a time, chosen from the firing ring", async ({ page }) => {
  await page.goto("/engine/")
  await page.getByRole("radio", { name: /One cylinder/ }).click()
  await expect(stage(page)).toHaveAttribute("data-drawn", "cylinder", { timeout: 6000 })
  await page.getByRole("button", { name: "7", exact: true }).click()
  await expect(page.locator("#engine-caption")).toContainText("Cylinder 7")
})

// Pixel comparisons depend on the platform's fonts and antialiasing, so they run where their baselines were made: VISUAL=1.
for (const theme of ["light", "dark"] as const) {
  for (const key of ["1", "2", "3"]) {
    test(`looks the same: view ${key}, ${theme}`, async ({ page }) => {
      test.skip(!process.env.VISUAL, "set VISUAL=1 to compare screenshots")
      await page.emulateMedia({ reducedMotion: "reduce", colorScheme: theme })
      await page.setViewportSize({ width: 1440, height: 960 })
      await page.goto("/engine/")
      if (theme === "dark") await page.evaluate(() => document.documentElement.classList.add("dark"))
      await stage(page).focus()
      await page.keyboard.press(key)
      await page.waitForTimeout(600)
      await expect(stage(page)).toHaveScreenshot(`engine-${key}-${theme}.png`, { maxDiffPixelRatio: 0.01 })
    })
  }
}
