import { existsSync, readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

import { docItems, items, itemsByName } from "@/registry/index"

describe("registry manifest", () => {
  it("names are unique and kebab-case", () => {
    const names = items.map((i) => i.name)
    expect(new Set(names).size).toBe(names.length)
    for (const n of names) expect(n).toMatch(/^[a-z][a-z0-9-]*$/)
  })

  it("every file exists", () => {
    for (const item of items) for (const f of item.files) expect(existsSync(f.path), f.path).toBe(true)
  })

  it("every internal dependency is an item", () => {
    for (const item of items) for (const dep of item.internal ?? []) expect(itemsByName[dep], `${item.name} → ${dep}`).toBeDefined()
  })

  it("a file only imports registry code its item depends on", () => {
    for (const item of items) {
      const allowed = new Set([item.name, ...(item.internal ?? [])].flatMap((n) => itemsByName[n].files.map((f) => f.path.replace(/\.tsx?$/, ""))))
      for (const f of item.files) {
        const src = readFileSync(f.path, "utf8")
        for (const [, spec] of src.matchAll(/from "@\/(registry\/[^"]+)"/g)) expect(allowed.has(spec), `${f.path} imports ${spec}`).toBe(true)
        for (const [, pkg] of src.matchAll(/from "([^"@./][^"]*)"/g)) {
          if (pkg === "react") continue
          expect(item.dependencies ?? [], `${f.path} imports ${pkg}`).toContain(pkg)
        }
      }
    }
  })

  it("every documented item has usage and a description", () => {
    for (const item of docItems) {
      expect(item.description.length).toBeGreaterThan(20)
      expect(item.usage, item.name).toBeTruthy()
    }
  })
})
