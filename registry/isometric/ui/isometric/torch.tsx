"use client"

import { block } from "@/registry/isometric/lib/isometric/blocks"
import { type Entity, entityMount } from "@/registry/isometric/lib/isometric/entity"
import { createFigure } from "@/registry/isometric/lib/isometric/figure"
import type { Vec3 } from "@/registry/isometric/lib/isometric/iso"
import { box } from "@/registry/isometric/lib/isometric/mesh"
import { reducedMotion, spring, step, type Spring } from "@/registry/isometric/lib/isometric/motion"

/**
 * Torch — a torch set in a stone block. Its flame flickers and lights a ring
 * around it; click it to snuff it out in a curl of smoke, and again to light
 * it. With reduced motion the flame holds still. `intensity` sets how much
 * the flame flickers.
 */

export type TorchProps = {
  /** Start lit. Default true. */
  lit?: boolean
}

const S = 20, STICK = 16

type Puff = { p: Vec3; t: number }
type State = { lit: boolean; flame: Spring; t: number; smoke: Puff[] }

const entity: Entity<State, TorchProps> = {
  view: { az: 45, fit: [[-S / 2 - 8, -S / 2 - 8, 0], [S / 2 + 8, S / 2 + 8, 0], [0, 0, S + STICK + 18]], zoom: 0.92 },
  parts: { torch: "Torch", block: "Stone block" },
  init: (p) => ({ lit: p.lit !== false, flame: spring(p.lit !== false ? 1 : 0, 120, 14, 0.005), t: 0, smoke: [] }),
  update: (s, p) => { s.lit = p.lit !== false; s.flame.to = s.lit ? 1 : 0 },
  step: (s, dt) => {
    const moving = step(s.flame, dt)
    s.t += dt
    s.smoke = s.smoke.map((p): Puff => ({ p: [p.p[0] + Math.sin(p.t * 4) * dt * 3, p.p[1], p.p[2] + dt * 14], t: p.t + dt })).filter((p) => p.t < 1.4)
    return moving || s.smoke.length > 0 || (s.lit && !reducedMotion())
  },
  activate: (s, part) => {
    if (part !== "torch") return "Stone"
    s.lit = !s.lit
    s.flame.to = s.lit ? 1 : 0
    if (!s.lit && !reducedMotion()) s.smoke = Array.from({ length: 5 }, (_, i) => ({ p: [0, 0, S + STICK + 2 + i * 2], t: i * 0.12 }))
    return s.lit ? "Torch lit" : "Torch out"
  },
  rest: (s) => (s.lit ? "Torch · lit" : "Torch · out"),
  draw: (s, out, ctx) => {
    out.push(...block("stone", -S / 2, -S / 2, 0, S, { part: "block" }))
    out.push({ mesh: box(-1.2, -1.2, S, 1.2, 1.2, S + STICK), shade: true, tint: "var(--iso-log, #85583a)", part: "torch", bias: 1 })
    const f = s.flame.x
    if (f > 0.02) {
      // the flame: a lit core inside a softer glow, each nudged by a cheap flicker
      const flick = reducedMotion() ? 0 : (Math.sin(s.t * 23) + Math.sin(s.t * 37) * 0.6) * 0.18 * ctx.value
      const g = 3.2 * f * (1 + flick), c = 1.6 * f * (1 - flick * 0.5)
      out.push({ mesh: box(-g, -g, S + STICK, g, g, S + STICK + g * 2.2), cls: "glow", part: "torch", bias: 2 })
      out.push({ mesh: box(-c, -c, S + STICK + 0.6, c, c, S + STICK + 0.6 + c * 2.4), cls: "solid", part: "torch", bias: 3 })
      // the light it throws on the block's lid
      const r = (S / 2 + 6) * f * (1 + flick * 0.3)
      const ring: Vec3[] = Array.from({ length: 32 }, (_, i) => [Math.cos((i / 32) * Math.PI * 2) * r, Math.sin((i / 32) * Math.PI * 2) * r, S + 0.1])
      out.push({ pts: ring, closed: true, cls: "accent dash", bias: 0.5 })
    }
    for (const p of s.smoke) {
      const k = 1 + p.t * 1.5
      out.push({ mesh: box(p.p[0] - k, p.p[1] - k, p.p[2], p.p[0] + k, p.p[1] + k, p.p[2] + k * 2), cls: "lo", inert: true, bias: 4 })
    }
  },
}

export const Torch = createFigure<TorchProps>("Torch", {
  id: "torch",
  label: "A torch set in a stone block; click it to put it out or light it.",
  rest: "Torch · lit",
  range: [0, 1, 2.5],
  focusable: true,
  defaults: { lit: true },
  mount: entityMount(entity),
})

/** The entity behind the figure, for hosts that place many objects together, such as the world. */
export { entity as torchEntity }
