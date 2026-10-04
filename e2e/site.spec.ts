import { expect, test } from "@playwright/test"

import { docItems } from "../registry/index"

for (const item of docItems) {
  test(`${item.name} renders without errors`, async ({ page }) => {
    const errors: string[] = []
    page.on("pageerror", (e) => errors.push(e.message))
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()) })
    await page.goto(`/components/${item.name}/`)
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(item.title)
    if (item.category === "figure") {
      const figure = page.locator(`[data-iso="${item.name}"]`).first()
      await expect(figure).toHaveAttribute("role", "img")
      await expect(figure.locator("svg path").first()).toBeAttached()
      // the pointer reaches the figure, and it says so in the title block
      const box = (await figure.boundingBox())!
      await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.45, { steps: 5 })
      await expect(page.locator("figcaption [aria-live]")).not.toHaveText(/^\s*$/)
    }
    expect(errors).toEqual([])
  })
}

for (const item of docItems.filter((i) => i.interactive)) {
  test(`${item.name} is operable from the keyboard`, async ({ page }) => {
    await page.goto(`/components/${item.name}/`)
    const figure = page.locator(`[data-iso="${item.name}"]`).first()
    await expect(figure).toHaveAttribute("role", "group")
    await figure.focus()
    const caption = page.locator("figcaption [aria-live]")
    await page.keyboard.press("ArrowRight")
    const named = await caption.innerText()
    expect(named.trim().length).toBeGreaterThan(0)
    await page.keyboard.press("Enter")
    await expect(caption).not.toHaveText(named)
  })
}

test("home, docs and llms.txt are served", async ({ page, request }) => {
  await page.goto("/")
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
  await page.goto("/docs/")
  await expect(page.getByRole("heading", { name: "Theming" })).toBeVisible()
  expect((await request.get("/llms.txt")).ok()).toBe(true)
  const reg = await (await request.get("/r/registry.json")).json()
  expect(reg.name).toBe("isometric")
})
