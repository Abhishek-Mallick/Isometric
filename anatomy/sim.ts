import { advance, meanTorque, type Charge } from "./cycle"
import { layout, type Cylinder } from "./kinematics"
import { derive, type EngineSpec } from "./spec"
import { stepTurbo, turbo, type Turbo } from "./turbo"

/**
 * Anatomy — the running engine. Two clocks run here:
 *
 * - the simulation, in real seconds: rpm from the torque balance
 *   J·dω/dt = T_engine − T_friction − T_load (+ the starter), the idle
 *   control, the rev limiter, the turbos and the manifold;
 * - the display crank angle, which turns at a chosen speed, since 6,500 rpm
 *   is over a hundred turns a second and no screen can show it. The readouts
 *   stay real; the picture slows down.
 */

export type Run = "off" | "cranking" | "running" | "stopping"

/** How fast the picture turns: real time, slowed, or `auto` (slow at idle, quicker as it revs). */
export type Pace = "auto" | 1 | 0.1 | 0.02

export type Sim = {
  run: Run
  /** Crank speed, rpm. */
  rpm: number
  /** The throttle asked for, 0…1, and where the blade is (it follows quickly). */
  pedal: number
  throttle: number
  /** The idle bypass's opening, 0…0.4, set by the idle control. */
  idler: number
  /** Fuel cut by the rev limiter. */
  cut: boolean
  /** Display crank angle, degrees; grows without bound (wrap it for 0…720). */
  theta: number
  pace: Pace
  /** Held by hand: the picture follows the scrubber, not the clock. */
  held: boolean
  /** One turbo per bank. */
  turbos: Turbo[]
  /** Manifold pressure, bar absolute. */
  map: number
  /** Indicated torque, friction, load and brake torque, N·m; brake power, kW. */
  indicated: number
  friction: number
  load: number
  torque: number
  power: number
  /** Seconds since the starter engaged. */
  cranked: number
  /** Simulated seconds. */
  t: number
}

export const ATMOSPHERE = 1.013

export function sim(s: EngineSpec): Sim {
  return {
    run: "off",
    rpm: 0,
    pedal: 0,
    throttle: 0,
    idler: 0.16,
    cut: false,
    theta: 0,
    pace: "auto",
    held: false,
    turbos: Array.from({ length: s.banks }, turbo),
    map: ATMOSPHERE,
    indicated: 0,
    friction: 0,
    load: 0,
    torque: 0,
    power: 0,
    cranked: 0,
    t: 0,
  }
}

/** How well the cylinders fill at an rpm: a broad hump, best in the middle of the range. */
export const fill = (s: EngineSpec, rpm: number) => {
  const x = (rpm - 0.62 * s.redline) / (0.62 * s.redline)
  return Math.max(0.72, 0.98 - 0.22 * x * x)
}

/** Losses in the engine itself, N·m: rubbing and pumping the oil and water, rising with speed. */
export const frictionAt = (rpm: number) => (rpm <= 0 ? 0 : 42 + 0.0062 * rpm + 1.5e-6 * rpm * rpm)

/** The dyno's brake, N·m: rises with the square of speed, like a car's drag, so each throttle finds its own rpm. */
export const loadAt = (s: EngineSpec, rpm: number) => 0.5 * s.torque * (0.3 * (rpm / s.limiter) + 0.7 * (rpm / s.limiter) ** 2)

/**
 * Manifold pressure, bar absolute: deep vacuum at idle, boost at full
 * throttle. Air comes past the throttle blade (progressive, so the first
 * part of the pedal is gentle) and through the idle bypass.
 */
export function manifold(throttle: number, boost: number, bypass = 0) {
  const open = Math.min(1, 0.06 + 0.94 * Math.max(0, throttle) ** 1.9 + bypass)
  return (ATMOSPHERE + boost) * (0.06 + 0.94 * open)
}

