"use client"

import { createFigure } from "@/registry/isometric/lib/isometric/figure"
import { block, camera, clamp, corners, facing, fit, footprint, prism, project, segments, unproject, type Vec3 } from "@/registry/isometric/lib/isometric/iso"
import { spring, stepAll, type Spring } from "@/registry/isometric/lib/isometric/motion"
import { bag, draw, el, loop, path, pointer, solid, type Mount, type Solid } from "@/registry/isometric/lib/isometric/stage"

/**
 * Bars — an isometric bar chart drawn from `data`. Bars grow on springs when
 * the data changes. The bar under the pointer lifts off the floor and takes
 * the accent, and its neighbours lift less the further away; the caption
 * reads its value. `intensity` spreads the lift over more bars.
 */

export type BarsProps = {
  /** The values, left to right. Up to 16 are drawn; negatives count as 0. */
  data: number[]
  /** Optional labels for the caption, one per value. */
  labels?: string[]
}

const DEPTH = 18, PITCH = 14, BAR = 9.5, HMAX = 74, LIFT = 9, PAD = 6

const mount: Mount<BarsProps> = ({ stage, svg, read }, radius, initial) => {
  const b = bag()
  let props = initial
  let R = radius
  let over = -1

  const g = el("g", null, svg)
  let bars: { h: Spring; lift: Spring; el: Solid }[] = []
  let width = 0
  let P = project(camera(45, 0.5, 1))
  let c = camera(45, 0.5, 1)

  const values = () => props.data.slice(0, 16).map((v) => (Number.isFinite(v) ? Math.max(0, v) : 0))

  /** Builds the floor and one solid per bar; keeps springs where it can so a data change animates. */
  function build() {
    const vs = values()
    const n = Math.max(1, vs.length)
    width = n * PITCH
    c = camera(45, 0.5, clamp(300 / (width + DEPTH + PAD * 2), 1, 3))
    fit(c, corners(-PAD, -PAD, width + PAD, DEPTH + PAD, -4, HMAX * 0.82), 200, 166)
    P = project(c)
    const front = facing(c)
    const old = bars
    g.replaceChildren()
    const [ring, bevel] = footprint(-PAD, -PAD, width + PAD, DEPTH + PAD, 6, 2)
    draw(solid(g), prism(P, front, ring, bevel, -4, 0))
    // the floor's gridlines, one under each bar
    const grid = path(g, "line lo")
    const lines: [Vec3, Vec3][] = []
    for (let i = 0; i <= n; i++) lines.push([[i * PITCH, 0, 0], [i * PITCH, DEPTH, 0]])
    grid.setAttribute("d", segments(P, lines))
    bars = vs.map((_, i) => ({
      h: old[i]?.h ?? spring(0, 120, 17, 0.05),
      lift: old[i]?.lift ?? spring(0, 200, 22, 0.02),
      el: solid(g),
    }))
    retarget()
  }

  function retarget() {
    const vs = values()
    const peak = Math.max(1e-9, ...vs)
    bars.forEach((bar, i) => {
      bar.h.to = Math.max(0.6, (vs[i] / peak) * HMAX)
      bar.lift.to = over < 0 ? 0 : LIFT * Math.max(0, 1 - Math.abs(i - over) / R)
    })
    if (over >= 0 && over < vs.length) {
      const name = props.labels?.[over] ?? `#${over + 1}`
      read.textContent = `${name} · ${vs[over]}`
    } else read.textContent = `${vs.length} bars`
    L.wake()
  }

  const L = loop(stage, (dt) => {
    const moving = stepAll(bars.flatMap((x) => [x.h, x.lift]), dt)
    bars.forEach((bar, i) => {
      const x0 = i * PITCH + (PITCH - BAR) / 2, y0 = (DEPTH - BAR) / 2
      const z0 = bar.lift.x
      draw(bar.el, block(P, x0, y0, x0 + BAR, y0 + BAR, z0, z0 + bar.h.x))
      bar.el.g.classList.toggle("accent", i === over)
    })
    return moving
  })
  b.add(L.stop)
  build()

  b.add(pointer(stage, {
    move: (p) => {
      const [x] = unproject(c, p[0], p[1], HMAX * 0.3)
      const i = Math.floor(x / PITCH)
      over = i >= 0 && i < bars.length ? i : -1
      retarget()
    },
    leave: () => { over = -1; retarget() },
  }))
  b.add(() => svg.replaceChildren())

  return {
    set: (v) => { R = v; retarget() },
    props: (next) => {
      const grow = next.data.length !== props.data.length
      props = next
      if (grow) build(); else retarget()
    },
    destroy: b.dispose,
  }
}

export const Bars = createFigure<BarsProps>("Bars", {
  id: "bars",
  label: "An isometric bar chart; the bar under the pointer lifts and reads its value.",
  rest: "bars",
  range: [0.6, 1.6, 3.2],
  defaults: { data: [4, 7, 5, 9, 6, 11, 8, 12], labels: undefined },
  mount,
})
