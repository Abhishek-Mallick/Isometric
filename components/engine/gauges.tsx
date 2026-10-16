import * as React from "react"

import { cn } from "@/lib/utils"
import { phase, strokeOf, type Stroke } from "@/anatomy/cycle"
import type { Cylinder } from "@/anatomy/kinematics"

/**
 * Instruments in the drawing's own line: thin arcs, tick marks and one
 * accent for the needle. Everything is SVG in a fixed viewBox, so they scale
 * with their box.
 */

const SWEEP = 250
const START = -90 - SWEEP / 2

/** A point on a circle, rounded so the server and the browser print the same markup. */
const polar = (cx: number, cy: number, r: number, deg: number): [number, number] => {
  const a = (deg * Math.PI) / 180,
    k = (n: number) => Math.round(n * 100) / 100
  return [k(cx + r * Math.cos(a)), k(cy + r * Math.sin(a))]
}
const arc = (cx: number, cy: number, r: number, a0: number, a1: number) => {
  const [x0, y0] = polar(cx, cy, r, a0),
    [x1, y1] = polar(cx, cy, r, a1)
  return `M${x0.toFixed(2)} ${y0.toFixed(2)}A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`
}

/** A round gauge: ticks every `step`, numbered every `every`, with a red zone from `red`. */
export function Dial({
  value,
  min,
  max,
  step,
  every,
  red,
  label,
  unit,
  display,
  scale = 1,
  className,
}: {
  value: number
  min: number
  max: number
  step: number
  every: number
  red?: number
  label: string
  unit: string
  /** The big number, already formatted. */
  display: string
  /** Tick numbers are divided by this (rpm in thousands). */
  scale?: number
  className?: string
}) {
  const at = (v: number) => START + (SWEEP * (Math.min(max, Math.max(min, v)) - min)) / (max - min)
  const ticks: React.ReactNode[] = []
  const per = Math.round(every / step)
  for (let i = 0; i <= Math.round((max - min) / step); i++) {
    const v = min + i * step,
      major = i % per === 0
    const [x0, y0] = polar(60, 60, major ? 43 : 46, at(v)),
      [x1, y1] = polar(60, 60, 50, at(v))
    ticks.push(
      <line
        key={i}
        x1={x0}
        y1={y0}
        x2={x1}
        y2={y1}
        className={cn(major ? "stroke-foreground/70" : "stroke-muted-foreground/45", red !== undefined && v >= red && "stroke-[#e5484d]")}
        strokeWidth={major ? 1.1 : 0.8}
      />,
    )
    if (major) {
      const [tx, ty] = polar(60, 60, 35, at(v))
      ticks.push(
        <text key={`t${i}`} x={tx} y={ty + 2.6} textAnchor="middle" className="fill-muted-foreground font-mono text-[7.5px]">
          {Math.round((v / scale) * 10) / 10}
        </text>,
      )
    }
  }
  const [nx, ny] = polar(60, 60, 47, at(value)),
    [bx, by] = polar(60, 60, -7, at(value))
  return (
    <figure className={cn("grid justify-items-center", className)}>
      <svg viewBox="0 0 120 104" className="w-full max-w-44 overflow-visible" role="img" aria-label={`${label}: ${display} ${unit}`}>
        <path d={arc(60, 60, 50, START, START + SWEEP)} className="fill-none stroke-muted-foreground/40" strokeWidth={0.8} />
        {red !== undefined ? <path d={arc(60, 60, 51.5, at(red), START + SWEEP)} className="fill-none stroke-[#e5484d]" strokeWidth={2.4} /> : null}
        {ticks}
        <line x1={bx} y1={by} x2={nx} y2={ny} className="stroke-ink" strokeWidth={1.6} strokeLinecap="round" />
        <circle cx={60} cy={60} r={3} className="fill-background stroke-ink" strokeWidth={1.2} />
        <text x={60} y={86} textAnchor="middle" className="fill-foreground font-mono text-[15px] font-medium tabular-nums">
          {display}
        </text>
        <text x={60} y={98} textAnchor="middle" className="fill-muted-foreground font-mono text-[7px] tracking-wider uppercase">
          {unit}
        </text>
      </svg>
      <figcaption className="-mt-1 text-[11px] text-muted-foreground">{label}</figcaption>
    </figure>
  )
}

