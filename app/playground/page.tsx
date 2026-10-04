import type { Metadata } from "next"

import { Footer, Header } from "@/components/site/header"
import { WorldView } from "@/components/site/world-view"

export const metadata: Metadata = {
  title: "Playground",
  description: "A small isometric town where everything works: open the church doors, charge the reactor, haul the pulley, take the PC apart and build with blocks.",
}

export default function Playground() {
  return (
    <>
      <Header />
      <main className="mx-auto grid max-w-[1400px] gap-4 px-5 py-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="grid gap-1">
            <h1 className="text-2xl font-medium tracking-tight">Playground</h1>
            <p className="max-w-[70ch] text-sm text-muted-foreground">
              Every object here is the same component you can install. Drag to look around, scroll to zoom, click anything. Switch on Build to place
              blocks from the hotbar; Shift+click or right-click mines them.
            </p>
          </div>
          <code className="rounded-md border bg-card px-2.5 py-1.5 font-mono text-[12px]">npx shadcn@latest add @isometric/world</code>
        </div>
        <WorldView />
      </main>
      <Footer />
    </>
  )
}
