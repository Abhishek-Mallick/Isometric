import type { EngineSpec } from "./spec"

/**
 * Anatomy — a turbocharger. Exhaust flow sets the speed the shaft heads
 * for; the shaft gets there as a first-order lag (`spool` up, `fall` down),
 * which is the lag you feel. Boost rises with the square of shaft speed, as
 * a compressor's pressure ratio does, until the wastegate opens and holds
 * it. Shut the throttle under boost and the blow-off valve vents the charge.
 */

export type Turbo = {
  /** Shaft speed, rpm. */
  speed: number
  /** Boost at the compressor outlet, bar over outside air. */
  boost: number
  /** How far the wastegate is open, 0…1. */
  gate: number
  /** Seconds the blow-off valve has left to vent. */
  vent: number
  /** Throttle last step, to catch a lift-off. */
  was: number
}

export const turbo = (): Turbo => ({ speed: 0, boost: 0, gate: 0, vent: 0, was: 0 })

/** Boost a shaft speed makes before the wastegate, bar. */
export function boostAt(s: EngineSpec, speed: number) {
  const t = s.turbo,
    f = Math.max(0, (speed - t.idle) / (t.max - t.idle))
  return t.boost * f * f
}

/** The speed that makes `boost`, the inverse of `boostAt`. */
export function speedFor(s: EngineSpec, boost: number) {
  const t = s.turbo
  return t.idle + (t.max - t.idle) * Math.sqrt(Math.max(0, boost) / t.boost)
}

/** Where the wastegate holds boost at this rpm: flat, then tapering toward the redline. */
export function gateAt(s: EngineSpec, rpm: number) {
  const t = s.turbo,
    k = Math.min(1, Math.max(0, (rpm - 0.7 * s.redline) / (0.3 * s.redline)))
  return t.gate + (t.taper - t.gate) * k
}

/**
 * Advances a turbo by dt seconds. `flow` is the exhaust flow as a fraction of
 * flow at the redline on full boost; `throttle` the throttle opening.
 */
export function stepTurbo(s: EngineSpec, tb: Turbo, dt: number, rpm: number, flow: number, throttle: number) {
  const t = s.turbo
  const raw = rpm > 0 ? t.idle * Math.min(1, rpm / s.idle) + (t.max - t.idle) * Math.max(0, flow) ** 0.8 : 0
  const cap = speedFor(s, gateAt(s, rpm))
  const target = Math.min(raw, cap)
  tb.gate = raw > cap ? Math.min(1, (raw - cap) / (0.25 * (t.max - t.idle))) : 0
  const tau = target > tb.speed ? t.spool : t.fall
  tb.speed += (target - tb.speed) * (1 - Math.exp(-dt / tau))
  // lifting off under boost: the blow-off valve opens and the pressure dumps
  if (tb.was - throttle > 0.25 && tb.boost > 0.3) tb.vent = 0.7
  tb.was = throttle
  tb.vent = Math.max(0, tb.vent - dt)
  const made = boostAt(s, tb.speed)
  // a shut throttle dead-heads the compressor; the valve, when open, bleeds what it makes
  const want = tb.vent > 0 ? made * 0.08 : made * (0.35 + 0.65 * throttle)
  tb.boost += (want - tb.boost) * (1 - Math.exp(-dt / (tb.vent > 0 ? 0.08 : 0.12)))
  return tb
}