/** A thin bar with its figure: turbo speed, throttle, wastegate. */
export function Meter({ label, value, display, tone = "ink" }: { label: string; value: number; display: string; tone?: "ink" | "warm" }) {
  return (
    <div className="grid gap-1">
      <div className="flex items-baseline justify-between gap-2 text-[11px]">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono tabular-nums">{display}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-[1px] border border-foreground/25 bg-background">
        <div
          className={cn("h-full transition-[width] duration-100", tone === "warm" ? "bg-[#f97316]" : "bg-ink")}
          style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }}
        />
      </div>
    </div>
  )
}

export const STROKE_COLOR: Record<Stroke, string> = { intake: "#3b82f6", compression: "#8b5cf6", power: "#f97316", exhaust: "#a8a29e" }

/**
 * The firing order as a clock: a full face is one cycle (720° of crank), each
 * cylinder sits where it fires, and the hand is the crank angle. Each mark is
 * coloured by the stroke its cylinder is on, so the power strokes chase each
 * other round, one every 60°.
 */
export function FiringRing({
  theta,
  cylinders,
  fired,
  only,
  onPick,
}: {
  theta: number
  cylinders: Cylinder[]
  fired: number
  only?: number
  onPick?: (n: number) => void
}) {
  const hand = polar(60, 60, 34, theta / 2 - 90)
  return (
    <svg viewBox="0 0 120 120" className="w-full max-w-48 overflow-visible" role="img" aria-label={`Firing order. Cylinder ${fired} fired last.`}>
      <circle cx={60} cy={60} r={44} className="fill-none stroke-muted-foreground/35" strokeWidth={0.8} />
      <circle cx={60} cy={60} r={30} className="fill-none stroke-muted-foreground/20" strokeWidth={0.6} strokeDasharray="1.5 2.5" />
      {Array.from({ length: 24 }, (_, i) => {
        const [x0, y0] = polar(60, 60, 42, i * 15 - 90),
          [x1, y1] = polar(60, 60, 44, i * 15 - 90)
        return <line key={i} x1={x0} y1={y0} x2={x1} y2={y1} className="stroke-muted-foreground/45" strokeWidth={0.6} />
      })}
      {cylinders.map((c) => {
        const ph = phase(c, theta),
          st = strokeOf(ph)
        const [x, y] = polar(60, 60, 44, c.fires / 2 - 90)
        const [lx, ly] = polar(60, 60, 54, c.fires / 2 - 90)
        const hot = st === "power" ? 1 - ph / 180 : 0
        return (
          <g key={c.n} className={onPick ? "cursor-pointer" : undefined} onClick={onPick ? () => onPick(c.n) : undefined}>
            <circle
              cx={x}
              cy={y}
              r={c.n === fired ? 4.6 : 3.6}
              fill={STROKE_COLOR[st]}
              fillOpacity={0.35 + 0.65 * Math.max(hot, st === "power" ? 0.4 : 0.25)}
              className={cn("stroke-background", only === c.n && "stroke-ink")}
              strokeWidth={only === c.n ? 1.4 : 0.8}
            />
            <text
              x={lx}
              y={ly + 2.4}
              textAnchor="middle"
              className={cn("font-mono text-[7px]", c.n === fired ? "fill-foreground font-semibold" : "fill-muted-foreground")}
            >
              {c.n}
            </text>
          </g>
        )
      })}
      <line x1={60} y1={60} x2={hand[0]} y2={hand[1]} className="stroke-ink" strokeWidth={1.4} strokeLinecap="round" />
      <circle cx={60} cy={60} r={2.4} className="fill-ink" />
      <text x={60} y={76} textAnchor="middle" className="fill-foreground font-mono text-[8px] tabular-nums">
        {Math.round(theta)}°
      </text>
    </svg>
  )
}
