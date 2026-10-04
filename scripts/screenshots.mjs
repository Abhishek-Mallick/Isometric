#!/usr/bin/env node
// Regenerates the README hero images and the social card from a running site.
//   pnpm dev  (in another terminal), then: node scripts/screenshots.mjs [url]
import { chromium } from "@playwright/test"

const url = process.argv[2] ?? "http://localhost:3000/"
const browser = await chromium.launch()

async function shot(path, { width, height, dark }) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 2 })
  await page.addInitScript((d) => localStorage.setItem("theme", d ? "dark" : "light"), dark)
  await page.goto(url, { waitUntil: "networkidle" })
  // nudge the hero figure so the picture shows it answering the pointer
  const fig = page.locator("[data-iso]").first()
  const box = await fig.boundingBox()
  if (box) await page.mouse.move(box.x + box.width * 0.72, box.y + box.height * 0.3, { steps: 6 })
  await page.waitForTimeout(1200)
  await page.screenshot({ path })
  await page.close()
}

await shot(".github/assets/hero-light.png", { width: 1280, height: 720, dark: false })
await shot(".github/assets/hero-dark.png", { width: 1280, height: 720, dark: true })
await shot("app/opengraph-image.png", { width: 1200, height: 630, dark: false })
await browser.close()
console.log("screenshots written")
