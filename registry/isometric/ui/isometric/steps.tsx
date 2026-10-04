"use client"

import { createFigure } from "@/registry/isometric/lib/isometric/figure"
import { block, camera, clamp, corners, fit, project } from "@/registry/isometric/lib/isometric/iso"
import { spring, stepAll } from "@/registry/isometric/lib/isometric/motion"
import { bag, draw, el, loop, path, pointer, solid, type Mount, type Solid } from "@/registry/isometric/lib/isometric/stage"

/**
 * Steps — a staircase that reads as progress. A token rests on the `current`
 * step; the pointer walks it up and down, and it hops from step to step on a
 * spring. Steps it has climbed are drawn bright. `intensity` makes the hop
 * quicker.
 */

export type StepsProps = {
  /** How many steps, 2 to 9. */
  steps: number
  /** The step the token rests on, from 1. */
  current: number
}

const RUN = 15, RISE = 9, WIDE = 40, TOKEN = 7

const mount: Mount<StepsProps> = ({ stage, svg, read }, stiffness, initial) => {
  const b = bag()
  let props = initial
  const g = el("g", null, svg)
  let solids: Solid[] = []
  let token: Solid
  let shadow: SVGPathElement
  let n = 0
  let at = 0
  const pos = spring(0, stiffness, 2 * Math.sqrt(stiffness) * 0.75, 0.005)
  let c = camera(-45, 0.5, 1)
  let P = project(c)

  const count = () => clamp(Math.round(props.steps) || 5, 2, 9)
  const resting = () => clamp(Math.round(props.current) || 1, 1, count()) - 1

  function build() {
    n = count()
    c = camera(-45, 0.5, clamp(300 / (n * RUN + WIDE), 1, 2.4))
    fit(c, corners(0, 0, n * RUN, WIDE, 0, n * RISE + TOKEN + 6), 200, 166)
    P = project(c)
    g.replaceChildren()
    // the step farthest along x is the one at the back of this view, so paint from the last step down
    solids = []
    for (let i = n - 1; i >= 0; i--) {
      const s = solid(g)
      draw(s, block(P, i * RUN, 0, (i + 1) * RUN, WIDE, 0, (i + 1) * RISE))
      solids[i] = s
    }
    shadow = path(g, "line dash lo")
    token = solid(g, "accent")
    at = resting()
    pos.to = at
  }

  function render() {
    const x = pos.x
    const i = clamp(Math.round(x), 0, n - 1)
    // a hop: the token arcs between steps, highest halfway
    const frac = x - Math.floor(x)
    const arc = Math.sin(Math.PI * frac) * RISE * 0.9
    const floor = (clamp(x, 0, n - 1) + 1) * RISE
    const cx = (x + 0.5) * RUN, cy = WIDE / 2
    draw(token, block(P, cx - TOKEN / 2, cy - TOKEN / 2, cx + TOKEN / 2, cy + TOKEN / 2, floor + arc, floor + arc + TOKEN))
    const ground = (i + 1) * RISE
    const a = P(cx, cy, ground), t = P(cx, cy, floor + arc)
    shadow.setAttribute("d", arc > 1 ? `M${a[0]} ${a[1]}L${t[0]} ${t[1]}` : "")
    solids.forEach((s, k) => s.g.classList.toggle("hi", k <= i))
  }

  build()
  const L = loop(stage, (dt) => { const m = stepAll([pos], dt); render(); return m })
  b.add(L.stop)
  read.textContent = `step ${at + 1} of ${n}`

  function go(k: number) {
    at = clamp(k, 0, n - 1)
    pos.to = at
    read.textContent = `step ${at + 1} of ${n}`
    L.wake()
  }

  b.add(pointer(stage, {
    move: (p) => {
      // project each step's tread centre and take the nearest along the screen
      let best = 0, bd = Infinity
      for (let k = 0; k < n; k++) {
        const q = P((k + 0.5) * RUN, WIDE / 2, (k + 1) * RISE)
        const d = Math.abs(q[0] - p[0])
        if (d < bd) { bd = d; best = k }
      }
      go(best)
    },
    leave: () => go(resting()),
  }))
  b.add(() => svg.replaceChildren())

  return {
    set: (v) => { pos.k = v; pos.c = 2 * Math.sqrt(v) * 0.75 },
    props: (next) => {
      const rebuild = clamp(Math.round(next.steps) || 5, 2, 9) !== n
      props = next
      if (rebuild) build()
      go(resting())
    },
    destroy: b.dispose,
  }
}

export const Steps = createFigure<StepsProps>("Steps", {
  id: "steps",
  label: "A staircase with a token on the current step; the pointer walks it up and down.",
  rest: "step 2 of 5",
  range: [50, 120, 260],
  defaults: { steps: 5, current: 2 },
  mount,
})
