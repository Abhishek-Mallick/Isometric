"use client"

import { block, MATERIAL, type BlockType } from "@/registry/isometric/lib/isometric/blocks"
import { type Entity, entityMount } from "@/registry/isometric/lib/isometric/entity"
import { createFigure } from "@/registry/isometric/lib/isometric/figure"
import type { Vec3 } from "@/registry/isometric/lib/isometric/iso"
import { box, rotateZ, translate } from "@/registry/isometric/lib/isometric/mesh"
import { reducedMotion, spring, stepAll, type Spring } from "@/registry/isometric/lib/isometric/motion"

/**
 * Block — one block you can mine. Each click cracks it further; the last
 * breaks it into fragments and drops a small item that turns in the air,
 * and a moment later the block grows back. `type` picks the material.
 * `intensity` sets how hard you hit: fewer clicks to break it.
 */

export type BlockProps = {
  /** The material. */
  type?: BlockType
}

const S = 24, REGROW = 1.8

type Bit = { p: Vec3; v: Vec3; a: number }
type State = { type: BlockType; hits: number; broken: number; grow: Spring; bits: Bit[]; spin: number; hover: Spring }

const entity: Entity<State, BlockProps> = {
  view: { az: 45, fit: [[-S, -S, 0], [S, S, 0], [0, 0, S * 1.6]], zoom: 0.9 },
  parts: { block: "Block" },
  init: (p) => ({ type: p.type ?? "grass", hits: 0, broken: -1, grow: spring(1, 140, 14, 0.005), bits: [], spin: 0, hover: spring(0, 160, 18, 0.01) }),
  update: (s, p) => { if (p.type && p.type !== s.type) { s.type = p.type; s.hits = 0 } },
  pointer: (s, e) => { s.hover.to = e?.part ? 1 : 0 },
  step: (s, dt, ctx, now) => {
    let moving = stepAll([s.grow, s.hover], dt)
    s.spin += dt * 1.6
    for (const b of s.bits) { b.v[2] -= 90 * dt; b.p = [b.p[0] + b.v[0] * dt, b.p[1] + b.v[1] * dt, Math.max(0, b.p[2] + b.v[2] * dt)]; b.a += dt * 5 }
    if (s.bits.length && s.bits.every((b) => b.p[2] === 0)) s.bits = []
    if (s.broken >= 0 && now - s.broken > REGROW * 1000) {
      s.broken = -1
      s.grow.x = 0.05
      s.grow.to = 1
      ctx.read(`${MATERIAL[s.type].label} grew back`)
    }
    moving ||= s.broken >= 0 || s.bits.length > 0
    return moving
  },
  activate: (s, _part, ctx) => {
    if (s.broken >= 0) return "Waiting for it to grow back"
    const need = Math.max(1, Math.round(ctx.value))
    s.hits++
    s.grow.x = 0.92
    s.grow.to = 1
    if (s.hits < need) return `${MATERIAL[s.type].label} · ${s.hits} of ${need}`
    s.hits = 0
    s.broken = performance.now()
    if (!reducedMotion()) {
      s.bits = Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2
        return { p: [Math.cos(a) * 4, Math.sin(a) * 4, S / 2], v: [Math.cos(a) * 30, Math.sin(a) * 30, 40 + (i % 3) * 12], a: i }
      })
    }
    return `${MATERIAL[s.type].label} mined`
  },
  rest: (s) => MATERIAL[s.type].label,
  draw: (s, out) => {
    if (s.broken < 0) {
      const g = S * s.grow.x, lift = s.hover.x * 1.5
      out.push(...block(s.type, -g / 2, -g / 2, lift, g, { part: "block", crack: s.hits }))
    } else {
      // the item it dropped, turning above the spot
      const it = block(s.type, -3, -3, 0, 6, { inert: true }).map((d) => ("mesh" in d ? { ...d, mesh: translate(rotateZ(d.mesh, s.spin, [0, 0, 0]), [0, 0, 6 + Math.sin(s.spin * 2) * 1.5]) } : null))
      for (const d of it) if (d) out.push(d)
    }
    for (const b of s.bits) out.push({ mesh: translate(rotateZ(box(-2, -2, 0, 2, 2, 4), b.a), b.p), shade: true, tint: MATERIAL[s.type].tint, inert: true, bias: 1 })
    // a shadow square on the ground
    out.push({ pts: [[-S / 2 - 2, -S / 2 - 2, 0], [S / 2 + 2, -S / 2 - 2, 0], [S / 2 + 2, S / 2 + 2, 0], [-S / 2 - 2, S / 2 + 2, 0]], closed: true, cls: "dash lo", bias: -100 })
  },
}

export const Block = createFigure<BlockProps>("Block", {
  id: "block",
  label: "A block you can mine: each click cracks it, and the last breaks it.",
  rest: "Grass",
  range: [6, 4, 2],
  focusable: true,
  defaults: { type: "grass" },
  mount: entityMount(entity),
})

/** The entity behind the figure, for hosts that place many objects together, such as the world. */
export { entity as blockEntity }
