"use client"

import { type Entity, entityMount } from "@/registry/isometric/lib/isometric/entity"
import { createFigure } from "@/registry/isometric/lib/isometric/figure"
import { clamp, type Vec3 } from "@/registry/isometric/lib/isometric/iso"
import { box, cylinder, rotateZ } from "@/registry/isometric/lib/isometric/mesh"
import { reducedMotion, spring, step, type Spring } from "@/registry/isometric/lib/isometric/motion"

/**
 * Reactor — a ring-core reactor: a glowing core inside a ring of ten coils.
 * As the pointer comes near the coils charge one by one and the ring starts
 * to turn; click to fire a pulse out across the plate. `intensity` sets how
 * fast it charges.
 */

const COILS = 10, PLATE = 34

type State = { charge: Spring; turn: number; pulses: number[]; near: number }

const entity: Entity<State, object> = {
  view: { az: 45, fit: [[-PLATE, -PLATE, 0], [PLATE, PLATE, 0], [0, 0, 16], [-PLATE, PLATE, 6], [PLATE, -PLATE, 6]], zoom: 0.96 },
  parts: { core: "Core", coils: "Coil ring" },
  init: () => ({ charge: spring(0.15, 40, 12, 0.002), turn: 0, pulses: [], near: 0 }),
  pointer: (s, e) => {
    s.near = e ? clamp(1.25 - Math.hypot(e.ground[0], e.ground[1]) / 40, 0, 1) : 0
  },
  step: (s, dt, ctx) => {
    s.charge.to = Math.max(0.15, s.near)
    s.charge.k = 20 + ctx.value * 40
    const moving = step(s.charge, dt)
    if (!reducedMotion()) s.turn += dt * s.charge.x * 0.9
    s.pulses = s.pulses.map((t) => t + dt).filter((t) => t < 1.1)
    if (s.near > 0) ctx.read(`charge ${Math.round(s.charge.x * 100)}%`)
    return moving || s.pulses.length > 0 || (s.charge.x > 0.2 && !reducedMotion())
  },
  activate: (s) => {
    s.pulses.push(0)
    return `pulse at ${Math.round(s.charge.x * 100)}%`
  },
  rest: () => "Reactor · idle",
  draw: (s, out) => {
    const lit = Math.round(s.charge.x * COILS)
    // the plate and the ring under the coils: flat and wide, so they always paint first
    out.push({ mesh: cylinder(0, 0, 0, PLATE, 3, 48), smooth: true, bias: -100 })
    out.push({ mesh: cylinder(0, 0, 3, 27, 2, 48), smooth: true, cls: "mid", bias: -99 })
    // ten coils around the ring, lighting in turn as it charges
    for (let i = 0; i < COILS; i++) {
      const a = s.turn + (i / COILS) * Math.PI * 2
      const coil = rotateZ(box(-2.6, 15, 5, 2.6, 24, 9.5), a)
      out.push({ mesh: coil, part: "coils", shade: true, cls: i < lit ? "glow hi" : "" })
      // the winding line along the coil's lid
      const at = (r: number): Vec3 => [-Math.sin(a) * r, Math.cos(a) * r, 9.6]
      out.push({ pts: [at(15.6), at(23.4)], cls: "lo", part: "coils", bias: 0.01 })
    }
    out.push({ mesh: cylinder(0, 0, 5, 12, 6, 36), smooth: true, part: "core", cls: "mid" })
    out.push({ mesh: cylinder(0, 0, 11, 7, 3 + s.charge.x * 2, 32), smooth: true, part: "core", cls: s.charge.x > 0.6 ? "solid" : "glow", bias: 0.5 })
    // pulses: rings that leave the core and fade at the plate's edge
    for (const t of s.pulses) {
      const r = 8 + t * (PLATE - 6)
      const ring: Vec3[] = Array.from({ length: 48 }, (_, i) => [Math.cos((i / 48) * Math.PI * 2) * r, Math.sin((i / 48) * Math.PI * 2) * r, 3.1])
      out.push({ pts: ring, closed: true, cls: t < 0.8 ? "accent" : "lo", bias: -10 })
    }
  },
}

export const Reactor = createFigure("Reactor", {
  id: "reactor",
  label: "A ring-core reactor; its coils charge as the pointer comes near, and a click fires a pulse.",
  rest: "Reactor · idle",
  range: [0.3, 1, 2.2],
  focusable: true,
  defaults: {},
  mount: entityMount(entity),
})

/** The entity behind the figure, for hosts that place many objects together, such as the world. */
export { entity as reactorEntity }
