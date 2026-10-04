import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { highlight } from "@/lib/highlight"
import { installCommand, siteConfig } from "@/lib/site"
import { itemFiles } from "@/lib/source"
import { CodeBlock } from "@/components/site/code-block"
import { Demo } from "@/components/site/demos"
import { DocsShell } from "@/components/site/docs-nav"
import { Footer, Header } from "@/components/site/header"
import { InstallTabs, type InstallData } from "@/components/site/install-tabs"
import { Sheet } from "@/components/site/sheet"
import { IsoGrid } from "@/registry/isometric/ui/isometric/iso-grid"
import { docItems, figureProps, itemsByName, type Prop } from "@/registry/index"

export const dynamicParams = false

export function generateStaticParams() {
  return docItems.map((i) => ({ name: i.name }))
}

export async function generateMetadata({ params }: { params: Promise<{ name: string }> }): Promise<Metadata> {
  const item = itemsByName[(await params).name]
  if (!item) return {}
  return {
    title: item.title,
    description: item.description,
    alternates: { types: { "text/markdown": `${siteConfig.url}/components/${item.name}.md` } },
  }
}

const run = { pnpm: "pnpm dlx shadcn@latest add", npm: "npx shadcn@latest add", yarn: "yarn dlx shadcn@latest add", bun: "bunx --bun shadcn@latest add" } as const

async function installData(name: string): Promise<InstallData> {
  const out: InstallData = {}
  for (const mode of ["namespace", "url"] as const) {
    const target = installCommand(name, mode).replace("npx shadcn@latest add ", "")
    for (const pm of Object.keys(run) as (keyof typeof run)[]) {
      const code = `${run[pm]} ${target}`
      out[`${mode}:${pm}`] = { code, html: await highlight(code, "bash") }
    }
  }
  return out
}

function PropsTable({ props }: { props: Prop[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-left text-sm">
        <thead className="border-b bg-muted/50 text-xs text-muted-foreground">
          <tr><th className="px-4 py-2.5 font-medium">Prop</th><th className="px-4 py-2.5 font-medium">Type</th><th className="px-4 py-2.5 font-medium">Default</th><th className="px-4 py-2.5 font-medium">Description</th></tr>
        </thead>
        <tbody>
          {props.map((p) => (
            <tr key={p.name} className="border-b align-top last:border-0">
              <td className="px-4 py-3 font-mono text-[12.5px] whitespace-nowrap">{p.name}</td>
              <td className="px-4 py-3 font-mono text-[12px] text-muted-foreground">{p.type}</td>
              <td className="px-4 py-3 font-mono text-[12px] whitespace-nowrap text-muted-foreground">{p.default ?? "–"}</td>
              <td className="px-4 py-3 text-muted-foreground">{p.description.replace(/`/g, "")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default async function ComponentPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params
  const item = itemsByName[name]
  if (!item || !docItems.includes(item)) notFound()

  const index = docItems.indexOf(item)
  const prev = docItems[index - 1], next = docItems[index + 1]
  const isFigure = item.category === "figure"
  const props = [...(isFigure ? figureProps : []), ...(item.props ?? [])]
  const files = itemFiles(item)
  const deps = [...(item.dependencies ?? []), ...(item.internal ?? []).map((n) => `@isometric/${n}`)]

  return (
    <>
      <Header />
      <DocsShell current={item.name}>
        <article className="grid gap-10">
          <header className="grid gap-2">
            <h1 className="text-3xl font-medium tracking-tight">{item.title}</h1>
            <p className="max-w-[62ch] text-[17px] text-muted-foreground">{item.description}</p>
            <p className="text-sm text-muted-foreground">
              <a className="underline-offset-4 hover:text-foreground hover:underline" href={`/components/${item.name}.md`}>Markdown</a>
              <span className="px-2">/</span>
              <a className="underline-offset-4 hover:text-foreground hover:underline" href={`/r/${item.name}.json`}>Registry JSON</a>
            </p>
          </header>

          {isFigure ? (
            <Sheet name={item.name} title={item.title} controls />
          ) : (
            <div className="relative grid min-h-64 place-items-center overflow-hidden rounded-lg border bg-card px-6 py-12">
              <IsoGrid className="absolute inset-0 opacity-70" cell={22} />
              <div className="relative flex w-full justify-center"><Demo name={item.name} /></div>
            </div>
          )}

          <section className="grid gap-3">
            <h2 className="text-lg font-medium">Installation</h2>
            <InstallTabs commands={await installData(item.name)} />
            {deps.length ? <p className="text-sm text-muted-foreground">Installs with it: {deps.join(", ")}.</p> : null}
          </section>

          {item.usage ? (
            <section className="grid gap-3">
              <h2 className="text-lg font-medium">Usage</h2>
              <CodeBlock code={item.usage} title="usage.tsx" />
              {item.intensity ? <p className="text-sm text-muted-foreground"><span className="text-foreground">intensity</span>: {item.intensity.replace(/`/g, "")}</p> : null}
            </section>
          ) : null}

          {props.length ? (
            <section className="grid gap-3">
              <h2 className="text-lg font-medium">Props</h2>
              <PropsTable props={props} />
            </section>
          ) : null}

          <section className="grid gap-3">
            <h2 className="text-lg font-medium">Source</h2>
            <p className="text-sm text-muted-foreground">The CLI copies {files.length === 1 ? "this file" : "these files"} into your project. They are yours to edit.</p>
            {files.map((f) => <CodeBlock key={f.target} code={f.code} lang={f.target.endsWith(".tsx") ? "tsx" : "ts"} title={f.target} />)}
          </section>

          <nav aria-label="Pagination" className="flex justify-between gap-4 border-t pt-6 text-sm">
            {prev ? <Link href={`/components/${prev.name}`} className="text-muted-foreground hover:text-foreground">Previous: {prev.title}</Link> : <span />}
            {next ? <Link href={`/components/${next.name}`} className="text-muted-foreground hover:text-foreground">Next: {next.title}</Link> : <span />}
          </nav>
        </article>
      </DocsShell>
      <Footer />
    </>
  )
}
