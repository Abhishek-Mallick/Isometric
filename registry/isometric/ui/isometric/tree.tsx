"use client"

import { block } from "@/registry/isometric/lib/isometric/blocks"
import { type Entity, entityMount } from "@/registry/isometric/lib/isometric/entity"
import { createFigure } from "@/registry/isometric/lib/isometric/figure"
import type { Vec3 } from "@/registry/isometric/lib/isometric/iso"
import { reducedMotion, spring, stepAll, type Spring } from "@/registry/isometric/lib/isometric/motion"
import type { Drawable, Stroke } from "@/registry/isometric/lib/isometric/scene"

/**
 * Tree — a block tree: a log trunk under a crown of leaves. Its leaves sway
 * while the pointer is over it; click to shake it, and a few leaves fall.
 * `intensity` sets how hard it sways.
 */

const B = 8

/** The crown: a 5 × 5 layer, another 5 × 5 with its corners cut, and a cross on top. */
const crown: [number, number, number][] = []
for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) {
  crown.push([i, j, 4])
  if (Math.abs(i) + Math.abs(j) < 4) crown.push([i, j, 5])
  if (Math.abs(i) <= 1 && Math.abs(j) <= 1 && Math.abs(i) + Math.abs(j) < 2) crown.push([i, j, 6])
}

type Leaf = { p: Vec3; t: number }
type State = { sway: Spring; shake: Spring; t: number; hot: boolean; leaves: Leaf[] }

/** Blocks back to front are sorted by the scene; a draw helper places one by its grid cell. */
const cell = (out: (Drawable | Stroke)[], type: "log" | "leaves", i: number, j: number, k: number, dx: number, part: string) =>
  out.push(...block(type, i * B - B / 2 + dx, j * B - B / 2, k * B, B, { part }))

const entity: Entity<State, object> = {
  view: { az: 45, fit: [[-3 * B, -3 * B, 0], [3 * B, 3 * B, 0], [0, 0, 7 * B]], zoom: 0.92 },
  parts: { leaves: "Leaves", trunk: "Trunk" },
  init: () => ({ sway: spring(0, 40, 4, 0.01), shake: spring(0, 160, 6, 0.01), t: 0, hot: false, leaves: [] }),
  pointer: (s, e) => { s.hot = !!e?.part },
  step: (s, dt, ctx) => {
    s.t += dt
    s.sway.to = s.hot && !reducedMotion() ? Math.sin(s.t * 2.2) * 0.9 * ctx.value : 0
    const moving = stepAll([s.sway, s.shake], dt)
    s.leaves = s.leaves.map((l): Leaf => ({ p: [l.p[0] + Math.sin(l.t * 3) * dt * 8, l.p[1], l.p[2] - dt * 16], t: l.t + dt })).filter((l) => l.p[2] > 0)
    return moving || s.hot || s.leaves.length > 0
  },
  activate: (s, _part, ctx) => {
    if (!reducedMotion()) {
      s.shake.v += 18 * ctx.value
      s.leaves.push(...[0, 1, 2].map((i): Leaf => ({ p: [(i - 1) * 9, (i % 2) * 6 - 3, 4 * B], t: i * 0.3 })))
    }
    return "Shaken: three leaves fall"
  },
  rest: () => "Tree",
  draw: (s, out) => {
    for (let k = 0; k < 4; k++) cell(out, "log", 0, 0, k, 0, "trunk")
    for (const [i, j, k] of crown) cell(out, "leaves", i, j, k, (s.sway.x + s.shake.x) * (k - 3) * 0.8, "leaves")
    for (const l of s.leaves) out.push(...block("leaves", l.p[0] - 1.5, l.p[1] - 1.5, l.p[2], 3, { inert: true }))
  },
}

export const Tree = createFigure("Tree", {
  id: "tree",
  label: "A block tree; it sways while the pointer is over it, and shakes leaves loose when clicked.",
  rest: "Tree",
  range: [0.3, 1, 2],
  focusable: true,
  defaults: {},
  mount: entityMount(entity),
})
