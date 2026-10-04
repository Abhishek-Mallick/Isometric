"use client"

import { createFigure } from "@/registry/isometric/lib/isometric/figure"
import { block, camera, clamp, corners, fit, footprint, facing, prism, project, unproject } from "@/registry/isometric/lib/isometric/iso"
import { spring, step, type Spring } from "@/registry/isometric/lib/isometric/motion"
import { bag, draw, el, loop, pointer, solid, type Mount, type Solid } from "@/registry/isometric/lib/isometric/stage"

/**
 * Skyline — a seven by seven city block on a plinth. Towers near the pointer
 * rise on their own springs, the nearer the higher; the one under it takes
 * the accent. `intensity` widens the district that rises.
 */

const N = 7, CELL = 16, FOOT = 11, EXT = N * CELL, LIFT = 46, BASE = 5

type Tower = { i: number; j: number; h0: number; sp: Spring; el: Solid }

/** A designed rest: a dense core toward the back, with a scatter of shorter blocks. */
const rest = (i: number, j: number) => {
  const u = i / (N - 1), v = j / (N - 1)
  const core = 34 * Math.exp(-((u - 0.4) ** 2 + (v - 0.35) ** 2) / 0.09)
  const grain = 6 * (0.5 + 0.5 * Math.sin(i * 12.9898 + j * 78.233))
  return Math.round(6 + core + grain)
}

const mount: Mount<object> = ({ stage, svg, read }, radius) => {
  const b = bag()
  const c = camera(45, 0.5, 1.62)
  fit(c, corners(-6, -6, EXT + 6, EXT + 6, -BASE, 50), 200, 164)
  const P = project(c), front = facing(c)
  let R = radius
  let over: [number, number] | null = null

  const g = el("g", null, svg)
  const [ring, bevel] = footprint(-6, -6, EXT + 6, EXT + 6, 8, 2.4)
  draw(solid(g), prism(P, front, ring, bevel, -BASE, 0))

  const towers: Tower[] = []
  // diagonal by diagonal from the back corner, so appending paints back to front
  for (let s = 0; s <= 2 * (N - 1); s++) {
    for (let i = 0; i < N; i++) {
      const j = s - i
      if (j < 0 || j >= N) continue
      const h0 = rest(i, j)
      towers.push({ i, j, h0, sp: spring(h0, 140, 18, 0.05), el: solid(g) })
    }
  }

  let target: Tower | null = null
  const L = loop(stage, (dt) => {
    let moving = false
    for (const t of towers) {
      if (step(t.sp, dt)) moving = true
      const x0 = t.i * CELL + (CELL - FOOT) / 2, y0 = t.j * CELL + (CELL - FOOT) / 2
      draw(t.el, block(P, x0, y0, x0 + FOOT, y0 + FOOT, 0, Math.max(0.5, t.sp.x)))
      t.el.g.classList.toggle("hi", t.sp.x > 44)
      t.el.g.classList.toggle("accent", t === target)
    }
    return moving
  })
  b.add(L.stop)

  function retarget() {
    target = null
    for (const t of towers) {
      if (!over) { t.sp.to = t.h0; continue }
      const d = Math.hypot((t.i + 0.5) * CELL - over[0], (t.j + 0.5) * CELL - over[1]) / (R * CELL)
      t.sp.to = t.h0 + LIFT * Math.max(0, 1 - d * d)
    }
    if (over) {
      const i = Math.floor(over[0] / CELL), j = Math.floor(over[1] / CELL)
      if (i >= 0 && i < N && j >= 0 && j < N) {
        target = towers.find((t) => t.i === i && t.j === j) ?? null
        read.textContent = `block ${i + 1}·${j + 1}`
      } else read.textContent = "street"
    } else read.textContent = "skyline"
    L.wake()
  }

  b.add(pointer(stage, {
    move: (p) => { const [x, y] = unproject(c, p[0], p[1], 0); over = [clamp(x, -CELL, EXT + CELL), clamp(y, -CELL, EXT + CELL)]; retarget() },
    leave: () => { over = null; retarget() },
  }))
  b.add(() => svg.replaceChildren())

  return { set: (v) => { R = v; if (over) retarget() }, destroy: b.dispose }
}

export const Skyline = createFigure("Skyline", {
  id: "skyline",
  label: "A city block of towers on a plinth; the towers near the pointer rise.",
  rest: "skyline",
  range: [1.2, 2.2, 3.6],
  defaults: {},
  mount,
})
