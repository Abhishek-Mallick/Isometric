import "server-only"

import { readFileSync } from "node:fs"
import { join } from "node:path"

import type { Item } from "@/registry/index"

/** Rewrites registry imports the way the shadcn CLI does on install. */
export const asInstalled = (code: string) =>
  code
    .replace(/@\/registry\/isometric\/ui\//g, "@/components/ui/")
    .replace(/@\/registry\/isometric\/lib\//g, "@/lib/")

/** Where a file lands in the user's project. */
export const target = (path: string) =>
  path.replace("registry/isometric/ui/", "components/ui/").replace("registry/isometric/lib/", "lib/")

export function itemFiles(item: Item) {
  return item.files.map((f) => ({ target: target(f.path), code: asInstalled(readFileSync(join(process.cwd(), f.path), "utf8")) }))
}
