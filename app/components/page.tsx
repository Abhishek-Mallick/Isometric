import type { Metadata } from "next"
import Link from "next/link"

import { DocsShell } from "@/components/site/docs-nav"
import { Footer, Header } from "@/components/site/header"
import { Plate } from "@/components/site/sheet"
import { categoryLabels, categoryOrder, docItems, isFigure } from "@/registry/index"

export const metadata: Metadata = { title: "Components", description: "Every Isometric figure and primitive." }

export default function Components() {
  return (
    <>
      <Header />
      <DocsShell current="components">
        <h1 className="text-3xl font-medium tracking-tight">Components</h1>
        <p className="mt-2 max-w-[62ch] text-muted-foreground">
          {docItems.length} items. Figures are drawings that answer the pointer; primitives are the controls you build with.
        </p>
        {categoryOrder.map((cat) => {
          const list = docItems.filter((i) => i.category === cat)
          const plates = list.filter(isFigure), rows = list.filter((i) => !isFigure(i))
          if (!list.length) return null
          return (
          <div key={cat}>
            <h2 className="mt-12 mb-4 text-lg font-medium">{categoryLabels[cat]}</h2>
            {plates.length ? (
              <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {plates.map((f) => <Plate key={f.name} name={f.name} title={f.title} href={`/components/${f.name}`} />)}
              </div>
            ) : null}
            {rows.length ? (
            <ul className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2">
              {rows.map((i) => (
                <li key={i.name} className="bg-card">
                  <Link href={`/components/${i.name}`} className="grid gap-1 px-4 py-3.5 transition-colors hover:bg-muted/60">
                    <span className="font-medium">{i.title}</span>
                    <span className="text-sm text-muted-foreground">{i.description}</span>
                  </Link>
                </li>
              ))}
            </ul>
            ) : null}
          </div>
          )
        })}
      </DocsShell>
      <Footer />
    </>
  )
}
