"use client"

import { type Entity, entityMount } from "@/registry/isometric/lib/isometric/entity"
import { createFigure } from "@/registry/isometric/lib/isometric/figure"
import type { Vec3 } from "@/registry/isometric/lib/isometric/iso"
import { box, cylinder, rotateY, rotateX, translate, type Mesh } from "@/registry/isometric/lib/isometric/mesh"
import { spring, stepAll, type Spring } from "@/registry/isometric/lib/isometric/motion"
import type { Drawable, Stroke } from "@/registry/isometric/lib/isometric/scene"

/**
 * PC Case — a tower you can take apart. Click the glass side panel to slide
 * it off; inside, the memory lifts out of its slots, the graphics card slides
 * out of the case, and the power button spins every fan and lights the
 * strip along the front. Every part answers the keyboard too. `intensity`
 * sets how far parts come out and how fast the fans spin.
 */

export type PcCaseProps = {
  /** Start with the side panel off. */
  open?: boolean
  /** Start powered on. */
  on?: boolean
}

const W = 22, D = 46, H = 48, T = 1.2

type State = {
  panel: Spring
  ram: Spring
  gpu: Spring
  fan: Spring
  spin: number
  on: boolean
}

/** A fan in the plane facing `axis`: its frame, its hub, and blades turned by `a`. */
function fan(out: (Drawable | Stroke)[], c: Vec3, r: number, axis: "x" | "y", a: number, part: string, lit: boolean, bias = 0) {
  const disc = cylinder(0, 0, -0.5, r, 1, 20)
  const turned = axis === "x" ? rotateY(disc, Math.PI / 2) : rotateX(disc, -Math.PI / 2)
  out.push({ mesh: translate(turned, c), smooth: true, part, cls: lit ? "hi" : "", bias })
  const at = (u: number, v: number): Vec3 => (axis === "x" ? [c[0] + 0.6, c[1] + u, c[2] + v] : [c[0] + u, c[1] + 0.6, c[2] + v])
  for (let i = 0; i < 7; i++) {
    const t = a + (i / 7) * Math.PI * 2
    const pts: Vec3[] = []
    // a swept blade: from the hub out, bending as it goes
    for (let k = 0; k <= 4; k++) {
      const rr = r * 0.25 + (r * 0.68 * k) / 4, tt = t + k * 0.12
      pts.push(at(rr * Math.cos(tt), rr * Math.sin(tt)))
    }
    out.push({ pts, cls: lit ? "hi" : "lo", part, bias: bias + 0.01 })
  }
}

