"use client"

import { createFigure } from "@/registry/isometric/lib/isometric/figure"
import { camera, circle, clamp, closed, facing, fit, lift, polyline, prism, project, run } from "@/registry/isometric/lib/isometric/iso"
import { spring, stepAll, type Spring } from "@/registry/isometric/lib/isometric/motion"
import { bag, dot, draw, el, loop, path, place, pointer, solid, type Mount, type Solid } from "@/registry/isometric/lib/isometric/stage"

/**
 * Cylinders — a database as three stacked disks. The pointer's height picks
 * a disk; the stack parts above it, and the picked disk takes the accent and
 * lights its lamp. `intensity` opens the gap wider.
 */

const R = 46, H = 15, N = 3, REST = 3

type Disk = { k: number; z: Spring; el: Solid; band: SVGPathElement; lamp: SVGEllipseElement }

const mount: Mount<object> = ({ stage, svg, read }, maxGap) => {
  const b = bag()
  const c = camera(45, 0.5, 1.75)
  fit(c, [[-R, -R, 0], [R, R, 0], [-R, R, 0], [R, -R, 0], [0, 0, N * H + 2 * 24 + REST * 2]], 200, 160)
  const P = project(c), front = facing(c)
  let gap = maxGap
  let pick = -1

  const ring = circle(R, 0, 0, 72), bevel = circle(R - 3.5, 0, 0, 72)
  const g = el("g", null, svg)
  path(g, "line dash lo", closed(lift(P, circle(R + 10, 0, 0, 72), 0)))

  const disks: Disk[] = []
  for (let k = 0; k < N; k++) {
    const dg = el("g", null, g)
    const s = solid(dg)
    disks.push({ k, z: spring(k * (H + REST), 150, 20, 0.02), el: s, band: path(dg, "line"), lamp: dot(dg, c, 1.6, "dot off") })
  }
  const frontRun = run(ring, front)

  const L = loop(stage, (dt) => {
    const m = stepAll(disks.map((d) => d.z), dt)
    for (const d of disks) {
      const z = d.z.x
      draw(d.el, prism(P, front, ring, bevel, z, z + H))
      d.band.setAttribute("d", polyline(lift(P, frontRun, z + H * 0.42)))
      // the lamp sits on the front of the band, on the side nearest the camera
      place(d.lamp, P(R * Math.cos(0.5), R * Math.sin(0.5), z + H * 0.7))
      d.lamp.setAttribute("rx", "1.8")
      d.lamp.setAttribute("ry", "1.8")
      d.lamp.setAttribute("class", d.k === pick ? "dot accent" : "dot dim")
      d.el.g.classList.toggle("accent", d.k === pick)
    }
    return m
  })
  b.add(L.stop)

  const ys = disks.map((d) => P(0, R, d.k * (H + REST) + H / 2)[1])
  function retarget() {
    for (const d of disks) d.z.to = d.k * (H + REST) + (pick >= 0 && d.k > pick ? gap : 0)
    read.textContent = pick >= 0 ? `shard ${pick + 1} of ${N}` : "database"
    L.wake()
  }

  b.add(pointer(stage, {
    move: (p) => {
      let best = 0
      ys.forEach((y, k) => { if (Math.abs(y - p[1]) < Math.abs(ys[best] - p[1])) best = k })
      pick = clamp(best, 0, N - 1)
      retarget()
    },
    leave: () => { pick = -1; retarget() },
  }))
  b.add(() => svg.replaceChildren())

  return { set: (v) => { gap = v; retarget() }, destroy: b.dispose }
}

export const Cylinders = createFigure("Cylinders", {
  id: "cylinders",
  label: "A database drawn as three stacked disks; the pointer's height parts the stack.",
  rest: "database",
  range: [8, 16, 26],
  defaults: {},
  mount,
})
