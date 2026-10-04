import Link from "next/link"

import { installCommand } from "@/lib/site"
import { CopyButton } from "@/components/site/copy-button"
import { Panel } from "@/components/site/demos"
import { Footer, Header } from "@/components/site/header"
import { Plate, Sheet } from "@/components/site/sheet"
import { docItems } from "@/registry/index"
import { IsoButton } from "@/registry/isometric/ui/isometric/iso-button"

const figures = docItems.filter((i) => i.category === "figure")
const primitives = docItems.filter((i) => i.category === "ui")

export default function Home() {
  const add = installCommand("all")
  return (
    <>
      <Header />
      <main>
        <section className="mx-auto grid max-w-[1200px] items-center gap-10 px-5 pt-14 pb-16 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:pt-20">
          <div className="grid gap-6">
            <h1 className="sheet-in text-[clamp(2.4rem,5.4vw,4rem)] leading-[1.02] font-medium tracking-[-0.035em] text-balance">
              Drawings that stand up off the page.
            </h1>
            <p className="sheet-in max-w-[46ch] text-[17px] leading-relaxed text-pretty text-muted-foreground" style={{ "--i": 1 } as React.CSSProperties}>
              {figures.length} isometric line figures that answer the pointer, and {primitives.length} UI primitives that stand on their own
              depth. React and Tailwind, installed as source with the shadcn CLI, themed by the tokens you already have.
            </p>
            <div className="sheet-in flex flex-wrap items-center gap-4" style={{ "--i": 2 } as React.CSSProperties}>
              <div className="flex h-10 items-center gap-1 rounded-md border bg-card pr-1 pl-3.5 font-mono text-[13px]">
                <span className="text-muted-foreground select-none">$</span>
                <span className="px-1.5">{add.replace("npx ", "npx ")}</span>
                <CopyButton value={add} />
              </div>
              <IsoButton variant="solid" asChild>
                <Link href="/components">Browse components</Link>
              </IsoButton>
            </div>
          </div>
          <div className="sheet-in" style={{ "--i": 3 } as React.CSSProperties}>
            <Sheet name="stack" title="Stack" controls defaultIntensity={0.6} />
          </div>
        </section>

        <section aria-labelledby="figures" className="mx-auto max-w-[1200px] px-5 py-14">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div className="grid gap-1.5">
              <h2 id="figures" className="text-2xl font-medium tracking-tight">Figures</h2>
              <p className="max-w-[60ch] text-muted-foreground">Move over any of them. Each reads out what it is doing, and each takes the same four options.</p>
            </div>
            <Link href="/components" className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">All components</Link>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {figures.map((f) => <Plate key={f.name} name={f.name} title={f.title} href={`/components/${f.name}`} />)}
          </div>
        </section>

        <section aria-labelledby="primitives" className="mx-auto max-w-[1200px] px-5 py-14">
          <div className="mb-8 grid gap-1.5">
            <h2 id="primitives" className="text-2xl font-medium tracking-tight">Primitives</h2>
            <p className="max-w-[60ch] text-muted-foreground">
              Buttons, cards, tabs and the rest stand on a depth drawn in the same lines, and sink into it when pressed. Built on Radix, so keyboards and screen readers work as you expect.
            </p>
          </div>
          <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
            <Panel />
            <ul className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
              {primitives.map((p) => (
                <li key={p.name}>
                  <Link href={`/components/${p.name}`} className="block rounded-md py-1.5 text-muted-foreground transition-colors hover:text-foreground">{p.title}</Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
