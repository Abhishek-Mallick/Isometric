#!/usr/bin/env node
// Fails when a forbidden name appears in tracked source. Isometric names no
// other library anywhere in its code, docs or registry.
import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"

const FORBIDDEN = [/hair\s*line/i, /lucas\s*mark/i]
// The licence keeps the upstream copyright line, as MIT requires.
const ALLOWED = new Set(["LICENSE", "scripts/check-names.mjs"])

const files = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], { encoding: "utf8" })
  .split("\n")
  .filter((f) => f && !ALLOWED.has(f) && !/\.(png|jpe?g|gif|ico|woff2?)$/.test(f))

const hits = []
for (const file of files) {
  let text
  try { text = readFileSync(file, "utf8") } catch { continue }
  text.split("\n").forEach((line, i) => {
    if (FORBIDDEN.some((re) => re.test(line))) hits.push(`${file}:${i + 1}: ${line.trim().slice(0, 120)}`)
  })
}

if (hits.length) {
  console.error(`check-names: ${hits.length} forbidden name(s) found:\n` + hits.join("\n"))
  process.exit(1)
}
console.log(`check-names: ${files.length} files clean`)
