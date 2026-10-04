"use client"

import { createFigure } from "@/registry/isometric/lib/isometric/figure"
import { camera, clamp, corners, facing, fit, footprint, prism, project, unproject, type Ring } from "@/registry/isometric/lib/isometric/iso"
import { spring, step, type Spring } from "@/registry/isometric/lib/isometric/motion"
import { bag, draw, el, loop, pointer, solid, type Mount, type Solid } from "@/registry/isometric/lib/isometric/stage"

/**
 * Keys — a forty-key board. The key under the pointer sinks and its
 * neighbours follow it down, less the further away; a click presses it
 * home. `intensity` widens how far the press reaches.
 */

const ROWS = ["1234567890", "QWERTYUIOP", "ASDFGHJKL;", "ZXCVBNM,./"]
const COLS = 10, PITCH = 13, CAP = 10.6, UP = 4.2, PAD = 7
const EXT_X = COLS * PITCH + PITCH / 2, EXT_Y = ROWS.length * PITCH

type Key = { i: number; j: number; x: number; y: number; ring: Ring; bevel: Ring; sp: Spring; el: Solid; label: string }

const mount: Mount<object> = ({ stage, svg, read }, radius) => {
  const b = bag()
  const c = camera(45, 0.5, 2.05)
  fit(c, corners(-PAD, -PAD, EXT_X + PAD, EXT_Y + PAD, -5, UP), 200, 160)
  const P = project(c), front = facing(c)
  let R = radius
  let over: [number, number] | null = null
  let held = false

  const g = el("g", null, svg)
  const [br, bb] = footprint(-PAD, -PAD, EXT_X + PAD, EXT_Y + PAD, 8, 2.4)
  draw(solid(g), prism(P, front, br, bb, -5, 0))

  const keys: Key[] = []
  for (let s = 0; s < COLS + ROWS.length; s++) {
    for (let j = 0; j < ROWS.length; j++) {
      const i = s - j
      if (i < 0 || i >= COLS) continue
      // each row is staggered a little to the right, as on a real board
      const x = i * PITCH + j * (PITCH / 6) + (PITCH - CAP) / 2, y = j * PITCH + (PITCH - CAP) / 2
      const [ring, bevel] = footprint(x, y, x + CAP, y + CAP, 2.2, 1.6)
      keys.push({ i, j, x, y, ring, bevel, sp: spring(UP, 260, 24, 0.02), el: solid(g), label: ROWS[j][i] })
    }
  }

  let hot: Key | null = null
  const L = loop(stage, (dt) => {
    let moving = false
    for (const k of keys) {
      if (step(k.sp, dt)) moving = true
      draw(k.el, prism(P, front, k.ring, k.bevel, 0, Math.max(0.4, k.sp.x)))
      k.el.g.classList.toggle("accent", k === hot)
    }
    return moving
  })
  b.add(L.stop)

  function retarget() {
    hot = null
    if (over) {
      let best = Infinity
      for (const k of keys) {
        const d = Math.hypot(k.x + CAP / 2 - over[0], k.y + CAP / 2 - over[1])
        if (d < best) { best = d; hot = k }
      }
      if (best > PITCH) hot = null
    }
    for (const k of keys) {
      if (!hot) { k.sp.to = UP; continue }
      const d = Math.hypot(k.i - hot.i, k.j - hot.j) / R
      const depth = k === hot ? (held ? 0.92 : 0.7) : 0.55 * Math.max(0, 1 - d)
      k.sp.to = UP * (1 - depth)
    }
    read.textContent = hot ? `key ${hot.label}` : "keys"
    L.wake()
  }

  b.add(pointer(stage, {
    move: (p) => { const [x, y] = unproject(c, p[0], p[1], UP); over = [clamp(x, -20, EXT_X + 20), clamp(y, -20, EXT_Y + 20)]; retarget() },
    down: (p) => { held = true; const [x, y] = unproject(c, p[0], p[1], UP); over = [x, y]; retarget() },
    up: () => { held = false; retarget() },
    leave: () => { over = null; held = false; retarget() },
  }))
  b.add(() => svg.replaceChildren())

  return { set: (v) => { R = v; if (over) retarget() }, destroy: b.dispose }
}

export const Keys = createFigure("Keys", {
  id: "keys",
  label: "A forty-key keyboard; the key under the pointer sinks and its neighbours follow.",
  rest: "keys",
  range: [1, 2, 3.5],
  defaults: {},
  mount,
})
