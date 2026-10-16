import type { Metadata } from "next"

import { EngineView } from "@/components/engine/engine-view"
import { Footer, Header } from "@/components/site/header"

export const metadata: Metadata = {
  title: "Engine",
  description:
    "A working twin-turbo V12 in isometric line: every piston, rod, cam and valve moving by real kinematics, an X-ray of the internals, an exploded view, and the thermodynamics live.",
}

export default function Engine() {
  return (
    <>
      <Header />
      <main className="mx-auto grid max-w-[1480px] gap-4 px-5 py-6">
        <div className="grid gap-1">
          <h1 className="text-2xl font-medium tracking-tight">Engine anatomy</h1>
          <p className="max-w-[78ch] text-sm text-muted-foreground">
            A 6.0 litre twin-turbo V12, drawn from its numbers and running on them: the slider-crank, the firing order, the cam timing, the gas in each cylinder
            and the turbos&rsquo; lag. Start it, open the throttle, look inside, then take it apart.
          </p>
        </div>
        <EngineView />
      </main>
      <Footer />
    </>
  )
}
