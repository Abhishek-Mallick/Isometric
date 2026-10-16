import { describe, expect, it } from "vitest"

import { camera, fit, planeMatrix, project, type Vec3 } from "@/registry/isometric/lib/isometric/iso"
import {
  box,
  centroid,
  cylinder,
  dot,
  frustum,
  hollow,
  lathe,
  normal,
  pane,
  prismX,
  teeth,
  torus,
  tube,
  wheel,
  type Mesh,
} from "@/registry/isometric/lib/isometric/mesh"
import { sequence, spring, stagger } from "@/registry/isometric/lib/isometric/motion"
import { compose, label } from "@/registry/isometric/lib/isometric/scene"

const cam = () => {
  const c = camera(45, 0.5, 2)
  fit(c, [
    [0, 0, 0],
    [10, 10, 10],
  ])
  return c
}

/** Every face points away from `core(q)`, the nearest point inside the solid to the face centre `q`. */
function outward(m: Mesh, core: (q: Vec3) => Vec3) {
  return m.f.every((f) => {
    const q = centroid(m, f),
      c = core(q)
    return dot(normal(m, f), [q[0] - c[0], q[1] - c[1], q[2] - c[2]]) > 0
  })
}
const mid = (m: Mesh): Vec3 => m.v.reduce<Vec3>((s, p) => [s[0] + p[0] / m.v.length, s[1] + p[1] / m.v.length, s[2] + p[2] / m.v.length], [0, 0, 0])

describe("new mesh builders keep faces pointing out", () => {
  it("lathe: a closed bottle profile", () => {
    const m = lathe(
      [
        [0, 0],
        [3, 0],
        [3, 4],
        [1.5, 6],
        [1.5, 8],
        [0, 8],
      ],
      20,
    )
    expect(outward(m, () => mid(m))).toBe(true)
  })
  it("lathe: an open profile is capped", () => {
    const m = lathe(
      [
        [2, 0],
        [2, 5],
      ],
      16,
    )
    expect(outward(m, () => mid(m))).toBe(true)
    expect(m.f.length).toBe(16 + 2)
  })
  it("frustum", () => {
    const m = frustum(0, 0, 0, 3, 1, 4, 18)
    expect(outward(m, () => mid(m))).toBe(true)
  })
  it("torus", () => {
    const m = torus(5, 1, 24, 10)
    expect(
      outward(m, (q) => {
        const r = Math.hypot(q[0], q[1]) || 1
        return [(q[0] / r) * 5, (q[1] / r) * 5, 0]
      }),
    ).toBe(true)
  })
  it("hollow: the bore faces in, the rest out", () => {
    const m = hollow(4, 2, 0, 3, 16)
    // faces on the bore point toward the axis; the outer wall away from it; the rings up and down
    for (const f of m.f) {
      const q = centroid(m, f),
        n = normal(m, f),
        r = Math.hypot(q[0], q[1])
      if (Math.abs(n[2]) > 1e-6) expect(Math.sign(n[2])).toBe(q[2] > 1.5 ? 1 : -1)
      else expect(dot(n, [q[0], q[1], 0]) * (r < 3 ? -1 : 1)).toBeGreaterThan(0)
    }
  })
  it("tube along a bend", () => {
    const path: Vec3[] = Array.from({ length: 9 }, (_, i) => {
      const t = (i / 8) * (Math.PI / 2)
      return [6 * Math.cos(t), 6 * Math.sin(t), 0]
    })
    const m = tube(path, 1, 12)
    // each side face points away from the path; the two caps away from the tube
    const near = (q: Vec3) =>
      path.reduce((b, p) => (Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]) < Math.hypot(b[0] - q[0], b[1] - q[1], b[2] - q[2]) ? p : b))
    const sides = m.f.filter((f) => f.length === 4)
    expect(outward({ ...m, f: sides }, near)).toBe(true)
  })
  it("prismX: a crank web extruded along x", () => {
    const m = prismX(
      [
        [-2, -1],
        [2, -1],
        [2, 4],
        [-2, 4],
      ],
      0,
      1.5,
    )
    expect(outward(m, () => mid(m))).toBe(true)
  })
  it("wheel: hub and every blade", () => {
    const w = wheel({ hub: [1, 0.4], tip: 3, height: 2.5, blades: 9 })
    expect(w.blades).toHaveLength(9)
    expect(outward(w.hub, () => mid(w.hub))).toBe(true)
    for (const b of w.blades) expect(outward(b, () => mid(b))).toBe(true)
  })
  it("teeth: a ring of points round a gear", () => {
    const t = teeth(0, 0, 10, 24, 1)
    expect(t.length).toBe(24 * 4)
    for (const [x, y] of t) expect(Math.hypot(x, y)).toBeLessThanOrEqual(11 + 1e-9)
  })
})

