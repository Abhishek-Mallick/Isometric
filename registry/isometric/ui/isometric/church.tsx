"use client"

import { type Entity, entityMount } from "@/registry/isometric/lib/isometric/entity"
import { createFigure } from "@/registry/isometric/lib/isometric/figure"
import type { Vec3 } from "@/registry/isometric/lib/isometric/iso"
import { box, cylinder, gable, merge, pane, pyramid, rotateX, rotateZ } from "@/registry/isometric/lib/isometric/mesh"
import { reducedMotion, spring, stepAll, type Spring } from "@/registry/isometric/lib/isometric/motion"
import type { Drawable, Stroke } from "@/registry/isometric/lib/isometric/scene"

/**
 * Church — a small stone church: a nave under a tiled roof, buttresses
 * between pointed windows, a rose window over arched double doors, and a
 * tower with an open belfry and a spire. Click the doors to open them, the
 * bell to ring it, and any window to light the whole church. `intensity` sets
 * how far the bell swings.
 */

export type ChurchProps = {
  /** Start with the windows lit. */
  lit?: boolean
}

const L = 48, Wd = 24, WALL = 26, RISE = 14
const TX0 = 36, TX1 = 48, TY0 = 24, TY1 = 35, TOWER = 34, BELL = 44, SPIRE = 66
const DOOR_Y0 = 9, DOOR_Y1 = 15, DOOR_H = 13
const outX: Vec3 = [1, 0, 0], outY: Vec3 = [0, 1, 0]

type State = { doors: Spring; swing: Spring; lit: Spring; rings: number }

/** A pointed (lancet) arch in a wall's plane: `u` runs along the wall, `z` up; `at` maps to the world. */
function lancet(u: number, z0: number, half: number, tall: number, at: (u: number, z: number) => Vec3): Vec3[] {
  const pts: Vec3[] = [at(u - half, z0)]
  const spring_ = z0 + tall - half * 1.6
  for (let i = 0; i <= 8; i++) {
    // each side of the point is an arc centred on the far jamb, as in Gothic tracery
    const t = (i / 8) * (Math.PI / 3)
    pts.push(at(u + half - 2 * half * Math.cos(t), spring_ + 2 * half * Math.sin(t) * 0.8))
  }
  for (let i = 8; i >= 0; i--) {
    const t = (i / 8) * (Math.PI / 3)
    pts.push(at(u - half + 2 * half * Math.cos(t), spring_ + 2 * half * Math.sin(t) * 0.8))
  }
  pts.push(at(u + half, z0))
  return pts
}

/** A round arch over a doorway, in the facade's plane. */
const roundArch = (y0: number, y1: number, z: number, x: number): Vec3[] =>
  Array.from({ length: 13 }, (_, i) => {
    const t = Math.PI * (i / 12), r = (y1 - y0) / 2
    return [x, (y0 + y1) / 2 - r * Math.cos(t), z + r * Math.sin(t)]
  })

