import type { Metadata } from "next"
import Link from "next/link"

import { DocsShell } from "@/components/site/docs-nav"
import { Footer, Header } from "@/components/site/header"
import { Plate } from "@/components/site/sheet"
import { categoryLabels, docItems } from "@/registry/index"

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
        <h2 className="mt-10 mb-4 text-lg font-medium">{categoryLabels.figure}</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {docItems.filter((i) => i.category === "figure").map((f) => <Plate key={f.name} name={f.name} title={f.title} href={`/components/${f.name}`} />)}
        </div>
        {(["ui", "foundation"] as const).map((cat) => (
          <div key={cat}>
            <h2 className="mt-12 mb-4 text-lg font-medium">{categoryLabels[cat]}</h2>
            <ul className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2">
              {docItems.filter((i) => i.category === cat).map((i) => (
                <li key={i.name} className="bg-card">
                  <Link href={`/components/${i.name}`} className="grid gap-1 px-4 py-3.5 transition-colors hover:bg-muted/60">
                    <span className="font-medium">{i.title}</span>
                    <span className="text-sm text-muted-foreground">{i.description}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </DocsShell>
      <Footer />
    </>
  )
}
