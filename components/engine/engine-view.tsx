"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { download } from "@/registry/isometric/lib/isometric/export"
import { IsoButton } from "@/registry/isometric/ui/isometric/iso-button"
import { IsoGrid } from "@/registry/isometric/ui/isometric/iso-grid"
import { IsoKbd } from "@/registry/isometric/ui/isometric/iso-kbd"
import { IsoSlider } from "@/registry/isometric/ui/isometric/iso-slider"
import { IsoToggleGroup, IsoToggleGroupItem } from "@/registry/isometric/ui/isometric/iso-toggle-group"
import { PART, type PartId } from "@/anatomy/assembly"
import { STROKES } from "@/anatomy/cycle"
import { layout } from "@/anatomy/kinematics"
import type { Mode } from "@/anatomy/parts"
import { ATMOSPHERE, type Pace } from "@/anatomy/sim"
import { derive, V12, type EngineSpec } from "@/anatomy/spec"

import { PVLoop, TorqueRipple } from "./charts"
import { Dial, FiringRing, Meter, STROKE_COLOR } from "./gauges"
import { PartCard, PartsList } from "./parts-panel"
import { mountEngine, type EngineHandle, type Snapshot } from "./runtime"

const MODES: { id: Mode; label: string; key: string }[] = [
  { id: "assembled", label: "Assembled", key: "1" },
  { id: "xray", label: "X-ray", key: "2" },
  { id: "exploded", label: "Exploded", key: "3" },
  { id: "cylinder", label: "One cylinder", key: "4" },
]
const PACES: { id: Pace; label: string; hint: string }[] = [
  { id: "auto", label: "Auto", hint: "slow at idle, quicker as it revs" },
  { id: 1, label: "1×", hint: "real time: a blur above idle" },
  { id: 0.1, label: "1/10", hint: "a tenth of real time" },
  { id: 0.02, label: "1/50", hint: "a fiftieth of real time" },
]
const RUN: Record<Snapshot["run"], string> = { off: "Off", cranking: "Cranking", running: "Running", stopping: "Winding down" }

const fmt = (n: number, d = 0) => n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d })