const entity: Entity<State, PcCaseProps> = {
  // framed for the panel at its furthest out, so nothing leaves the box
  view: { az: 45, fit: [[0, 0, -2], [0, D, -2], [W + 24, 0, H], [W + 24, D, 0], [W + 24, D, H], [0, 0, H + 1], [W / 2, D + 2, 0]], zoom: 1.12 },
  parts: {
    panel: "Glass side panel",
    power: "Power button",
    ram: "Memory, 4 × 16 GB",
    gpu: "Graphics card",
    cooler: "CPU cooler",
    psu: "Power supply, 750 W",
    ssd: "Solid state drive, 2 TB",
    board: "Motherboard",
    fans: "Front intake fans",
  },
  init: (p) => ({ panel: spring(p.open ? 1 : 0, 120, 18, 0.002), ram: spring(0, 160, 18, 0.002), gpu: spring(0, 120, 18, 0.002), fan: spring(p.on ? 1 : 0, 6, 5, 0.001), spin: 0, on: !!p.on }),
  update: (s, p) => {
    s.panel.to = p.open ? 1 : 0
    s.on = !!p.on
    s.fan.to = s.on ? 1 : 0
  },
  step: (s, dt, ctx) => {
    const moving = stepAll([s.panel, s.ram, s.gpu, s.fan], dt)
    s.spin += dt * s.fan.x * (6 + ctx.value * 0.6)
    return moving || s.fan.x > 0.001
  },
  activate: (s, part) => {
    if (part === "panel") { s.panel.to = s.panel.to ? 0 : 1; return s.panel.to ? "Side panel off" : "Side panel on" }
    if (part === "power") { s.on = !s.on; s.fan.to = s.on ? 1 : 0; return s.on ? "Powered on · fans spinning up" : "Powered off" }
    if (!s.panel.to && (part === "ram" || part === "gpu")) { s.panel.to = 1; return "Taking the side panel off first" }
    if (part === "ram") { s.ram.to = s.ram.to ? 0 : 1; return s.ram.to ? "Memory out of its slots" : "Memory seated" }
    if (part === "gpu") { s.gpu.to = s.gpu.to ? 0 : 1; return s.gpu.to ? "Graphics card out" : "Graphics card seated" }
    return undefined
  },
  rest: (s) => (s.on ? "PC case · on" : "PC case · off"),
  draw: (s, out, ctx) => {
    const reach = ctx.value
    const lit = s.fan.x > 0.5
    // feet, floor and the walls that stay put: the motherboard side, the rear, the top and the front
    for (const [x, y] of [[2, 3], [W - 2, 3], [2, D - 3], [W - 2, D - 3]]) out.push({ mesh: box(x - 1.5, y - 1.5, -2, x + 1.5, y + 1.5, 0) })
    out.push({ mesh: box(0, 0, 0, W, D, T), shade: true })
    out.push({ mesh: box(0, 0, T, T, D, H), shade: true, part: "board" })
    out.push({ mesh: box(T, 0, T, W, T, H), shade: true })
    out.push({ mesh: box(0, 0, H - T, W, D, H), shade: true, bias: 40 })
    out.push({ mesh: box(0, D - T, T, W, D, H - T), shade: true, bias: 30 })
    // the power button, and the light strip down the front edge
    out.push({ mesh: cylinder(W / 2, D - 5, H, 1.6, 0.8, 16), smooth: true, part: "power", cls: s.on ? "glow" : "", bias: 41 })
    out.push({ mesh: box(W - 1.2, D - 0.2, 6, W - 0.4, D + 0.2, H - 6), cls: s.on ? "solid" : "", bias: 31 })

    // inside: the board, the cooler, memory, graphics card, power supply, drive and the front fans
    out.push({ mesh: box(T, 8, 18, T + 0.6, 40, 44), part: "board", cls: "mid" })
    const traces: [number, number, number, number][] = [[10, 20, 22, 20], [22, 20, 22, 26], [12, 41, 30, 41], [30, 41, 30, 36], [34, 20, 34, 28]]
    for (const [y0, z0, y1, z1] of traces) out.push({ pts: [[T + 0.7, y0, z0], [T + 0.7, y1, z1]], cls: "lo", part: "board" })
    out.push({ mesh: box(T + 0.6, 22, 30, 10, 31, 39), part: "cooler", shade: true })
    for (let z = 31; z < 39; z += 1.4) out.push({ pts: [[10.05, 22, z], [10.05, 31, z]], cls: "lo", part: "cooler", bias: 0.02 })
    fan(out, [10.2, 26.5, 34.5], 3.6, "x", s.spin, "cooler", lit)

    // memory rises out of its slots, then comes out through the open side, one stick after another
    for (let i = 0; i < 4; i++) {
      const y = 14.5 + i * 1.5, t = Math.min(1, s.ram.x * (1 + i * 0.12))
      const up = Math.min(t * 2, 1) * 3, out_ = Math.max(0, t * 2 - 1) * (4 + reach * 1.1 + i * 1.5)
      out.push({ mesh: box(T + 0.6 + out_, y, 28 + up, 7.5 + out_, y + 0.7, 36 + up), part: "ram", cls: lit ? "hi" : "", bias: i * 0.01 })
    }

    const gx = s.gpu.x * (6 + reach * 1.2)
    out.push({ mesh: box(T + 0.6 + gx, 10, 21, 17 + gx, 40, 25), part: "gpu", shade: true })
    for (const fy of [17, 32]) fan(out, [17.05 + gx, fy, 23], 1.7, "x", -s.spin * 1.3, "gpu", lit)
    out.push({ mesh: box(T + 0.6 + gx, 40, 21.5, 3 + gx, 41.5, 24.5), part: "gpu" })

    out.push({ mesh: box(T, T, T, W - 2, 15, 10), part: "psu", shade: true })
    fan(out, [W - 1.95, 8, 5.6], 3.2, "x", s.spin * 0.7, "psu", lit)
    out.push({ mesh: box(10, 30, T, 18, 40, T + 1.2), part: "ssd", shade: true })
    // the front intake fans, seen through the mesh front
    for (const fz of [12, 24, 36]) fan(out, [W / 2 - 1, D + 0.6, fz], 4.6, "y", -s.spin, "fans", lit, 50)

    // the glass panel: it slides off along x and leans out from its foot
    const off = s.panel.x * (12 + reach * 0.4)
    let glass: Mesh = box(W, 1, 1, W + 0.8, D - 1, H - 1)
    glass = translate(rotateY(glass, s.panel.x * 0.1, [W, 0, 1]), [off, 0, 0])
    out.push({ mesh: glass, part: "panel", cls: "glass", bias: 60 })
  },
}

export const PcCase = createFigure<PcCaseProps>("PcCase", {
  id: "pc-case",
  label: "A PC tower you can open: the side panel slides off, the memory and graphics card come out, and the power button spins the fans.",
  rest: "PC case · off",
  range: [6, 10, 14],
  focusable: true,
  defaults: { open: false, on: false },
  mount: entityMount(entity),
})
