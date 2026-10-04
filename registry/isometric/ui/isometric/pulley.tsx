"use client"

import { type Entity, entityMount } from "@/registry/isometric/lib/isometric/entity"
import { createFigure } from "@/registry/isometric/lib/isometric/figure"
import { clamp, type Vec3 } from "@/registry/isometric/lib/isometric/iso"
import { box, cylinder, rotateX, translate } from "@/registry/isometric/lib/isometric/mesh"
import { spring, step, type Spring } from "@/registry/isometric/lib/isometric/motion"
import type { Drawable, Stroke } from "@/registry/isometric/lib/isometric/scene"

/**
 * Pulley — a block and tackle on a frame. Drag the rope's handle down and the
 * load rises by the pull divided by the ratio; the wheels turn with the rope.
 * A ratchet holds the load: click it to let it down. Click the handle, or
 * press Enter on it, to pull a notch. `intensity` sets how much rope a drag
 * pulls.
 */

export type PulleyProps = {
  /** Mechanical advantage: the rope runs under this many supporting lines. */
  ratio?: 2 | 4
  /** The load, in kilograms, for the caption. */
  load?: number
}

/** PULL is the most rope the handle can take in: it travels exactly that far, so it stays above the base. */
const R = 5.5, TOP = 74, FIX = 63, PULL = 34, REST = 16, HAND = 40

type State = { ratio: 2 | 4; kg: number; pull: Spring; held: number | null; grab: number }

/** Wheel centres along x: moving wheels hang under the load bar, fixed ones under the beam. */
function layout(ratio: 2 | 4) {
  const n = ratio / 2
  const moving = Array.from({ length: n }, (_, i) => -12 + R + i * 4 * R)
  const fixed = moving.map((x) => x + 2 * R)
  return { moving, fixed, anchor: moving[0] - R, hand: fixed[n - 1] + R }
}

/** A wheel facing the camera's front (axis along y): disc, axle and spokes turned by `a`. */
function wheel(out: (Drawable | Stroke)[], x: number, z: number, a: number, part: string) {
  const disc = translate(rotateX(cylinder(0, 0, -1.2, R, 2.4, 24), -Math.PI / 2), [x, 0, z])
  out.push({ mesh: disc, smooth: true, part })
  const spokes: Vec3[] = []
  for (let i = 0; i < 3; i++) {
    const t = a + (i / 3) * Math.PI * 2
    spokes.push([x - Math.cos(t) * (R - 1.2), 1.25, z - Math.sin(t) * (R - 1.2)], [x + Math.cos(t) * (R - 1.2), 1.25, z + Math.sin(t) * (R - 1.2)])
  }
  for (let i = 0; i < spokes.length; i += 2) out.push({ pts: [spokes[i], spokes[i + 1]], cls: "lo", part, bias: 0.05 })
}

/** Half a circle of rope around a wheel: under it (`down`) or over it. */
const arc = (x: number, z: number, down: boolean): Vec3[] =>
  Array.from({ length: 13 }, (_, i) => {
    const t = Math.PI * (i / 12)
    return [x - R * Math.cos(t), 1.3, z + (down ? -1 : 1) * R * Math.sin(t)]
  })

