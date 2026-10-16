import { pistonDrop, rad, rodAngle, wrap, type Cylinder } from "./kinematics"
import { derive, type EngineSpec, type ValveTiming } from "./spec"

/**
 * Anatomy — the four-stroke cycle. A cylinder's phase runs 0…720 crank
 * degrees from top dead centre at the start of its power stroke:
 *
 *   0–180 power · 180–360 exhaust · 360–540 intake · 540–720 compression
 *
 * The valves open and close by the spec's timing (overlapping at the top of
 * the exhaust stroke), the spark fires `advance` degrees before the top, and
 * the gas pressure follows from the volume: polytropic compression and
 * expansion, a Wiebe burn, then blowdown and the pumping strokes.
 */

export type Stroke = "power" | "exhaust" | "intake" | "compression"
export const STROKES: Stroke[] = ["power", "exhaust", "intake", "compression"]

/** A cylinder's place in its cycle at crank angle θ (degrees, 0…720 and on). */
export const phase = (c: Cylinder, thetaDeg: number) => wrap(thetaDeg - c.fires, 720)

export const strokeOf = (ph: number): Stroke => STROKES[Math.floor(wrap(ph, 720) / 180)]

/** 0…1 through a valve's open period at this phase, or −1 while it is shut. */
function through(v: ValveTiming, ph: number) {
  const span = v.close - v.open
  const t = wrap(ph - v.open, 720) / span
  return t <= 1 ? t : -1
}

/** Valve lift in mm: a smooth lobe, sin²(πt) across the open period. */
export function lift(v: ValveTiming, ph: number) {
  const t = through(v, ph)
  return t < 0 ? 0 : v.lift * Math.sin(Math.PI * t) ** 2
}

/**
 * Where a cam lobe's nose points, as an angle in the crank's plane, with the
 * camshaft turning at half crank speed. The nose faces down the bore (toward
 * the valve) at the middle of the valve's open period.
 */
export function lobe(c: Cylinder, v: ValveTiming, thetaDeg: number) {
  const mid = (v.open + v.close) / 2
  const offset = c.lean + Math.PI - rad((c.fires + mid) / 2)
  return rad(thetaDeg / 2) + offset
}

/** Spark advance, crank degrees before top dead centre, rising with rpm. */
export const advance = (s: EngineSpec, rpm: number) => s.advance[0] + (s.advance[1] - s.advance[0]) * Math.min(1, Math.max(0, rpm / s.redline))

/** Burned fraction, by the Wiebe function, `u` crank degrees from the top (negative before it). */
export function burned(s: EngineSpec, u: number, adv: number) {
  const start = -adv * 0.6
  if (u <= start) return 0
  const x = (u - start) / s.burnAngle
  return 1 - Math.exp(-5 * x ** 3)
}

/** Cylinder volume at a phase, mm³. */
export function volume(s: EngineSpec, ph: number) {
  const { r, area, clearance } = derive(s)
  return clearance + area * pistonDrop(r, s.rod, rad(ph))
}

/** What a cylinder breathes and burns this cycle. */
export type Charge = {
  /** Manifold pressure, bar absolute. */
  intake: number
  /** Exhaust back pressure, bar absolute. */
  exhaust: number
  /** How well the cylinder fills at this rpm, about 0.8…1. */
  fill: number
  /** False with the fuel cut: the gas is only compressed and let out again. */
  fuel: boolean
  /** Spark advance, degrees before the top. */
  advance: number
}

/** Gas pressure in the cylinder at a phase, bar absolute. */
export function pressure(s: EngineSpec, ph: number, q: Charge) {
  ph = wrap(ph, 720)
  const ivc = s.intake.close - 720,
    evo = s.exhaust.open
  // the valves are shut from intake closing (before the top) to exhaust opening (after it)
  const u = ph >= 360 ? ph - 720 : ph
  const trapped = q.intake * q.fill
  const closedAt = (uu: number) => {
    const p = trapped * (volume(s, ivc + 720) / volume(s, wrap(uu, 720))) ** s.gamma
    return q.fuel ? p * (1 + (s.burn - 1) * burned(s, uu, q.advance)) : p
  }
  if (u >= ivc && u <= evo) return closedAt(u)
  if (ph > evo && ph < 180 + 30) {
    // blowdown: the charge rushes out through the opening exhaust valves
    const p0 = closedAt(evo)
    return q.exhaust + (p0 - q.exhaust) * Math.exp(-(ph - evo) / 11)
  }
  if (ph < 360) return q.exhaust
  return q.intake
}

/** Crank torque from one cylinder, N·m: T = p A r sin(α + φ) / cos φ, with p over the crankcase. */
export function torque(s: EngineSpec, ph: number, p: number) {
  const { r, area } = derive(s)
  const a = rad(ph),
    phi = rodAngle(r, s.rod, a)
  const force = (p - 1) * 1e5 * area * 1e-6
  return (force * r * 1e-3 * Math.sin(a + phi)) / Math.cos(phi)
}

/** One cylinder's p–V loop and torque round a whole cycle, every `step` degrees. */
export function sweep(s: EngineSpec, q: Charge, step = 4) {
  const pts: { ph: number; v: number; p: number; t: number }[] = []
  for (let ph = 0; ph < 720; ph += step) {
    const p = pressure(s, ph, q)
    pts.push({ ph, v: volume(s, ph), p, t: torque(s, ph, p) })
  }
  return pts
}

/** Mean crank torque of the whole engine over a cycle, N·m (indicated: before friction). */
export function meanTorque(s: EngineSpec, q: Charge, step = 4) {
  const pts = sweep(s, q, step)
  const one = pts.reduce((sum, x) => sum + x.t, 0) / pts.length
  return one * derive(s).cylinders
}

/** The engine's crank torque at θ: every cylinder's at its own phase. */
export function totalTorque(s: EngineSpec, cyls: readonly Cylinder[], thetaDeg: number, q: Charge) {
  let t = 0
  for (const c of cyls) {
    const ph = phase(c, thetaDeg)
    t += torque(s, ph, pressure(s, ph, q))
  }
  return t
}
