import { clamp } from "./iso"

/**
 * Isometric — the two clocks, with no DOM. A value that follows the pointer
 * every frame rides a spring, because its target keeps moving; a discrete
 * change (which step, which layer) rides an eased tween.
 *
 * Reduced motion is a flag here rather than a media query, so this file stays
 * pure. `stage.ts` owns the query and sets the flag; with it on, springs and
 * tweens land on their target in one step.
 */

let reduced = false
export const setReducedMotion = (on: boolean) => { reduced = on }
export const reducedMotion = () => reduced

export type Spring = { x: number; v: number; to: number; k: number; c: number; eps: number }

/** A spring at rest on x: stiffness k, damping c, settled within eps. */
export const spring = (x: number, k = 120, c = 20, eps = 0.01): Spring => ({ x, v: 0, to: x, k, c, eps })

/** Advances a spring by dt seconds, substepped at 240 Hz so a long frame cannot overshoot. Returns whether it still moves. */
export function step(s: Spring, dt: number): boolean {
  if (reduced) { s.x = s.to; s.v = 0; return false }
  const n = Math.max(1, Math.ceil(dt * 240)), h = dt / n
  for (let i = 0; i < n; i++) {
    s.v += (-s.k * (s.x - s.to) - s.c * s.v) * h
    s.x += s.v * h
  }
  if (Math.abs(s.x - s.to) < s.eps && Math.abs(s.v) < s.eps * 10) { s.x = s.to; s.v = 0; return false }
  return true
}

/** Steps every spring; true while any still moves. */
export const stepAll = (springs: readonly Spring[], dt: number) => {
  let moving = false
  for (const s of springs) if (step(s, dt)) moving = true
  return moving
}

/** A quint ease-out: quick to leave, slow to land. */
export const easeOut = (t: number) => 1 - Math.pow(1 - clamp(t, 0, 1), 5)

export type Tween = { from: number; to: number; t0: number; dur: number }
export const tween = (v: number, dur = 600): Tween => ({ from: v, to: v, t0: -1e9, dur })
/** Where the tween is at `now` (ms). */
export const at = (tw: Tween, now: number) =>
  tw.from + (tw.to - tw.from) * (reduced ? 1 : easeOut((now - tw.t0) / tw.dur))
/** Retargets from wherever it is now, after `delay` ms. */
export function retarget(tw: Tween, to: number, now: number, delay = 0) {
  if (tw.to === to) return
  tw.from = at(tw, now)
  tw.to = to
  tw.t0 = now + delay
}
export const done = (tw: Tween, now: number) => reduced || now >= tw.t0 + tw.dur