const entity: Entity<State, PulleyProps> = {
  view: { az: 24, fit: [[-36, -6, 0], [46, 6, 0], [-36, -6, TOP + 6], [46, 6, TOP + 6]], zoom: 0.98 },
  parts: { rope: "Rope end: drag down to lift", load: "Load", fixed: "Fixed pulley", moving: "Moving pulley" },
  init: (p) => ({ ratio: p.ratio === 4 ? 4 : 2, kg: p.load ?? 40, pull: spring(0, 90, 15, 0.01), held: null, grab: 0 }),
  update: (s, p) => {
    const r = p.ratio === 4 ? 4 : 2
    if (r !== s.ratio) { s.ratio = r; s.pull.to = s.pull.x = 0 }
    s.kg = p.load ?? 40
  },
  pointer: (s, e, ctx) => {
    if (!e || !e.down) { s.held = null; return }
    if (s.held === null && e.from && e.part === "rope") { s.held = e.from[1]; s.grab = s.pull.to }
    if (s.held === null) return
    // screen units to world height, then the intensity's gain
    const perUnit = 1 / (ctx.camera.s * Math.sqrt(1 - ctx.camera.k ** 2))
    s.pull.to = clamp(s.grab + (e.p[1] - s.held) * perUnit * ctx.value, 0, PULL)
    return Math.abs(e.p[1] - s.held) > 2
  },
  step: (s, dt, ctx) => {
    const moving = step(s.pull, dt)
    if (moving || s.held !== null) {
      const lift = s.pull.x / s.ratio
      ctx.read(`pull ${s.pull.x.toFixed(0)} · lift ${lift.toFixed(1)} · ${s.ratio}:1 · ${(s.kg / s.ratio).toFixed(0)} kg of force`)
    }
    return moving
  },
  activate: (s, part) => {
    if (part === "load") { s.pull.to = 0; return "Ratchet released: the load comes down" }
    if (part === "rope") { s.pull.to = Math.min(PULL, s.pull.to + 6); return `Pulled a notch · lift ${(s.pull.to / s.ratio).toFixed(0)}` }
    if (part === "fixed") return `Fixed pulley: turns the pull downward`
    if (part === "moving") return `Moving pulley: ${s.ratio} lines share ${s.kg} kg`
    return undefined
  },
  rest: (s) => `${s.ratio}:1 · ${s.kg} kg`,
  draw: (s, out) => {
    const { moving, fixed, anchor, hand } = layout(s.ratio)
    const lift = s.pull.x / s.ratio
    const mz = REST + lift + 18, turn = s.pull.x / R

    // the frame: a base, two posts and the beam
    out.push({ mesh: box(-36, -8, 0, 46, 8, 2), shade: true, bias: -100 })
    out.push({ mesh: box(-34, -3, 2, -30, 3, TOP), shade: true })
    out.push({ mesh: box(40, -3, 2, 44, 3, TOP), shade: true })
    out.push({ mesh: box(-34, -3, TOP, 44, 3, TOP + 4), shade: true })

    // fixed wheels on their hangers, moving wheels on the load bar
    for (const x of fixed) {
      out.push({ pts: [[x, 0, TOP], [x, 0, FIX + R]], cls: "mid", part: "fixed" })
      wheel(out, x, FIX, turn, "fixed")
    }
    for (const x of moving) wheel(out, x, mz, -turn, "moving")
    out.push({ mesh: box(moving[0] - 2, -1.6, mz - 1, moving[moving.length - 1] + 2, -1.2, mz + 1), part: "moving", bias: 0.2 })

    // the load, on a hook under the bar
    const cx = (moving[0] + moving[moving.length - 1]) / 2, lz = mz - R - 14
    out.push({ pts: [[cx, 0, mz - R + 0.5], [cx, 0, lz + 11]], cls: "mid", part: "load" })
    out.push({ mesh: box(cx - 8, -6, lz - 1, cx + 8, 6, lz + 11), shade: true, part: "load", cls: s.pull.x > 0.5 ? "hi" : "" })
    out.push({ pts: [[cx - 8, 6.05, lz + 3], [cx + 8, 6.05, lz + 3]], cls: "lo", part: "load", bias: 0.1 })

    // the rope: from the anchor, under and over each wheel in turn, down to the handle
    const rope: Vec3[] = [[anchor, 1.3, TOP]]
    moving.forEach((x, i) => {
      rope.push(...arc(x, mz, true))
      rope.push(...arc(fixed[i], FIX, false))
    })
    // rope is conserved: the handle comes down exactly as far as the rope is pulled
    const hz = HAND - s.pull.x
    rope.push([hand, 1.3, hz])
    out.push({ pts: rope, cls: "hi", part: "rope", bias: 3 })
    out.push({ mesh: box(hand - 4, -1.2, hz - 2.4, hand + 4, 1.2, hz), part: "rope", shade: true, bias: 3.1 })
  },
}

export const Pulley = createFigure<PulleyProps>("Pulley", {
  id: "pulley",
  label: "A block and tackle on a frame; drag the rope's handle down to lift the load.",
  rest: "2:1 · 40 kg",
  range: [0.6, 1, 1.6],
  focusable: true,
  defaults: { ratio: 2, load: 40 },
  mount: entityMount(entity),
})

/** The entity behind the figure, for hosts that place many objects together, such as the world. */
export { entity as pulleyEntity }
