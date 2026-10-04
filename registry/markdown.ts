import { figureProps, type Item } from "./index.ts"

/** Markdown for one item: served as /components/<name>.md and in llms-full.txt. */
export function componentMarkdown(item: Item, { homepage, registryUrl }: { homepage: string; registryUrl: string }) {
  const deps = [...(item.dependencies ?? []), ...(item.internal ?? []).map((n) => `@isometric/${n}`)]
  const props = [...(item.category === "figure" ? figureProps : []), ...(item.props ?? [])]
  return [
    `# ${item.title}`,
    "",
    `> ${item.description}`,
    "",
    `Docs: ${homepage}/components/${item.name}`,
    "",
    "## Installation",
    "",
    "```bash",
    `npx shadcn@latest add @isometric/${item.name}`,
    "```",
    "",
    `Or without the namespace: \`npx shadcn@latest add ${registryUrl}/${item.name}.json\``,
    ...(deps.length ? ["", `Dependencies (installed automatically): ${deps.join(", ")}`] : []),
    ...(item.usage ? ["", "## Usage", "", "```tsx", item.usage, "```"] : []),
    ...(item.intensity ? ["", `**intensity**: ${item.intensity}`] : []),
    ...(props.length
      ? ["", "## Props", "", "| Prop | Type | Default | Description |", "| --- | --- | --- | --- |",
        ...props.map((p) => `| \`${p.name}\` | \`${p.type.replace(/\|/g, "\\|")}\` | ${p.default ? `\`${p.default}\`` : ""} | ${p.description} |`)]
      : []),
    "",
    `Source: ${registryUrl}/${item.name}.json`,
    "",
  ].join("\n")
}