/** What each cylinder takes in this cycle, from the engine's state. */
export function charge(s: EngineSpec, e: Sim): Charge {
  const boost = e.turbos.reduce((a, t) => a + t.boost, 0) / e.turbos.length
  return {
    intake: e.map,
    exhaust: ATMOSPHERE + 0.04 + 0.7 * boost,
    fill: fill(s, e.rpm),
    fuel: (e.run === "running" || e.run === "cranking") && !e.cut && e.rpm > 120,
    advance: advance(s, e.rpm),
  }
}

/** Revolutions a second the picture turns at. */
export function displayRate(s: EngineSpec, e: Sim) {
  if (e.held || e.rpm <= 0) return 0
  if (e.pace === "auto") return 3.2 * (e.rpm / s.redline) ** 0.75
  return (e.rpm / 60) * e.pace
}

export function start(e: Sim) {
  if (e.run === "off" || e.run === "stopping") {
    e.run = "cranking"
    e.cranked = 0
  }
}

export function stop(e: Sim) {
  if (e.run !== "off") e.run = "stopping"
}

const STEP = 1 / 240

/** Advances the engine by dt real seconds. */
export function step(s: EngineSpec, e: Sim, dt: number) {
  dt = Math.min(dt, 0.1)
  const J = s.inertia
  for (let left = dt; left > 1e-9; left -= STEP) {
    const h = Math.min(STEP, left)
    e.t += h
    e.throttle += (e.pedal - e.throttle) * (1 - Math.exp(-h / 0.07))
    // the idle bypass holds idle while the pedal is up (integral control, plus a kick when the revs sag);
    // with the pedal down it holds still, so it never fights the driver
    const lit = e.run === "running" || e.run === "cranking"
    const err = (s.idle - e.rpm) / s.idle
    if (e.run === "running" && e.pedal < 0.02) e.idler = Math.min(0.4, Math.max(0, e.idler + 0.6 * err * h))
    const bypass = lit ? e.idler + 0.4 * Math.max(0, err) : 0
    // the limiter cuts fuel at the top and brings it back a little lower, so the needle bounces
    if (e.rpm >= s.limiter) e.cut = true
    else if (e.cut && e.rpm < s.limiter - s.hysteresis) e.cut = false

    const boost = e.turbos.reduce((a, t) => a + t.boost, 0) / e.turbos.length
    const target = manifold(e.throttle, boost, bypass)
    e.map += (target - e.map) * (1 - Math.exp(-h / 0.05))
    const q = charge(s, e)
    e.indicated = e.rpm > 0 || e.run === "cranking" ? meanTorque(s, q, 6) : 0
    e.friction = frictionAt(e.rpm)
    e.load = e.run === "running" ? loadAt(s, e.rpm) : 0
    let starter = 0
    if (e.run === "cranking") {
      e.cranked += h
      starter = Math.max(0, 260 * (1 - e.rpm / 320))
      if (e.rpm > 480) e.run = "running"
      // a start that never catches gives up
      if (e.cranked > 4) e.run = "stopping"
    }
    const net = e.indicated - e.friction - e.load + starter
    const w = (e.rpm * Math.PI) / 30 + (net / J) * h
    e.rpm = Math.max(0, (w * 30) / Math.PI)
    if (e.run === "stopping" && e.rpm < 25) {
      e.run = "off"
      e.rpm = 0
    }
    if (e.run === "off") e.rpm = 0

    const flow = (e.rpm / (0.4 * s.redline)) * (e.map / (ATMOSPHERE + s.turbo.gate)) * (q.fuel ? 1 : 0.3)
    for (const tb of e.turbos) stepTurbo(s, tb, h, e.rpm, flow, e.throttle)
  }
  e.torque = e.indicated - e.friction
  e.power = (e.torque * e.rpm * Math.PI) / 30 / 1000
  if (!e.held) e.theta += displayRate(s, e) * 360 * dt
  return e
}

/** The engine's fixed facts, worked out once. */
export function engine(s: EngineSpec) {
  return { spec: s, ...derive(s), layout: layout(s) as Cylinder[] }
}
