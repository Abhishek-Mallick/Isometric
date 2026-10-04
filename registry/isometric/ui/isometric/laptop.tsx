"use client"

import { createFigure } from "@/registry/isometric/lib/isometric/figure"
import { camera, clamp, closed, corners, deg, face, facing, fit, footprint, hull, prism, project, tile, type Vec3 } from "@/registry/isometric/lib/isometric/iso"
import { spring, stepAll } from "@/registry/isometric/lib/isometric/motion"
import { bag, draw, el, loop, path, pointer, solid, type Mount } from "@/registry/isometric/lib/isometric/stage"

/**
 * Laptop — a thin laptop open on its hinge. The pointer's height sets how far
 * the lid stands open, and the lid follows on a spring; the screen's lines
 * light as it opens. `intensity` lets the lid open wider.
 */

const W = 120, D = 82, T = 3.4, LID = 78, LT = 1.6

const mount: Mount<object> = ({ stage, svg, read }, maxAngle) => {
  const b = bag()
  const c = camera(38, 0.5, 1.5)
  fit(c, [...corners(0, -20, W, D, 0, LID * 0.9)], 200, 166)
  const P = project(c), front = facing(c)
  let top = maxAngle
  const angle = spring(top * 0.82, 90, 15, 0.05)

  const g = el("g", null, svg)
  const [ring, bevel] = footprint(0, 0, W, D, 5, 1.6)
  draw(solid(g), prism(P, front, ring, bevel, 0, T))
  const deck = path(g, "line lo")
  // the keyboard and the trackpad, drawn once on the deck
  let keys = ""
  for (let r = 0; r < 4; r++) for (let k = 0; k < 12; k++) {
    const x = 12 + k * 8.1, y = 10 + r * 8.1
    keys += tile(P, x, y, x + 6.6, y + 6.6, T)
  }
  keys += tile(P, W / 2 - 18, 50, W / 2 + 18, 72, T)
  deck.setAttribute("d", keys)

  const lid = el("g", null, g)
  const shell = path(lid, "edge")
  const screen = path(lid, "inner")
  const lines = path(lid, "line")

  /** A point on the lid: u across, v up the lid from the hinge, w through its thickness. */
  const on = (a: number, u: number, v: number, w: number): Vec3 => {
    const ca = Math.cos(a), sa = Math.sin(a)
    // the lid swings about the back edge (y = 0, z = T); closed it lies along +y
    return [u, v * ca - w * sa, T + v * sa + w * ca]
  }

  function render() {
    const a = deg(angle.x)
    const rect = (w: number) => [on(a, 2, 0, w), on(a, W - 2, 0, w), on(a, W - 2, LID, w), on(a, 2, LID, w)]
    const pts = [...rect(0), ...rect(LT)].map((p) => P(p[0], p[1], p[2]))
    shell.setAttribute("d", closed(hull(pts)))
    // the screen is the lid's inner face; from this camera it turns toward us past about 36°
    const sw = 0
    const inset = [on(a, 8, 6, sw), on(a, W - 8, 6, sw), on(a, W - 8, LID - 6, sw), on(a, 8, LID - 6, sw)]
    screen.setAttribute("d", angle.x > 38 ? face(P, inset) : "")
    let d = ""
    const lit = clamp((angle.x - 40) / 60, 0, 1)
    const n = Math.round(lit * 6)
    for (let i = 0; i < n; i++) {
      const v = LID - 14 - i * 9, len = [62, 40, 78, 52, 30, 66][i]
      const p0 = P(...on(a, 16, v, sw)), p1 = P(...on(a, 16 + len, v, sw))
      d += `M${p0[0].toFixed(2)} ${p0[1].toFixed(2)}L${p1[0].toFixed(2)} ${p1[1].toFixed(2)}`
    }
    lines.setAttribute("d", d)
    lid.classList.toggle("hi", angle.x > 100)
  }

  const L = loop(stage, (dt) => { const m = stepAll([angle], dt); render(); return m })
  b.add(L.stop)

  b.add(pointer(stage, {
    move: (p) => {
      angle.to = clamp(1 - (p[1] - 40) / 230, 0, 1) * top
      read.textContent = `lid ${Math.round(angle.to)}°`
      L.wake()
    },
    leave: () => { angle.to = top * 0.82; read.textContent = "laptop"; L.wake() },
  }))
  b.add(() => svg.replaceChildren())

  return { set: (v) => { top = v; angle.to = v * 0.82; L.wake() }, destroy: b.dispose }
}

export const Laptop = createFigure("Laptop", {
  id: "laptop",
  label: "A thin laptop; the pointer's height sets how far the lid stands open.",
  rest: "laptop",
  range: [95, 115, 135],
  defaults: {},
  mount,
})