const entity: Entity<State, ChurchProps> = {
  view: { az: 50, fit: [[-2, -2, 0], [L + 8, -2, 0], [-2, TY1 + 2, 0], [L + 8, TY1 + 2, 0], [(TX0 + TX1) / 2, (TY0 + TY1) / 2, SPIRE + 4], [-2, Wd / 2, WALL + RISE]], zoom: 1.02 },
  parts: { doors: "Doors", bell: "Bell", windows: "Windows", rose: "Rose window", spire: "Spire" },
  init: (p) => ({ doors: spring(0, 60, 12, 0.002), swing: spring(0, 18, 1.6, 0.002), lit: spring(p.lit ? 1 : 0, 80, 14, 0.01), rings: 0 }),
  update: (s, p) => { s.lit.to = p.lit ? 1 : 0 },
  step: (s, dt) => stepAll([s.doors, s.swing, s.lit], dt),
  activate: (s, part, ctx) => {
    if (part === "doors") { s.doors.to = s.doors.to ? 0 : 1; return s.doors.to ? "The doors open" : "The doors close" }
    if (part === "bell") {
      // a knock: the bell swings and rings out its swing on a light spring
      if (!reducedMotion()) s.swing.v += 3.2 * ctx.value
      s.rings++
      return s.rings % 2 ? "Ding" : "Dong"
    }
    if (part === "windows" || part === "rose") { s.lit.to = s.lit.to ? 0 : 1; return s.lit.to ? "The windows are lit" : "The windows are dark" }
    if (part === "spire") return "Spire, with a cross at its point"
    return undefined
  },
  rest: () => "Church",
  draw: (s, out) => {
    const lit = s.lit.x > 0.5 ? "glow" : ""
    const items: (Drawable | Stroke)[] = out

    // the plinth, and steps up to the doors
    items.push({ mesh: box(-3, -3, 0, L + 3, TY1 + 2, 1.6), shade: true, bias: -200 })
    items.push({ mesh: box(L + 3, DOOR_Y0 - 3, 0, L + 7, DOOR_Y1 + 3, 1), shade: true, bias: -150 })
    items.push({ mesh: box(L + 3, DOOR_Y0 - 2, 1, L + 5, DOOR_Y1 + 2, 1.6), shade: true, bias: -149 })

    // the nave and its roof
    // the nave is one large box with everything else mounted outside it, so it (and its roof) paint first
    items.push({ mesh: box(0, 0, 1.6, L, Wd, WALL), shade: true, bias: -60 })
    items.push({ mesh: gable(-1.5, -1.5, WALL, L + 3, Wd + 3, RISE), shade: true, bias: -59 })
    // tile courses along the near slope, and stone courses along the near wall
    for (let i = 1; i < 6; i++) {
      const t = i / 6, y = Wd + 1.5 - t * (Wd / 2 + 1.5), z = WALL + t * RISE
      items.push({ pts: [[-1.5, y, z], [L + 1.5, y, z]], cls: "lo", bias: -58.9 })
    }
    for (const z of [7, 12.5, 18, 23]) items.push({ pts: [[0, Wd + 0.05, z], [TX0, Wd + 0.05, z]], cls: "lo", bias: 0.4 })

    // pointed windows between buttresses along the near wall
    for (const u of [6, 18, 30]) {
      const w = lancet(u, 7, 2.2, 12, (x, z) => [x, Wd + 0.1, z])
      items.push({ mesh: pane(w, outY), part: "windows", cls: lit, bias: 0.5 })
      items.push({ pts: [[u, Wd + 0.15, 7], [u, Wd + 0.15, 17]], cls: "lo", part: "windows", bias: 0.6 })
    }
    for (const u of [0, 12, 24]) {
      items.push({ mesh: box(u - 1.4, Wd, 1.6, u + 1.4, Wd + 3.2, 11), shade: true, bias: 0.7 })
      items.push({ mesh: box(u - 1, Wd, 11, u + 1, Wd + 1.8, 18), shade: true, bias: 0.8 })
    }

    // the facade: a rose window over arched double doors, a cross on the gable
    const fx = L + 0.1
    const rose = Array.from({ length: 24 }, (_, i): Vec3 => [fx, Wd / 2 + 4.6 * Math.cos((i / 24) * Math.PI * 2), 20.5 + 4.6 * Math.sin((i / 24) * Math.PI * 2)])
    items.push({ mesh: pane(rose, outX), part: "rose", cls: lit, bias: 2 })
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2
      items.push({ pts: [[fx + 0.05, Wd / 2 + 1.4 * Math.cos(a), 20.5 + 1.4 * Math.sin(a)], [fx + 0.05, Wd / 2 + 4.6 * Math.cos(a), 20.5 + 4.6 * Math.sin(a)]], cls: "lo", part: "rose", bias: 2.1 })
    }
    const hub = Array.from({ length: 13 }, (_, i): Vec3 => [fx + 0.05, Wd / 2 + 1.4 * Math.cos((i / 12) * Math.PI * 2), 20.5 + 1.4 * Math.sin((i / 12) * Math.PI * 2)])
    items.push({ pts: hub, cls: "lo", part: "rose", bias: 2.1 })
    items.push({ pts: [[fx, Wd / 2, WALL + RISE], [fx, Wd / 2, WALL + RISE + 5]], cls: "hi", bias: 2.2 })
    items.push({ pts: [[fx, Wd / 2 - 1.6, WALL + RISE + 3.4], [fx, Wd / 2 + 1.6, WALL + RISE + 3.4]], cls: "hi", bias: 2.2 })

    // the doorway behind the doors: dark, or lit from inside
    const door = [[fx, DOOR_Y0, 1.6], [fx, DOOR_Y1, 1.6], ...roundArch(DOOR_Y0, DOOR_Y1, DOOR_H, fx).reverse()] as Vec3[]
    items.push({ mesh: pane(door, outX), part: "doors", cls: lit || "tone-right", bias: 2 })
    items.push({ pts: roundArch(DOOR_Y0 - 1, DOOR_Y1 + 1, DOOR_H, fx + 0.1), cls: "mid", bias: 2.05 })
    // two leaves on hinges at the jambs, swinging out
    const open = s.doors.x * 1.75
    const leafH = DOOR_H
    for (const [y0, sign] of [[DOOR_Y0, 1], [DOOR_Y1, -1]] as const) {
      const leaf = box(fx, Math.min(y0, y0 + sign * 3), 1.6, fx + 0.6, Math.max(y0, y0 + sign * 3), 1.6 + leafH)
      items.push({ mesh: rotateZ(leaf, -sign * open, [fx, y0, 0]), part: "doors", shade: true, bias: 3 + (sign > 0 ? 0 : 0.01) })
    }

    // the tower: a shaft, an open belfry with its bell, a cap and a spire
    items.push({ mesh: box(TX0, TY0, 1.6, TX1, TY1, TOWER), shade: true, bias: 4 })
    for (const z of [8, 16, 24]) items.push({ pts: [[TX0, TY1 + 0.05, z], [TX1, TY1 + 0.05, z], [TX1 + 0.05, TY1, z], [TX1 + 0.05, TY0, z]], cls: "lo", bias: 4.1 })
    const slit = lancet((TY0 + TY1) / 2, 18, 1.2, 8, (y, z) => [TX1 + 0.1, y, z])
    items.push({ mesh: pane(slit, outX), cls: lit, part: "windows", bias: 4.2 })
    const posts: [number, number][] = [[TX0, TY0], [TX1 - 1.6, TY0], [TX0, TY1 - 1.6], [TX1 - 1.6, TY1 - 1.6]]
    posts.forEach(([x, y], i) => items.push({ mesh: box(x, y, TOWER, x + 1.6, y + 1.6, BELL), shade: true, bias: 4 + i * 0.01 }))
    const bx = (TX0 + TX1) / 2, by = (TY0 + TY1) / 2
    const bell = merge(cylinder(bx, by, BELL - 9, 3.3, 1, 20), cylinder(bx, by, BELL - 8, 2.6, 3.4, 20), cylinder(bx, by, BELL - 4.6, 1.7, 1.6, 20))
    items.push({ mesh: rotateX(bell, s.swing.x * 0.5, [bx, by, BELL - 1.5]), smooth: true, part: "bell", cls: s.swing.x ** 2 > 0.002 ? "hi" : "", bias: 4.005 })
    items.push({ pts: [[bx, by - 3, BELL - 1.5], [bx, by + 3, BELL - 1.5]], cls: "mid", part: "bell", bias: 4.006 })
    items.push({ mesh: box(TX0 - 0.6, TY0 - 0.6, BELL, TX1 + 0.6, TY1 + 0.6, BELL + 2), shade: true, bias: 4.5 })
    items.push({ mesh: pyramid([[TX0, TY0], [TX1, TY0], [TX1, TY1], [TX0, TY1]], BELL + 2, [bx, by, SPIRE - 4]), shade: true, part: "spire", bias: 4.6 })
    items.push({ pts: [[bx, by, SPIRE - 4], [bx, by, SPIRE + 2]], cls: "hi", part: "spire", bias: 4.7 })
    items.push({ pts: [[bx - 1.4, by + 1.4, SPIRE], [bx + 1.4, by - 1.4, SPIRE]], cls: "hi", part: "spire", bias: 4.7 })
  },
}

export const Church = createFigure<ChurchProps>("Church", {
  id: "church",
  label: "A small stone church with a tower and spire; the doors open, the bell rings and the windows light.",
  rest: "Church",
  range: [0.4, 0.8, 1.3],
  focusable: true,
  defaults: { lit: false },
  mount: entityMount(entity),
})

/** The entity behind the figure, for hosts that place many objects together, such as the world. */
export { entity as churchEntity }
