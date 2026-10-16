import * as React from "react"

import { phase, pressure, strokeOf, sweep, totalTorque, volume, type Charge } from "@/anatomy/cycle"
import type { Cylinder } from "@/anatomy/kinematics"
import { derive, type EngineSpec } from "@/anatomy/spec"

import { STROKE_COLOR } from "./gauges"

/**
 * The thermodynamics, live: one cylinder's pressure against its volume
 * through the four strokes, and the whole engine's crank torque through a
 * cycle. Both are worked out from the same model the simulation runs on, for
 * the charge it has right now.
 */

/** The charge rounded, so small wobbles do not recompute the curves: the same key gives the same object. */
function useStable(q: Charge): Charge {
  const key = [q.intake.toFixed(2), q.exhaust.toFixed(2), q.fill.toFixed(2), q.fuel ? 1 : 0, Math.round(q.advance)].join("|")
  return React.useMemo(() => {
    const [intake, exhaust, fill, fuel, advance] = key.split("|").map(Number)
    return { intake, exhaust, fill, fuel: fuel === 1, advance }
  }, [key])
}

const W = 220,
  H = 132,
  PAD = { l: 26, r: 6, t: 8, b: 18 }

const scaleV = (clearance: number, swept: number) => {
  const v0 = Math.log(clearance * 0.92),
    v1 = Math.log((clearance + swept) * 1.06)
  return (v: number) => PAD.l + ((Math.log(v) - v0) / (v1 - v0)) * (W - PAD.l - PAD.r)
}
const scaleP = (p1: number) => {
  const p0 = Math.log(0.15)
  return (p: number) => H - PAD.b - ((Math.log(Math.max(0.15, p)) - p0) / (p1 - p0)) * (H - PAD.t - PAD.b)
}

/** p–V on log–log axes: compression and expansion are straight lines there, and the pumping loop shows. */
export function PVLoop({ spec, charge, theta, cylinder }: { spec: EngineSpec; charge: Charge; theta: number; cylinder: Cylinder }) {
  const q = useStable(charge)
  const { clearance, swept } = derive(spec)
  const { p1, peak, segs } = React.useMemo(() => {
    const pts = sweep(spec, q, 3)
    const peak = pts.reduce((m, x) => Math.max(m, x.p), 0)
    const p1 = Math.log(Math.max(20, peak) * 1.25)
    const X = scaleV(clearance, swept),
      Y = scaleP(p1)
    // the loop drawn stroke by stroke, each in its own colour
    const out: { st: keyof typeof STROKE_COLOR; d: string }[] = []
    let cur: (typeof out)[number] | null = null
    for (let i = 0; i <= pts.length; i++) {
      const x = pts[i % pts.length],
        st = strokeOf(x.ph)
      const pt = `${X(x.v).toFixed(1)} ${Y(x.p).toFixed(1)}`
      if (!cur || cur.st !== st) {
        if (cur) cur.d += `L${pt}`
        cur = { st, d: `M${pt}` }
        out.push(cur)
      } else cur.d += `L${pt}`
    }
    return { p1, peak, segs: out }
  }, [spec, q, clearance, swept])
  const X = scaleV(clearance, swept),
    Y = scaleP(p1)
  const ph = phase(cylinder, theta)
  const now = { v: volume(spec, ph), p: pressure(spec, ph, q) }
  const ticks = [0.2, 1, 5, 20, 80].filter((p) => Math.log(p) < p1)
  return (
    <figure className="grid gap-1">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full overflow-visible"
        role="img"
        aria-label={`Pressure–volume loop for cylinder ${cylinder.n}. Peak ${peak.toFixed(0)} bar.`}
      >
        {ticks.map((p) => (
          <g key={p}>
            <line x1={PAD.l} x2={W - PAD.r} y1={Y(p)} y2={Y(p)} className="stroke-border" strokeWidth={0.6} />
            <text x={PAD.l - 3} y={Y(p) + 2.4} textAnchor="end" className="fill-muted-foreground font-mono text-[7px]">
              {p}
            </text>
          </g>
        ))}
        <line x1={X(clearance)} x2={X(clearance)} y1={PAD.t} y2={H - PAD.b} className="stroke-border" strokeWidth={0.6} strokeDasharray="2 2" />
        <line x1={X(clearance + swept)} x2={X(clearance + swept)} y1={PAD.t} y2={H - PAD.b} className="stroke-border" strokeWidth={0.6} strokeDasharray="2 2" />
        <text x={X(clearance)} y={H - 6} textAnchor="middle" className="fill-muted-foreground font-mono text-[7px]">
          TDC
        </text>
        <text x={X(clearance + swept)} y={H - 6} textAnchor="middle" className="fill-muted-foreground font-mono text-[7px]">
          BDC
        </text>
        <text x={PAD.l + 3} y={PAD.t + 3} className="fill-muted-foreground font-mono text-[7px]">
          p, bar (log)
        </text>
        {segs.map((s, i) => (
          <path key={i} d={s.d} fill="none" stroke={STROKE_COLOR[s.st]} strokeWidth={1.4} strokeLinejoin="round" />
        ))}
        <circle cx={X(now.v)} cy={Y(now.p)} r={3.2} className="fill-background stroke-ink" strokeWidth={1.6} />
      </svg>
      <figcaption className="flex justify-between font-mono text-[10.5px] text-muted-foreground tabular-nums">
        <span>
          cyl {cylinder.n} · {now.p.toFixed(1)} bar
        </span>
        <span>peak {peak.toFixed(0)} bar</span>
      </figcaption>
    </figure>
  )
}