/** The engine page's working drawing: the live engine, its controls, instruments and parts. */
export function EngineView({ spec = V12 }: { spec?: EngineSpec }) {
  const host = React.useRef<HTMLDivElement>(null)
  const overlay = React.useRef<SVGSVGElement>(null)
  const api = React.useRef<EngineHandle | null>(null)
  const [s, setS] = React.useState<Snapshot | null>(null)
  const cylinders = React.useMemo(() => layout(spec), [spec])
  const facts = React.useMemo(() => derive(spec), [spec])
  const [reduced, setReduced] = React.useState(false)

  React.useEffect(() => {
    if (!host.current || !overlay.current) return
    const h = mountEngine(host.current, overlay.current, spec, setS)
    api.current = h
    return () => {
      h.destroy()
      api.current = null
    }
  }, [spec])

  React.useEffect(() => {
    const m = matchMedia("(prefers-reduced-motion: reduce)")
    const on = () => setReduced(m.matches)
    on()
    m.addEventListener("change", on)
    return () => m.removeEventListener("change", on)
  }, [])

  const mode = s?.mode ?? "xray"
  const run = s?.run ?? "off"
  const on = run === "running" || run === "cranking"
  const only = s?.only ?? 1
  const focus = s?.focus ?? null
  const boost = s ? s.map - ATMOSPHERE : 0
  const caption = `${MODES.find((m) => m.id === mode)?.label}. Engine ${RUN[run].toLowerCase()}.${focus ? ` ${PART[focus].name} isolated.` : ""}${mode === "cylinder" ? ` Cylinder ${only}.` : ""}`

  const save = () => {
    const svg = api.current?.svg()
    if (svg) download(`${spec.id}-${mode}.svg`, svg)
  }

  return (
    <section className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_356px]" aria-label={`${spec.name}, a working drawing`}>
      <div className="grid content-start gap-3 xl:sticky xl:top-[4.5rem]">
        <div className="relative overflow-hidden rounded-lg border bg-card">
          <IsoGrid className="absolute inset-0" cell={26} />
          <div className="relative h-[min(calc(100dvh-12rem),720px)] min-h-[420px]">
            <div
              ref={host}
              data-iso=""
              data-mode={mode}
              data-drawn={s?.drawn ?? mode}
              data-run={run}
              tabIndex={0}
              role="application"
              aria-roledescription="engine drawing"
              aria-label={`${spec.name}. Drag to orbit, scroll to zoom. Keys: 1 to 4 change the view, Space starts or stops, arrows walk the parts, Enter isolates one.`}
              aria-describedby="engine-caption"
              className="absolute inset-0 aspect-auto touch-none outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
            />
            <svg ref={overlay} data-engine-callouts="" aria-hidden />

            {/* the title block */}
            <div className="pointer-events-none absolute top-3 left-3 grid gap-0.5 rounded-md border bg-card/85 px-3 py-2 backdrop-blur-sm">
              <span className="text-sm font-medium">{spec.name}</span>
              <span className="font-mono text-[11px] text-muted-foreground">
                {fmt(facts.litres * 1000)} cc · {spec.vee}° V · {spec.bore} × {spec.stroke} mm · {spec.compression}:1
              </span>
            </div>

            <div className="absolute top-3 right-3 flex flex-col items-end gap-2">
              <IsoToggleGroup type="single" value={mode} onValueChange={(v) => v && api.current?.setMode(v as Mode)} aria-label="View">
                {MODES.map((m) => (
                  <IsoToggleGroupItem key={m.id} value={m.id} aria-label={`${m.label} (${m.key})`} className="h-7 px-2 text-[12px]">
                    {m.label}
                  </IsoToggleGroupItem>
                ))}
              </IsoToggleGroup>
              {mode === "cylinder" ? (
                <div className="flex flex-wrap justify-end gap-1 rounded-md border bg-card/85 p-1 backdrop-blur-sm" role="group" aria-label="Cylinder">
                  {cylinders.map((c) => (
                    <button
                      key={c.n}
                      type="button"
                      aria-pressed={only === c.n}
                      onClick={() => api.current?.setOnly(c.n)}
                      className={cn(
                        "h-6 min-w-6 rounded-[3px] px-1 font-mono text-[11px] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                        only === c.n ? "bg-ink text-background" : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {c.n}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            {focus ? (
              <div className="absolute bottom-3 left-3 w-72 max-w-[calc(100%-1.5rem)]">
                <PartCard id={focus} onClose={() => api.current?.setFocus(null)} />
              </div>
            ) : s?.hover ? (
              <div className="pointer-events-none absolute bottom-3 left-3 rounded-md border bg-card/85 px-2.5 py-1.5 text-[12px] backdrop-blur-sm">
                <span className="font-medium">{PART[s.hover].name}</span>
                <span className="text-muted-foreground"> · click or Enter to isolate</span>
              </div>
            ) : null}

            <div className="pointer-events-none absolute right-3 bottom-3 flex items-center gap-3 rounded-md border bg-card/85 px-2.5 py-1.5 backdrop-blur-sm">
              {STROKES.map((st) => (
                <span key={st} className="flex items-center gap-1.5 text-[11px] text-muted-foreground capitalize">
                  <span className="size-2 rounded-[1px]" style={{ background: STROKE_COLOR[st] }} />
                  {st}
                </span>
              ))}
            </div>
          </div>

          {/* the transport */}
          <div className="relative grid gap-x-5 gap-y-2 border-t bg-card px-4 py-3 md:grid-cols-[auto_minmax(0,1fr)_minmax(0,1.2fr)]">
            <div className="flex items-center gap-3">
              <IsoButton variant={on ? "outline" : "solid"} onClick={() => api.current?.toggle()} className="w-24" aria-keyshortcuts="Space">
                {on ? "Stop" : "Start"}
              </IsoButton>
              <span className="grid font-mono text-[11px] leading-tight">
                <span className={cn(on ? "text-foreground" : "text-muted-foreground")}>
                  {RUN[run]}
                  {s?.cut ? " · limiter" : ""}
                </span>
                <span className="text-muted-foreground tabular-nums">{fmt(s?.rpm ?? 0)} rpm</span>
              </span>
            </div>
            <label className="grid gap-0.5">
              <span className="flex justify-between text-[11px] text-muted-foreground">
                <span>
                  Throttle <span className="opacity-70">(↑ ↓)</span>
                </span>
                <span className="font-mono tabular-nums">{Math.round((s?.pedal ?? 0) * 100)}%</span>
              </span>
              <IsoSlider
                aria-label="Throttle"
                value={[Math.round((s?.pedal ?? 0) * 100)]}
                onValueChange={([v]) => api.current?.setPedal(v / 100)}
                min={0}
                max={100}
                step={1}
                className="py-2"
              />
            </label>
            <div className="grid gap-0.5">
              <span className="flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
                <span>Crank angle {s?.held ? "· held" : ""}</span>
                <span className="flex items-center gap-1" role="group" aria-label="Playback speed">
                  {PACES.map((p) => (
                    <button
                      key={String(p.id)}
                      type="button"
                      title={p.hint}
                      aria-pressed={s?.pace === p.id}
                      onClick={() => api.current?.setPace(p.id)}
                      className={cn(
                        "rounded-[3px] px-1.5 py-0.5 font-mono text-[10.5px] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                        s?.pace === p.id ? "bg-foreground text-background" : "hover:text-foreground",
                      )}
                    >
                      {p.label}
                    </button>
                  ))}
                </span>
              </span>
              <IsoSlider
                aria-label="Crank angle"
                value={[Math.round(s?.theta ?? 0)]}
                onValueChange={([v]) => api.current?.scrub(v)}
                onValueCommit={() => api.current?.scrub(null)}
                min={0}
                max={719}
                step={1}
                className="py-2"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 text-[12px] text-muted-foreground">
          <p id="engine-caption" aria-live="polite" className="font-mono text-[11.5px]">
            {caption}
            {reduced ? " Reduced motion: the engine runs and reads out, the drawing holds still; turn the crank by hand." : ""}
          </p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <span className="flex items-center gap-1">
              <IsoKbd>1</IsoKbd>–<IsoKbd>4</IsoKbd> view
            </span>
            <span className="flex items-center gap-1">
              <IsoKbd>Space</IsoKbd> start
            </span>
            <span className="flex items-center gap-1">
              <IsoKbd>Q</IsoKbd>
              <IsoKbd>E</IsoKbd> turn
            </span>
            <span className="flex items-center gap-1">
              <IsoKbd>←</IsoKbd>
              <IsoKbd>→</IsoKbd> parts
            </span>
            <span className="flex items-center gap-1">
              <IsoKbd>Enter</IsoKbd> isolate
            </span>
            <span className="flex items-center gap-1">
              <IsoKbd>R</IsoKbd> reset view
            </span>
            <button
              type="button"
              onClick={save}
              className="rounded-md border bg-card px-2 py-1 font-mono text-[11px] hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              Download SVG
            </button>
          </div>
        </div>
      </div>

      <aside className="grid content-start gap-3" aria-label="Instruments">
        <Panel title="Instruments">
          <div className="grid grid-cols-2 gap-2">
            <Dial
              value={s?.rpm ?? 0}
              min={0}
              max={8000}
              step={500}
              every={1000}
              red={spec.redline}
              scale={1000}
              label="Engine speed"
              unit="rpm"
              display={fmt(Math.round((s?.rpm ?? 0) / 10) * 10)}
            />
            <Dial
              value={boost}
              min={-1}
              max={1.5}
              step={0.25}
              every={0.5}
              label={boost < 0 ? "Manifold vacuum" : "Boost"}
              unit="bar"
              display={boost.toFixed(2)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3 border-t pt-3">
            <Figure label="Torque" value={fmt(Math.max(0, s?.torque ?? 0))} unit="N·m" />
            <Figure label="Power" value={fmt(Math.max(0, s?.power ?? 0))} unit={`kW · ${fmt(Math.max(0, (s?.power ?? 0) * 1.341))} hp`} />
          </div>
          <div className="grid gap-2 border-t pt-3">
            <Meter label="Turbo shaft" value={(s?.turbo ?? 0) / spec.turbo.max} display={`${fmt((s?.turbo ?? 0) / 1000)}k rpm`} />
            <Meter label="Throttle blade" value={s?.throttle ?? 0} display={`${Math.round((s?.throttle ?? 0) * 100)}%`} />
            <Meter
              label={s?.venting ? "Wastegate · blow-off venting" : "Wastegate"}
              value={s?.gate ?? 0}
              display={`${Math.round((s?.gate ?? 0) * 100)}%`}
              tone="warm"
            />
          </div>
        </Panel>

        <Panel title="Firing order" note={spec.firing.join("-")}>
          <div className="grid grid-cols-[1fr_auto] items-center gap-3">
            <FiringRing
              theta={s?.theta ?? 0}
              cylinders={cylinders}
              fired={s?.fired ?? 1}
              only={mode === "cylinder" ? only : undefined}
              onPick={(n) => {
                api.current?.setOnly(n)
                if (mode !== "cylinder") api.current?.setMode("cylinder")
              }}
            />
            <p className="max-w-36 text-[11.5px] leading-snug text-muted-foreground">
              A face is one cycle, 720° of crank. Each cylinder sits where it fires, every {facts.interval}°. Click one to see it alone.
            </p>
          </div>
        </Panel>

        <Panel title="Pressure and volume" note={`cylinder ${only}`}>
          {s ? <PVLoop spec={spec} charge={s.charge} theta={s.theta} cylinder={cylinders[only - 1]} /> : <Blank />}
        </Panel>

        <Panel title="Crank torque" note="all twelve, one cycle">
          {s ? <TorqueRipple spec={spec} cylinders={cylinders} charge={s.charge} theta={s.theta} /> : <Blank />}
        </Panel>

        <Panel title="Parts" note="hover to find, click to isolate">
          <PartsList
            focus={focus}
            hover={s?.hover ?? null}
            onHover={(id: PartId | null) => api.current?.setHover(id)}
            onFocus={(id) => api.current?.setFocus(id)}
          />
        </Panel>
      </aside>
    </section>
  )
}

function Panel({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-3 rounded-lg border bg-card p-3.5">
      <header className="flex items-baseline justify-between gap-3">
        <h2 className="text-[13px] font-medium">{title}</h2>
        {note ? <span className="truncate font-mono text-[10.5px] text-muted-foreground">{note}</span> : null}
      </header>
      {children}
    </section>
  )
}

function Figure({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="grid gap-0.5">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className="font-mono text-xl leading-none font-medium tabular-nums">{value}</span>
      <span className="font-mono text-[10.5px] text-muted-foreground">{unit}</span>
    </div>
  )
}

const Blank = () => <div className="h-[132px]" />
