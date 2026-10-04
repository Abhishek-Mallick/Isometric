import { describe, expect, it } from "vitest"

import { block, camera, circle, corners, facing, fit, hull, prism, project, roundRect, run, scale, unproject } from "@/registry/isometric/lib/isometric/iso"
import { at, retarget, setReducedMotion, spring, step, tween } from "@/registry/isometric/lib/isometric/motion"

describe("projection", () => {
  it("unproject inverts project on any plane", () => {
    const c = camera(45, 0.5, 1.7)
    const P = project(c)
    for (const [x, y, z] of [[0, 0, 0], [12, -30, 0], [40, 7, 18], [-5, 66, 3]]) {
      const [sx, sy] = P(x, y, z)
      const [u, v] = unproject(c, sx, sy, z)
      expect(u).toBeCloseTo(x, 6)
      expect(v).toBeCloseTo(y, 6)
    }
  })

  it("fit centres the bounds on the target point", () => {
    const c = camera(45, 0.5, 2)
    const pts = corners(0, 0, 50, 30, 0, 20)
    fit(c, pts, 200, 160)
    const P = project(c)
    const xs = pts.map((p) => P(...p)[0]), ys = pts.map((p) => P(...p)[1])
    expect((Math.min(...xs) + Math.max(...xs)) / 2).toBeCloseTo(200, 6)
    expect((Math.min(...ys) + Math.max(...ys)) / 2).toBeCloseTo(160, 6)
  })

  it("lifts z straight up the screen", () => {
    const P = project(camera(30, 0.5, 1))
    const a = P(5, 5, 0), b = P(5, 5, 10)
    expect(b[0]).toBeCloseTo(a[0])
    expect(b[1]).toBeLessThan(a[1])
  })
})

describe("outlines", () => {
  it("hull keeps only the outside points", () => {
    const h = hull([[0, 0], [10, 0], [10, 10], [0, 10], [5, 5], [3, 7]])
    expect(h).toHaveLength(4)
  })

  it("roundRect samples stay inside the box and carry unit normals", () => {
    for (const q of roundRect(0, 0, 20, 10, 3)) {
      expect(q.u).toBeGreaterThanOrEqual(-1e-9)
      expect(q.u).toBeLessThanOrEqual(20 + 1e-9)
      expect(Math.hypot(q.nu, q.nv)).toBeCloseTo(1)
    }
  })

  it("the front run of a circle is about half of it", () => {
    const ring = circle(10, 0, 0, 64)
    const front = run(ring, facing(camera(45, 0.5, 1)))
    expect(front.length).toBeGreaterThanOrEqual(31)
    expect(front.length).toBeLessThanOrEqual(34)
  })
})

describe("solids", () => {
  it("a prism has an outline and a bevel", () => {
    const c = camera(45, 0.5, 1)
    const s = prism(project(c), facing(c), roundRect(0, 0, 10, 10, 2), roundRect(1, 1, 9, 9, 1), 0, 5)
    expect(s.outline.startsWith("M")).toBe(true)
    expect(s.outline.endsWith("Z")).toBe(true)
    expect(s.inner.length).toBeGreaterThan(0)
  })

  it("a block draws three inner edges, and two when flat", () => {
    const P = project(camera(45, 0.5, 1))
    expect(block(P, 0, 0, 10, 10, 0, 6).inner.match(/M/g)).toHaveLength(3)
    expect(block(P, 0, 0, 10, 10, 0, 0).inner.match(/M/g)).toHaveLength(2)
  })
})

describe("intensity", () => {
  it("maps through two lines that meet at the middle", () => {
    const r = [10, 20, 60] as const
    expect(scale(0, r)).toBe(10)
    expect(scale(0.25, r)).toBe(15)
    expect(scale(0.5, r)).toBe(20)
    expect(scale(1, r)).toBe(60)
  })

  it("clamps, and treats junk as the default", () => {
    const r = [0, 1, 2] as const
    expect(scale(-3, r)).toBe(0)
    expect(scale(9, r)).toBe(2)
    expect(scale(undefined, r)).toBe(1)
    expect(scale("0.75", r)).toBe(1.5)
    expect(scale(NaN, r)).toBe(1)
  })
})

describe("motion", () => {
  it("a spring settles on its target", () => {
    const s = spring(0)
    s.to = 10
    let moving = true, frames = 0
    while (moving && frames < 600) { moving = step(s, 1 / 60); frames++ }
    expect(moving).toBe(false)
    expect(s.x).toBe(10)
  })

  it("reduced motion lands in one step", () => {
    setReducedMotion(true)
    const s = spring(0)
    s.to = 4
    expect(step(s, 1 / 60)).toBe(false)
    expect(s.x).toBe(4)
    const tw = tween(0)
    retarget(tw, 1, 0)
    expect(at(tw, 1)).toBe(1)
    setReducedMotion(false)
  })

  it("a tween eases from where it is", () => {
    const tw = tween(0, 100)
    retarget(tw, 10, 0)
    expect(at(tw, 0)).toBe(0)
    expect(at(tw, 50)).toBeGreaterThan(5)
    expect(at(tw, 100)).toBe(10)
  })
})