/** The crank torque of all cylinders together through one cycle, with its mean: twelve overlapping pulses, nearly smooth. */
export function TorqueRipple({ spec, cylinders, charge, theta }: { spec: EngineSpec; cylinders: Cylinder[]; charge: Charge; theta: number }) {
  const q = useStable(charge)
  const pts = React.useMemo(() => Array.from({ length: 241 }, (_, i) => totalTorque(spec, cylinders, i * 3, q)), [spec, cylinders, q])
  const mean = pts.slice(0, 240).reduce((a, b) => a + b, 0) / 240
  const lo = Math.min(0, ...pts),
    hi = Math.max(1, ...pts)
  const X = (deg: number) => PAD.l + (deg / 720) * (W - PAD.l - PAD.r)
  const Y = (t: number) => H - PAD.b - ((t - lo) / (hi - lo)) * (H - PAD.t - PAD.b)
  const d = pts.map((t, i) => `${i ? "L" : "M"}${X(i * 3).toFixed(1)} ${Y(t).toFixed(1)}`).join("")
  const now = totalTorque(spec, cylinders, theta, q)
  return (
    <figure className="grid gap-1">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full overflow-visible"
        role="img"
        aria-label={`Crank torque through a cycle. Mean ${Math.round(mean)} newton metres.`}
      >
        {[0, 180, 360, 540, 720].map((a) => (
          <g key={a}>
            <line x1={X(a)} x2={X(a)} y1={PAD.t} y2={H - PAD.b} className="stroke-border" strokeWidth={0.6} />
            <text x={X(a)} y={H - 6} textAnchor="middle" className="fill-muted-foreground font-mono text-[7px]">
              {a}°
            </text>
          </g>
        ))}
        <line x1={PAD.l} x2={W - PAD.r} y1={Y(0)} y2={Y(0)} className="stroke-muted-foreground/50" strokeWidth={0.6} />
        <line x1={PAD.l} x2={W - PAD.r} y1={Y(mean)} y2={Y(mean)} className="stroke-ink/60" strokeWidth={0.8} strokeDasharray="3 2" />
        <text x={PAD.l - 3} y={Y(mean) + 2.4} textAnchor="end" className="fill-muted-foreground font-mono text-[7px]">
          {Math.round(mean)}
        </text>
        <text x={PAD.l + 3} y={PAD.t + 3} className="fill-muted-foreground font-mono text-[7px]">
          N·m
        </text>
        <path d={d} fill="none" className="stroke-foreground/80" strokeWidth={1.2} strokeLinejoin="round" />
        <line x1={X(theta)} x2={X(theta)} y1={PAD.t} y2={H - PAD.b} className="stroke-ink" strokeWidth={1} />
        <circle cx={X(theta)} cy={Y(now)} r={2.8} className="fill-background stroke-ink" strokeWidth={1.4} />
      </svg>
      <figcaption className="flex justify-between font-mono text-[10.5px] text-muted-foreground tabular-nums">
        <span>now {Math.round(now)} N·m</span>
        <span>
          mean {Math.round(mean)} · ±{Math.round((hi - lo) / 2)}
        </span>
      </figcaption>
    </figure>
  )
}
