"use client"

import { type Entity, entityMount } from "@/registry/isometric/lib/isometric/entity"
import { createFigure } from "@/registry/isometric/lib/isometric/figure"
import type { Vec2, Vec3 } from "@/registry/isometric/lib/isometric/iso"
import { box, extrude, rotateX, rotateZ, scale, translate } from "@/registry/isometric/lib/isometric/mesh"
import { reducedMotion, spring, step, type Spring } from "@/registry/isometric/lib/isometric/motion"

/**
 * Heart — a heart, cut from a slab and stood up, beating. Point at it and it
 * beats faster; click it to like it, and it fills and throws off a burst of
 * cubes. With reduced motion it holds still and the burst is skipped.
 * `intensity` sets the resting pulse.
 */

export type HeartProps = {
  /** Whether it is liked. Clicking toggles it; pass it to control it. */
  liked?: boolean
}

const R = 1.35, THICK = 7, FLOAT = 10

/** The classic heart curve, tip at the bottom, stood on the ground plane as x and up. */
const outline: Vec2[] = Array.from({ length: 48 }, (_, i) => {
  const t = (i / 48) * Math.PI * 2
  return [16 * Math.sin(t) ** 3 * R, (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t) + 17) * R]
})
const TOP = Math.max(...outline.map((p) => p[1]))
const slab = rotateX(extrude(outline, -THICK / 2, THICK / 2, true), Math.PI / 2)

type Bit = { p: Vec3; v: Vec3; a: number; life: number }
type State = { liked: boolean; bpm: Spring; phase: number; hot: boolean; bits: Bit[]; fill: Spring }

/** Two thumps a beat: lub, then a softer dub. */
const thump = (t: number) => Math.exp(-((t / 0.07) ** 2)) + 0.55 * Math.exp(-(((t - 0.2) / 0.07) ** 2))

const entity: Entity<State, HeartProps> = {
  view: { az: 18, fit: [[-24, -10, 0], [24, 10, 0], [-24, -10, FLOAT + TOP + 8], [24, 10, FLOAT + TOP + 8]], zoom: 0.9 },
  parts: { heart: "Heart" },
  init: (p) => ({ liked: !!p.liked, bpm: spring(72, 30, 11, 0.5), phase: 0, hot: false, bits: [], fill: spring(p.liked ? 1 : 0, 120, 16, 0.01) }),
  update: (s, p) => { if (p.liked !== undefined && p.liked !== s.liked) { s.liked = p.liked; s.fill.to = s.liked ? 1 : 0 } },
  pointer: (s, e, ctx) => { s.hot = !!e?.part; s.bpm.to = ctx.value * (s.hot ? 1.6 : 1) },
  step: (s, dt, ctx) => {
    if (!s.hot) s.bpm.to = ctx.value
    const moving = step(s.bpm, dt) || step(s.fill, dt)
    if (!reducedMotion()) s.phase = (s.phase + (dt * s.bpm.x) / 60) % 1
    for (const b of s.bits) {
      b.v[2] -= 70 * dt
      b.p = [b.p[0] + b.v[0] * dt, b.p[1] + b.v[1] * dt, Math.max(0, b.p[2] + b.v[2] * dt)]
      b.a += dt * 6
      b.life -= dt
    }
    s.bits = s.bits.filter((b) => b.life > 0)
    ctx.read(s.hot || s.liked ? `${s.liked ? "Liked · " : ""}${Math.round(s.bpm.x)} bpm` : "Heart")
    // it beats for as long as it is on screen, unless motion is reduced
    return !reducedMotion() || moving || s.bits.length > 0
  },
  activate: (s) => {
    s.liked = !s.liked
    s.fill.to = s.liked ? 1 : 0
    if (s.liked && !reducedMotion()) {
      s.bits = Array.from({ length: 14 }, (_, i) => {
        const a = (i / 14) * Math.PI * 2
        return { p: [0, 0, FLOAT + TOP * 0.55], v: [Math.cos(a) * 34, Math.sin(a) * 14, 30 + (i % 3) * 14], a: i, life: 0.9 + (i % 4) * 0.1 }
      })
    }
    return s.liked ? "Liked" : "Not liked"
  },
  rest: (s) => (s.liked ? "Liked" : "Heart"),
  draw: (s, out) => {
    const k = 1 + 0.07 * thump(s.phase)
    const bob = Math.sin(s.phase * Math.PI * 2) * 0.6
    const body = translate(scale(slab, k, [0, 0, TOP / 2]), [0, 0, FLOAT + bob])
    out.push({ mesh: body, smooth: true, part: "heart", cls: s.fill.x > 0.5 ? "glow hi" : "", bias: 1 })
    // its shadow on the ground, smaller as it rises
    const ring: Vec3[] = Array.from({ length: 32 }, (_, i) => {
      const a = (i / 32) * Math.PI * 2
      return [Math.cos(a) * 15 * k, Math.sin(a) * 5, 0]
    })
    out.push({ pts: ring, closed: true, cls: "dash lo", bias: -50 })
    for (const b of s.bits) {
      const c = rotateZ(box(-1.4, -1.4, -1.4, 1.4, 1.4, 1.4), b.a)
      out.push({ mesh: translate(c, b.p), cls: b.life > 0.3 ? "glow hi" : "lo", inert: true, bias: 2 })
    }
  },
}

export const Heart = createFigure<HeartProps>("Heart", {
  id: "heart",
  label: "A beating heart; point at it to quicken the pulse, click it to like it.",
  rest: "Heart",
  range: [48, 72, 120],
  focusable: true,
  defaults: { liked: undefined },
  mount: entityMount(entity),
})
