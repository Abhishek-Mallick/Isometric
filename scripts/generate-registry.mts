// Generates, from registry/index.ts:
//   registry.json                 consumed by `shadcn build`
//   public/llms.txt               index for LLMs and agents (llmstxt.org)
//   public/llms-full.txt          every item's install and usage in one file
//   public/components/<name>.md   per-item markdown
//
//   REGISTRY_URL  public URL where built items are served (no trailing slash)

import { mkdirSync, writeFileSync } from "node:fs"

import { categoryLabels, categoryOrder, docItems, items, type Item } from "../registry/index.ts"
import { componentMarkdown } from "../registry/markdown.ts"

const REGISTRY_URL = (process.env.REGISTRY_URL ?? "https://isometric.buildlab.in/r").replace(/\/$/, "")
const HOMEPAGE = REGISTRY_URL.replace(/\/r$/, "")
const url = (name: string) => `${REGISTRY_URL}/${name}.json`

function toRegistryItem(item: Item) {
  const out: Record<string, unknown> = { name: item.name, type: item.type, title: item.title, description: item.description }
  if (item.dependencies?.length) out.dependencies = item.dependencies
  const registryDependencies = [...(item.shadcn ?? []), ...(item.internal ?? []).map(url)]
  if (registryDependencies.length) out.registryDependencies = registryDependencies
  out.files = item.files
  out.categories = [item.category]
  return out
}

const registry = {
  $schema: "https://ui.shadcn.com/schema/registry.json",
  name: "isometric",
  homepage: HOMEPAGE,
  items: [
    ...items.map(toRegistryItem),
    {
      name: "all",
      type: "registry:item",
      title: "Everything",
      description: "Every Isometric figure and primitive in one install.",
      registryDependencies: docItems.map((i) => url(i.name)),
    },
  ],
}

writeFileSync("registry.json", JSON.stringify(registry, null, 2) + "\n")

/* ---------- docs for LLMs and agents ---------- */

const md = (item: Item) => componentMarkdown(item, { homepage: HOMEPAGE, registryUrl: REGISTRY_URL })

const setup = `## Setup

Isometric is a shadcn registry. It needs React 19, Tailwind CSS v4 and a
components.json (run \`npx shadcn@latest init\` first).

\`\`\`bash
npx shadcn@latest add @isometric/skyline @isometric/iso-button
npx shadcn@latest add @isometric/all   # everything
\`\`\`

If your shadcn CLI does not know the namespace yet, register it in components.json:

\`\`\`json
{ "registries": { "@isometric": "${REGISTRY_URL}/{name}.json" } }
\`\`\`

Components install to components/ui/isometric and import from
"@/components/ui/isometric/<name>". The figure engine goes to lib/isometric/.
Colours follow your shadcn tokens in light and dark; override them with the
--iso-* custom properties.
`

const sections = categoryOrder
  .map((cat) => {
    const list = docItems.filter((i) => i.category === cat)
    if (!list.length) return ""
    return [`## ${categoryLabels[cat]}`, "", ...list.map((i) => `- [${i.title}](${HOMEPAGE}/components/${i.name}.md): ${i.description}`), ""].join("\n")
  })
  .join("\n")

const llms = `# Isometric

> Isometric line figures and UI primitives for React: fine-line SVG drawings
> that answer the pointer, and components that stand on their own depth.
> Tailwind CSS v4 + Radix, distributed as a shadcn registry. Install any item
> with \`npx shadcn@latest add @isometric/<name>\`.

${setup}
${sections}
## Optional

- [Registry index](${REGISTRY_URL}/registry.json): machine-readable list of every item
- [Full docs](${HOMEPAGE}/llms-full.txt): install and usage for every item in one file
- [Source](https://github.com/Abhishek-Mallick/Isometric)
`

mkdirSync("public/components", { recursive: true })
writeFileSync("public/llms.txt", llms)
writeFileSync(
  "public/llms-full.txt",
  `# Isometric: full reference\n\n${setup}\n` + docItems.map((i) => md(i).replace(/^# /, "## ").replace(/\n## /g, "\n### ")).join("\n---\n\n"),
)
for (const item of docItems) writeFileSync(`public/components/${item.name}.md`, md(item))

console.log(`registry.json: ${registry.items.length} items → ${REGISTRY_URL}`)
