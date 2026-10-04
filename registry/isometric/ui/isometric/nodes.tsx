"use client"

import { createFigure } from "@/registry/isometric/lib/isometric/figure"
import { camera, circle, corners, facing, fit, footprint, lerp, prism, project, segments, unproject, type Vec3 } from "@/registry/isometric/lib/isometric/iso"
import { reducedMotion } from "@/registry/isometric/lib/isometric/motion"
import { bag, dot, draw, el, loop, path, place, pointer, solid, type Mount, type Solid } from "@/registry/isometric/lib/isometric/stage"

/**
 * Nodes — a small network on a plinth: a hub, a ring of eight nodes, and the
 * links between them. A pulse runs from the hub along the shortest route to
 * the node nearest the pointer, lighting the route; at rest it visits each
 * node in turn. With reduced motion the route lights without the pulse.
 * `intensity` makes the pulse travel faster.
 */

const SPOT: [string, number, number][] = [
  ["hub", 60, 60], ["a", 20, 22], ["b", 60, 14], ["c", 100, 24], ["d", 106, 62],
  ["e", 98, 102], ["f", 60, 106], ["g", 20, 98], ["h", 14, 58],
]
const LINKS: [number, number][] = [[0, 2], [0, 4], [0, 6], [0, 8], [2, 1], [2, 3], [4, 3], [4, 5], [6, 5], [6, 7], [8, 7], [8, 1]]
const EXT = 120

/** Breadth-first route from the hub to `to`, as node indices. */
function route(to: number): number[] {
  const prev = new Map<number, number>([[0, -1]])
  const queue = [0]
  while (queue.length) {
    const n = queue.shift()!
    if (n === to) break
    for (const [a, b] of LINKS) {
      const m = a === n ? b : b === n ? a : -1
      if (m >= 0 && !prev.has(m)) { prev.set(m, n); queue.push(m) }
    }
  }
  const out: number[] = []
  for (let n = to; n !== -1; n = prev.get(n)!) out.unshift(n)
  return out
}

const mount: Mount<object> = ({ stage, svg, read }, speed) => {
  const b = bag()
  const c = camera(45, 0.5, 1.6)
  fit(c, corners(-8, -8, EXT + 8, EXT + 8, -5, 14), 200, 164)
  const P = project(c), front = facing(c)
  let rate = speed

  const g = el("g", null, svg)
  const [pr, pb] = footprint(-8, -8, EXT + 8, EXT + 8, 9, 2.4)
  draw(solid(g), prism(P, front, pr, pb, -5, 0))
  const links = path(g, "line")
  links.setAttribute("d", segments(P, LINKS.map(([a, z]) => [[SPOT[a][1], SPOT[a][2], 0], [SPOT[z][1], SPOT[z][2], 0]] as [Vec3, Vec3])))
  const lit = path(g, "line hi")
  const pulse = dot(g, c, 2.4, "dot accent")
  const order = SPOT.map((_, i) => i).sort((i, j) => SPOT[i][1] + SPOT[i][2] - (SPOT[j][1] + SPOT[j][2]))
  const nodes: Solid[] = []
  for (const i of order) {
    const [, x, y] = SPOT[i]
    const s = solid(g)
    const r = i === 0 ? 7 : 4.6
    draw(s, prism(P, front, circle(r, x, y, 40), circle(r - 1.4, x, y, 40), 0, i === 0 ? 13 : 7))
    nodes[i] = s
  }

  let target = -1, path_: number[] = [], t = 0, pointed = false
  function choose(n: number) {
    if (n === target) return
    target = n
    path_ = route(n)
    t = 0
    lit.setAttribute("d", segments(P, path_.slice(1).map((m, k) => {
      const a = SPOT[path_[k]], z = SPOT[m]
      return [[a[1], a[2], 0], [z[1], z[2], 0]] as [Vec3, Vec3]
    })))
    nodes.forEach((s, i) => {
      s.g.classList.toggle("hi", path_.includes(i))
      s.g.classList.toggle("accent", i === n)
    })
    read.textContent = `hub → ${SPOT[n][0]}`
  }
  choose(1)

  const L = loop(stage, (dt) => {
    if (reducedMotion()) { pulse.setAttribute("visibility", "hidden"); return false }
    pulse.setAttribute("visibility", "visible")
    const legs = path_.length - 1
    t += dt * rate
    // run the route, linger a beat on arrival, then go again (or on to the next node at rest)
    if (t > legs + 0.6) {
      if (!pointed) choose(target % (SPOT.length - 1) + 1)
      t = 0
    }
    const k = Math.min(Math.floor(t), legs - 1), f = Math.min(1, t - k)
    const a = SPOT[path_[Math.max(0, k)]], z = SPOT[path_[Math.max(0, k) + 1]] ?? a
    place(pulse, P(lerp(a[1], z[1], f), lerp(a[2], z[2], f), 0))
    return true
  })
  b.add(L.stop)

  b.add(pointer(stage, {
    move: (p) => {
      const [x, y] = unproject(c, p[0], p[1], 0)
      let best = 1, bd = Infinity
      for (let i = 1; i < SPOT.length; i++) {
        const d = Math.hypot(SPOT[i][1] - x, SPOT[i][2] - y)
        if (d < bd) { bd = d; best = i }
      }
      pointed = true
      choose(best)
      L.wake()
    },
    leave: () => { pointed = false; L.wake() },
  }))
  b.add(() => svg.replaceChildren())

  return { set: (v) => { rate = v }, destroy: b.dispose }
}

export const Nodes = createFigure("Nodes", {
  id: "nodes",
  label: "A network of a hub and eight nodes; a pulse runs to the node nearest the pointer.",
  rest: "hub → a",
  range: [0.8, 1.6, 3],
  defaults: {},
  mount,
})
