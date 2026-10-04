"use client"

import { createFigure } from "@/registry/isometric/lib/isometric/figure"
import { camera, clamp, corners, face, fit, project, segments, type Vec3 } from "@/registry/isometric/lib/isometric/iso"
import { spring, stepAll, type Spring } from "@/registry/isometric/lib/isometric/motion"
import { bag, el, loop, path, pointer, type Mount } from "@/registry/isometric/lib/isometric/stage"

/**
 * Files — an upright folder holding five sheets. As the pointer comes near
 * the sheets rise out of it; the sheet nearest the pointer rises highest and
 * takes the accent. `intensity` lifts the sheets further.
 */

const W = 100, DEEP = 22, H = 64, N = 5, TAB = 6

type Sheet = { k: number; y: number; rise: Spring; g: SVGGElement; paper: SVGPathElement; text: SVGPathElement }

const mount: Mount<object> = ({ stage, svg, read }, maxRise) => {
  const b = bag()
  const c = camera(28, 0.5, 1.9)
  fit(c, corners(0, 0, W, DEEP, 0, H + 40), 200, 168)
  const P = project(c)
  let top = maxRise
  let pick = -1
  const near = spring(0, 120, 20, 0.01)

  const g = el("g", null, svg)
  path(g, "edge", face(P, [[0, 0, 0], [W, 0, 0], [W, DEEP, 0], [0, DEEP, 0]]))
  // the back of the folder, with its tab
  path(g, "edge", face(P, [[0, 0, 0], [W, 0, 0], [W, 0, H], [36, 0, H], [32, 0, H + TAB], [4, 0, H + TAB], [0, 0, H]]))

  const sheets: Sheet[] = []
  for (let k = 0; k < N; k++) {
    const sg = el("g", null, g)
    sheets.push({ k, y: 4 + k * 3.4, rise: spring(0, 140, 18, 0.02), g: sg, paper: path(sg, "edge"), text: path(sg, "line lo") })
  }
  // the front of the folder, a little lower than the back, with a label
  const flap = el("g", null, g)
  path(flap, "edge", face(P, [[0, DEEP, 0], [W, DEEP, 0], [W, DEEP, H - 16], [0, DEEP, H - 16]]))
  path(flap, "line lo", face(P, [[10, DEEP, H - 30], [44, DEEP, H - 30], [44, DEEP, H - 22], [10, DEEP, H - 22]]))
  path(flap, "line", segments(P, [[[0, 0, 0], [0, DEEP, 0]], [[0, DEEP, 0], [0, DEEP, H - 16]]]))

  function render() {
    for (const s of sheets) {
      const x0 = 7 + s.k * 2, x1 = W - 13 + s.k * 2, z0 = 4 + s.rise.x, z1 = H - 6 + s.rise.x - s.k * 2
      s.paper.setAttribute("d", face(P, [[x0, s.y, z0], [x1, s.y, z0], [x1, s.y, z1], [x0, s.y, z1]]))
      const rows: [Vec3, Vec3][] = []
      for (let r = 0; r < 4; r++) {
        const z = z1 - 8 - r * 6
        if (z < z0 + 4) break
        rows.push([[x0 + 7, s.y, z], [x0 + 7 + [52, 34, 60, 26][r], s.y, z]])
      }
      s.text.setAttribute("d", segments(P, rows))
      s.g.classList.toggle("accent", s.k === pick && near.x > 0.2)
    }
  }

  const L = loop(stage, (dt) => {
    const m = stepAll([near, ...sheets.map((s) => s.rise)], dt)
    render()
    return m
  })
  b.add(L.stop)

  function retarget() {
    for (const s of sheets) {
      const d = pick < 0 ? 1 : Math.abs(s.k - pick) / 1.6
      s.rise.to = near.to * (top * 0.22 + top * Math.max(0, 1 - d))
    }
    read.textContent = near.to > 0.2 && pick >= 0 ? `file ${pick + 1} of ${N}` : "folder"
    L.wake()
  }

  b.add(pointer(stage, {
    move: (p) => {
      const dist = Math.hypot(p[0] - 200, p[1] - 170)
      near.to = clamp(1.25 - dist / 150, 0, 1)
      pick = clamp(Math.floor(((p[0] - 110) / 180) * N), 0, N - 1)
      retarget()
    },
    leave: () => { near.to = 0; pick = -1; retarget() },
  }))
  b.add(() => svg.replaceChildren())

  return { set: (v) => { top = v; retarget() }, destroy: b.dispose }
}

export const Files = createFigure("Files", {
  id: "files",
  label: "An upright folder of five sheets; the sheets rise out of it as the pointer comes near.",
  rest: "folder",
  range: [14, 26, 40],
  defaults: {},
  mount,
})
