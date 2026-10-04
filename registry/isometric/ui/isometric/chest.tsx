"use client"

import { block, type BlockType } from "@/registry/isometric/lib/isometric/blocks"
import { type Entity, entityMount } from "@/registry/isometric/lib/isometric/entity"
import { createFigure } from "@/registry/isometric/lib/isometric/figure"
import { box, pane, rotateX, rotateZ, translate } from "@/registry/isometric/lib/isometric/mesh"
import { spring, stepAll, type Spring } from "@/registry/isometric/lib/isometric/motion"

/**
 * Chest — a wooden chest with an iron latch. Click it to lift the lid on its
 * hinge; what is inside floats up and turns. Click again to close it.
 * `intensity` sets how far the items rise.
 */

export type ChestProps = {
  /** What is inside: up to four block types. */
  items?: BlockType[]
}

const W = 28, D = 20, H = 14, LID = 6

type State = { lid: Spring; rise: Spring; items: BlockType[]; spin: number }

const entity: Entity<State, ChestProps> = {
  view: { az: 40, fit: [[-W / 2, -D / 2, 0], [W / 2, D / 2, 0], [-W / 2, -D / 2, H + LID + 22], [W / 2, D / 2, H + LID + 22]], zoom: 0.92 },
  parts: { chest: "Chest", latch: "Latch" },
  init: (p) => ({ lid: spring(0, 90, 13, 0.002), rise: spring(0, 60, 11, 0.01), items: (p.items ?? ["ore", "planks", "grass"]).slice(0, 4), spin: 0 }),
  update: (s, p) => { s.items = (p.items ?? ["ore", "planks", "grass"]).slice(0, 4) },
  step: (s, dt) => {
    const moving = stepAll([s.lid, s.rise], dt)
    s.spin += dt * 1.4
    return moving || s.rise.x > 0.01
  },
  activate: (s) => {
    const open = !s.lid.to
    s.lid.to = open ? 1 : 0
    s.rise.to = open ? 1 : 0
    return open ? `Chest open · ${s.items.length} item${s.items.length === 1 ? "" : "s"}` : "Chest closed"
  },
  rest: () => "Chest",
  draw: (s, out, ctx) => {
    const tint = "var(--iso-planks, #bf955f)"
    // the body: planks, with iron bands at the corners
    out.push({ mesh: box(-W / 2, -D / 2, 0, W / 2, D / 2, H), shade: true, tint, part: "chest" })
    // the hollow under the lid, shaded, seen once the lid lifts
    if (s.lid.x > 0.05) out.push({ mesh: pane([[-W / 2 + 1.5, -D / 2 + 1.5, H + 0.05], [W / 2 - 1.5, -D / 2 + 1.5, H + 0.05], [W / 2 - 1.5, D / 2 - 1.5, H + 0.05], [-W / 2 + 1.5, D / 2 - 1.5, H + 0.05]], [0, 0, 1]), cls: "tone-right", part: "chest", bias: 0.02 })
    for (const z of [4, 9]) out.push({ pts: [[-W / 2, D / 2 + 0.05, z], [W / 2, D / 2 + 0.05, z], [W / 2 + 0.05, D / 2, z], [W / 2 + 0.05, -D / 2, z]], cls: "lo", part: "chest", bias: 0.01 })
    // items, rising out of the open chest and turning
    // items come up out of the opening, growing as they rise; while the chest is shut there are none to see
    if (s.rise.x > 0.03) s.items.forEach((t, i) => {
      const x = -W / 2 + 6 + i * ((W - 12) / Math.max(1, s.items.length - 1 || 1))
      const z = H + 1 + s.rise.x * (6 + ctx.value * 6 + (i % 2) * 3) + Math.sin(s.spin + i) * s.rise.x
      const k = 5 * Math.min(1, s.rise.x * 1.4)
      for (const d of block(t, -k / 2, -k / 2, 0, k, { inert: true })) if ("mesh" in d) out.push({ ...d, mesh: translate(rotateZ(d.mesh, s.spin + i), [x, 0, z]), bias: 0.5 })
    })
    // the lid turns up and back on its hinge along the back edge
    const angle = s.lid.x * 1.9
    const lid = rotateX(box(-W / 2 - 0.5, -D / 2 - 0.5, H, W / 2 + 0.5, D / 2 + 0.5, H + LID), angle, [0, -D / 2, H])
    out.push({ mesh: lid, shade: true, tint, part: "chest", bias: s.lid.x > 0.5 ? -1 : 1 })
    // the latch on the front, which rides with the lid
    const latch = rotateX(box(-2, D / 2 + 0.5, H - 2.5, 2, D / 2 + 1.5, H + 2), angle, [0, -D / 2, H])
    out.push({ mesh: latch, shade: true, part: "latch", cls: "mid", bias: s.lid.x > 0.5 ? -0.9 : 1.1 })
  },
}

export const Chest = createFigure<ChestProps>("Chest", {
  id: "chest",
  label: "A wooden chest; click it to open the lid and lift out what is inside.",
  rest: "Chest",
  range: [0, 4, 10],
  focusable: true,
  defaults: { items: undefined },
  mount: entityMount(entity),
})

/** The entity behind the figure, for hosts that place many objects together, such as the world. */
export { entity as chestEntity }
