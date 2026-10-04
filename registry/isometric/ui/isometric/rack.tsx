"use client"

import { createFigure } from "@/registry/isometric/lib/isometric/figure"
import { block, camera, clamp, corners, fit, project, round } from "@/registry/isometric/lib/isometric/iso"
import { spring, step, type Spring } from "@/registry/isometric/lib/isometric/motion"
import { bag, draw, el, loop, pointer, solid, type Mount, type Solid } from "@/registry/isometric/lib/isometric/stage"

/**
 * Rack — an open server rack of eight units. The pointer's height pulls the
 * nearest units out on their rails, the farther the less; each unit's lights
 * wake as it comes out. `intensity` pulls out more units.
 */

const W = 70, D = 64, U = 9, N = 8, GAP = 1.6, POST = 4, BASE = 6, OUT = 30
const H = BASE + N * (U + GAP) + 4

type Unit = { k: number; z: number; sp: Spring; el: Solid; leds: SVGCircleElement[] }

const mount: Mount<object> = ({ stage, svg, read }, reach) => {
  const b = bag()
  const c = camera(30, 0.5, 1.7)
  fit(c, corners(0, 0, W, D + OUT, 0, H), 200, 160)
  const P = project(c)
  let R = reach
  let over = -1

  const g = el("g", null, svg)
  // back to front: the floor, the back wall and the far side, the units, the cap
  draw(solid(g), block(P, 0, 0, W, D, 0, BASE - 1))
  draw(solid(g), block(P, 0, 0, W, POST, BASE - 1, H))
  draw(solid(g), block(P, 0, 0, POST, D, BASE - 1, H))
  draw(solid(g), block(P, W - POST, 0, W, POST, BASE - 1, H))

  const units: Unit[] = []
  for (let k = 0; k < N; k++) {
    const ug = el("g", null, g)
    const z = BASE + k * (U + GAP)
    const body = solid(ug)
    const leds = [0, 1, 2].map(() => el("circle", { r: 1.4, class: "dot off" }, ug))
    units.push({ k, z, sp: spring(k === 5 ? 9 : 0, 150, 22, 0.05), el: body, leds })
  }
  draw(solid(g), block(P, W - POST, D - POST, W, D, BASE - 1, H))
  draw(solid(g), block(P, 0, 0, W, D, H, H + 3))

  const L = loop(stage, (dt) => {
    let moving = false
    for (const u of units) {
      if (step(u.sp, dt)) moving = true
      const y1 = D - 2 + u.sp.x
      draw(u.el, block(P, POST + 1, 4, W - POST - 1, y1, u.z, u.z + U))
      u.el.g.classList.toggle("accent", u.k === over)
      u.el.g.classList.toggle("hi", u.sp.x > OUT * 0.5)
      u.leds.forEach((led, i) => {
        const [x, y] = P(POST + 8 + i * 5, y1, u.z + U / 2)
        led.setAttribute("cx", String(round(x)))
        led.setAttribute("cy", String(round(y)))
        led.setAttribute("class", u.sp.x > 4 + i * 6 ? (u.k === over ? "dot accent" : "dot") : "dot off")
      })
    }
    return moving
  })
  b.add(L.stop)

  // the screen height of each unit's front face, for picking by the pointer's height
  const ys = units.map((u) => P(W / 2, D, u.z + U / 2)[1])
  function retarget(sy: number | null) {
    if (sy === null) {
      over = -1
      units.forEach((u) => { u.sp.to = u.k === 5 ? 9 : 0 })
      read.textContent = "rack"
    } else {
      let best = 0
      ys.forEach((y, k) => { if (Math.abs(y - sy) < Math.abs(ys[best] - sy)) best = k })
      over = best
      units.forEach((u) => { u.sp.to = OUT * Math.max(0, 1 - Math.abs(u.k - best) / R) })
      read.textContent = `unit ${String(best + 1).padStart(2, "0")}`
    }
    L.wake()
  }

  b.add(pointer(stage, {
    move: (p) => retarget(clamp(p[1], ys[N - 1] - 20, ys[0] + 20)),
    leave: () => retarget(null),
  }))
  b.add(() => svg.replaceChildren())

  return { set: (v) => { R = v; if (over >= 0) retarget(ys[over]) }, destroy: b.dispose }
}

export const Rack = createFigure("Rack", {
  id: "rack",
  label: "An open server rack of eight units; the pointer's height pulls the nearest units out.",
  rest: "rack",
  range: [1, 2, 3.5],
  defaults: {},
  mount,
})