describe("painting order", () => {
  it("a piston inside a split bore: the far wall paints before it, the near wall after", () => {
    const bore = hollow(3, 2.6, 0, 10, 24)
    const piston = cylinder(0, 0, 3, 2.5, 3, 24)
    const out = compose(cam(), [
      { mesh: bore, part: "bore", smooth: true, split: true },
      { mesh: piston, part: "piston", smooth: true },
    ])
    const parts = out.map((o) => o.part)
    // some of the bore (its far wall) comes before the piston, and its near wall after
    expect(parts.indexOf("bore")).toBeLessThan(parts.indexOf("piston"))
    expect(parts.lastIndexOf("bore")).toBeGreaterThan(parts.lastIndexOf("piston"))
  })
  it("a lid sitting on a box paints after it, whatever the order given", () => {
    const items = [
      { mesh: box(0, 0, 4, 6, 6, 5), part: "lid" },
      { mesh: box(0, 0, 0, 6, 6, 4), part: "box" },
    ]
    for (const list of [items, items.slice().reverse()]) {
      const out = compose(cam(), list)
      expect(out[out.length - 1].part).toBe("lid")
    }
  })
  it("a long slab under a tall post: the post paints after, though its centre is farther", () => {
    const out = compose(cam(), [
      { mesh: box(0, 0, 4, 2, 2, 20), part: "post" },
      { mesh: box(-20, -20, 0, 30, 30, 4), part: "slab" },
    ])
    expect(out[out.length - 1].part).toBe("post")
  })
  it("marks lying on a face paint after it", () => {
    const out = compose(cam(), [
      {
        pts: [
          [1, 6, 2],
          [5, 6, 2],
        ],
        cls: "lo",
        part: "mark",
      },
      { mesh: box(0, 0, 0, 6, 6, 4), part: "box" },
    ])
    expect(out[out.length - 1].part).toBe("mark")
  })
})

describe("wire and labels", () => {
  it("wire draws seen edges solid and hidden ones dashed", () => {
    const out = compose(cam(), [{ mesh: box(0, 0, 0, 2, 2, 2), wire: true }])
    const seen = out.filter((o) => o.cls === "line wire"),
      hidden = out.filter((o) => o.cls === "line wire hidden")
    expect(seen.length).toBeGreaterThan(0)
    expect(hidden.length).toBeGreaterThan(0)
    expect(out.some((o) => o.cls.includes("face"))).toBe(false)
  })
  it("a label on a face it can see becomes text; from behind it is dropped", () => {
    const front = compose(cam(), [label("V12", [2, 0, 1], [0, 1, 0], [0, 0, 1], 1)])
    const back = compose(cam(), [label("V12", [2, 0, 1], [0, -1, 0], [0, 0, 1], 1)])
    // from this camera exactly one of the two orientations reads the right way round
    expect(front.length + back.length).toBe(1)
    const t = [...front, ...back][0]
    expect(t.text?.s).toBe("V12")
  })
  it("planeMatrix agrees with the scene on which way text reads", () => {
    const P = project(cam())
    const a = planeMatrix(P, [2, 0, 1], [0, 1, 0], [0, 0, 1], 1),
      b = planeMatrix(P, [2, 0, 1], [0, -1, 0], [0, 0, 1], 1)
    expect([a, b].filter(Boolean)).toHaveLength(1)
  })
  it("a pane seen edge-on paints nothing", () => {
    const out = compose(camera(0, 0.5, 1), [
      {
        mesh: pane(
          [
            [0, 0, 0],
            [4, 0, 0],
            [4, 0, 4],
            [0, 0, 4],
          ],
          [1, 0, 0],
        ),
      },
    ])
    expect(out).toHaveLength(0)
  })
})

describe("sequence and stagger", () => {
  it("sends springs off in turn and settles", () => {
    const s = [spring(0, 120, 22), spring(0, 120, 22), spring(0, 120, 22)]
    const seq = sequence(stagger(s, 1, 0.1))
    seq.step(0.05)
    expect(s.map((x) => x.to)).toEqual([1, 0, 0])
    seq.step(0.1)
    expect(s.map((x) => x.to)).toEqual([1, 1, 0])
    let t = 0
    while (seq.step(1 / 60) && t < 10) t += 1 / 60
    expect(t).toBeLessThan(10)
    for (const x of s) expect(x.x).toBeCloseTo(1, 2)
  })
})
