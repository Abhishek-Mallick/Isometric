"use client"

import { createFigure } from "@/registry/isometric/lib/isometric/figure"
import { block, camera, clamp, corners, facing, fit, footprint, prism, project, segments, tile, type Vec3 } from "@/registry/isometric/lib/isometric/iso"
import { spring, stepAll } from "@/registry/isometric/lib/isometric/motion"
import { bag, draw, el, loop, path, pointer, solid, type Mount } from "@/registry/isometric/lib/isometric/stage"

/**
 * Stack — an app window taken apart into four layers: the shell, a grid, the
 * cards and the glass. Moving across the figure opens the gap between them;
 * moving down picks a layer, which takes the accent. `intensity` opens the
 * layers further.
 */

const W = 128, D = 92, T = 2.2, R = 7
const NAMES = ["shell", "grid", "cards", "glass"]

const mount: Mount<object> = ({ stage, svg, read }, maxGap) => {
  const b = bag()
  const c = camera(45, 0.5, 1.45)
  fit(c, corners(0, 0, W, D, 0, 3 * 40 + T), 200, 160)
  const P = project(c), front = facing(c)
  let top = maxGap
  const gap = spring(maxGap * 0.72, 110, 19, 0.02)
  let pick = -1

  const g = el("g", null, svg)
  const guides = path(g, "line dash lo")
  const layers = NAMES.map((name, k) => {
    const lg = el("g", null, g)
    return { name, k, g: lg, panel: solid(lg), detail: el("g", null, lg), parts: [] as ReturnType<typeof solid>[], lines: path(lg, "line lo") }
  })
  // fixed furniture on each layer, drawn relative to its height each frame
  for (let i = 0; i < 3; i++) layers[2].parts.push(solid(layers[2].detail))
  for (let i = 0; i < 2; i++) layers[3].parts.push(solid(layers[3].detail))
  const [ring, bevel] = footprint(0, 0, W, D, R, 2)

  function render() {
    const h = gap.x
    const zs = layers.map((_, k) => k * h)
    // construction lines through the corners, from the shell up to the glass
    const cs: [number, number][] = [[R, R], [W - R, R], [W - R, D - R], [R, D - R]]
    guides.setAttribute("d", h > 1 ? segments(P, cs.map(([x, y]) => [[x, y, T], [x, y, zs[3]]] as [Vec3, Vec3])) : "")
    for (const L of layers) {
      const z = zs[L.k]
      draw(L.panel, prism(P, front, ring, bevel, z, z + T))
      L.g.classList.toggle("accent", L.k === pick)
      const s = z + T
      if (L.k === 0) {
        L.lines.setAttribute("d", tile(P, 10, 10, W - 10, D - 10, s))
      } else if (L.k === 1) {
        let d = ""
        for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) {
          const x0 = 14 + i * 36, y0 = 22 + j * 34
          d += tile(P, x0, y0, x0 + 30, y0 + 28, s)
        }
        L.lines.setAttribute("d", d)
      } else if (L.k === 2) {
        L.parts.forEach((p, i) => draw(p, block(P, 14 + i * 36, 22, 44 + i * 36, 50, s, s + 3 + i * 1.5)))
        L.lines.setAttribute("d", tile(P, 14, 58, W - 14, 80, s))
      } else {
        draw(L.parts[0], block(P, 10, 8, W - 10, 16, s, s + 1.2))
        draw(L.parts[1], block(P, W - 30, 70, W - 12, 82, s, s + 2.4))
        L.lines.setAttribute("d", segments(P, [[[14, 12, s + 1.2], [18, 12, s + 1.2]], [[22, 12, s + 1.2], [26, 12, s + 1.2]]]))
      }
    }
  }

  const L = loop(stage, (dt) => { const m = stepAll([gap], dt); render(); return m })
  b.add(L.stop)

  b.add(pointer(stage, {
    move: (p) => {
      gap.to = clamp((p[0] - 40) / 320, 0, 1) * top
      pick = clamp(3 - Math.floor((p[1] - 40) / 60), 0, 3)
      read.textContent = `${NAMES[pick]} · gap ${gap.to.toFixed(0)}`
      L.wake()
    },
    leave: () => { gap.to = top * 0.72; pick = -1; read.textContent = "window"; L.wake() },
  }))
  b.add(() => svg.replaceChildren())

  return {
    set: (v) => { top = v; if (pick < 0) gap.to = v * 0.72; L.wake() },
    destroy: b.dispose,
  }
}

export const Stack = createFigure("Stack", {
  id: "stack",
  label: "An app window taken apart into four stacked layers; moving across opens the gap.",
  rest: "window",
  range: [20, 30, 40],
  defaults: {},
  mount,
})
