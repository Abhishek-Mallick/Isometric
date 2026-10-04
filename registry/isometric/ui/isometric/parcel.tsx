"use client"

import { createFigure } from "@/registry/isometric/lib/isometric/figure"
import { block, camera, clamp, corners, deg, face, fit, project, type Vec3 } from "@/registry/isometric/lib/isometric/iso"
import { spring, stepAll } from "@/registry/isometric/lib/isometric/motion"
import { bag, draw, el, loop, path, pointer, solid, type Mount } from "@/registry/isometric/lib/isometric/stage"

/**
 * Parcel — a closed box. As the pointer comes near, its four flaps fold open
 * about their edges, and once they are past upright a small cube rises out of
 * it. `intensity` swings the flaps further.
 */

const S = 66, H = 42, ITEM = 22

type Flap = { a: Vec3; b: Vec3; n: [number, number]; far: boolean; node: SVGPathElement }

const mount: Mount<object> = ({ stage, svg, read }, maxAngle) => {
  const b = bag()
  const c = camera(45, 0.5, 1.7)
  fit(c, corners(-S / 2, -S / 2, S * 1.5, S * 1.5, 0, H + 24), 200, 168)
  const P = project(c)
  let top = maxAngle
  const open = spring(0, 90, 14, 0.002)

  const g = el("g", null, svg)
  const behind = el("g", null, g)
  const body = solid(g)
  draw(body, block(P, 0, 0, S, S, 0, H))
  const rim = path(g, "line lo")
  const item = solid(g, "accent")
  const above = el("g", null, g)

  const flaps: Flap[] = [
    { a: [0, 0, H], b: [S, 0, H], n: [0, 1], far: true, node: path(above, "edge") },
    { a: [0, 0, H], b: [0, S, H], n: [1, 0], far: true, node: path(above, "edge") },
    { a: [S, 0, H], b: [S, S, H], n: [-1, 0], far: false, node: path(above, "edge") },
    { a: [0, S, H], b: [S, S, H], n: [0, -1], far: false, node: path(above, "edge") },
  ]

  function render() {
    const t = open.x
    const a = deg(t)
    const len = S / 2 - 0.6
    for (const f of flaps) {
      const dx = f.n[0] * Math.cos(a) * len, dy = f.n[1] * Math.cos(a) * len, dz = Math.sin(a) * len
      f.node.setAttribute("d", face(P, [f.a, f.b, [f.b[0] + dx, f.b[1] + dy, f.b[2] + dz], [f.a[0] + dx, f.a[1] + dy, f.a[2] + dz]]))
      // a far flap folded past upright hangs behind the box
      const parent = f.far && t > 90 ? behind : above
      if (f.node.parentNode !== parent) parent.appendChild(f.node)
    }
    // the far flaps are painted before the near ones within each group
    for (const f of flaps) if (f.far && f.node.parentNode === above) above.prepend(f.node)
    const rise = clamp((t - 80) / 70, 0, 1) * ITEM
    rim.setAttribute("d", t > 20 ? face(P, [[3, 3, H], [S - 3, 3, H], [S - 3, S - 3, H], [3, S - 3, H]]) : "")
    const q = (S - ITEM) / 2
    draw(item, rise > 0.3 ? block(P, q, q, q + ITEM, q + ITEM, H, H + rise) : { outline: "", inner: "" })
  }

  const L = loop(stage, (dt) => { const m = stepAll([open], dt); render(); return m })
  b.add(L.stop)

  b.add(pointer(stage, {
    move: (p) => {
      const near = clamp(1.3 - Math.hypot(p[0] - 200, p[1] - 160) / 140, 0, 1)
      open.to = near * top
      read.textContent = open.to < 4 ? "sealed" : `open ${Math.round(open.to)}°`
      L.wake()
    },
    leave: () => { open.to = 0; read.textContent = "sealed"; L.wake() },
  }))
  b.add(() => svg.replaceChildren())

  return { set: (v) => { top = v }, destroy: b.dispose }
}

export const Parcel = createFigure("Parcel", {
  id: "parcel",
  label: "A sealed box; its flaps fold open as the pointer comes near and a cube rises out.",
  rest: "sealed",
  range: [100, 150, 200],
  defaults: {},
  mount,
})
