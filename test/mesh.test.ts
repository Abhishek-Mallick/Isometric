import { describe, expect, it } from "vitest"

import { camera, fit, type Vec3 } from "@/registry/isometric/lib/isometric/iso"
import { box, centroid, cylinder, dot, extrude, gable, merge, normal, pane, pyramid, rotateX, rotateZ, scale, translate, type Mesh } from "@/registry/isometric/lib/isometric/mesh"
import { compose, toCamera } from "@/registry/isometric/lib/isometric/scene"

/** Every face's normal points away from the solid's centre. */
function outward(m: Mesh) {
  const c: Vec3 = m.v.reduce<Vec3>((s, p) => [s[0] + p[0], s[1] + p[1], s[2] + p[2]], [0, 0, 0]).map((x) => x / m.v.length) as Vec3
  return m.f.every((f) => {
    const q = centroid(m, f)
    return dot(normal(m, f), [q[0] - c[0], q[1] - c[1], q[2] - c[2]]) > 0
  })
}

const cam = () => {
  const c = camera(45, 0.5, 2)
  fit(c, [[0, 0, 0], [10, 10, 10]])
  return c
}

describe("mesh builders keep faces pointing out", () => {
  it.each([
    ["box", box(0, 0, 0, 4, 3, 2)],
    ["extrude (clockwise input)", extrude([[0, 0], [0, 4], [4, 4], [4, 0]], 0, 2)],
    ["cylinder", cylinder(0, 0, 0, 3, 5, 16)],
    ["pyramid", pyramid([[0, 0], [4, 0], [4, 4], [0, 4]], 0, [2, 2, 5])],
    ["gable", gable(0, 0, 0, 6, 4, 2)],
    ["rotated", rotateZ(rotateX(box(0, 0, 0, 2, 2, 2), 0.7, [1, 1, 1]), 1.1, [1, 1, 1])],
    ["mirrored", scale(box(0, 0, 0, 2, 3, 4), [-1, 1, 1])],
  ])("%s", (_, m) => expect(outward(m)).toBe(true))
})

describe("scene", () => {
  it("shows exactly three faces of a box from the default camera", () => {
    const out = compose(cam(), [{ mesh: box(0, 0, 0, 2, 2, 2) }])
    expect(out).toHaveLength(3)
    expect(out.every((o) => o.cls.includes("face"))).toBe(true)
  })

  it("shows the lid and the near sides after a quarter turn", () => {
    expect(compose(cam(), [{ mesh: rotateZ(box(0, 0, 0, 2, 2, 2), Math.PI / 2, [1, 1, 0]) }])).toHaveLength(3)
  })

  it("paints the nearer solid last", () => {
    const out = compose(cam(), [
      { mesh: box(6, 6, 0, 8, 8, 2), part: "near" },
      { mesh: box(0, 0, 0, 2, 2, 2), part: "far" },
    ])
    expect(out[0].part).toBe("far")
    expect(out[out.length - 1].part).toBe("near")
  })

  it("bias moves a solid in the painting order", () => {
    const out = compose(cam(), [
      { mesh: box(6, 6, 0, 8, 8, 2), part: "near" },
      { mesh: box(0, 0, 0, 2, 2, 2), part: "far", bias: 100 },
    ])
    expect(out[out.length - 1].part).toBe("far")
  })

  it("layers order whole objects before depth", () => {
    const out = compose(cam(), [
      { mesh: box(6, 6, 0, 8, 8, 2), part: "near", layer: 0 },
      { mesh: box(0, 0, 0, 2, 2, 2), part: "far", layer: 1 },
    ])
    expect(out[out.length - 1].part).toBe("far")
  })

  it("smooth solids hide facet lines and add one outline", () => {
    const out = compose(cam(), [{ mesh: cylinder(5, 5, 0, 3, 4, 20), smooth: true }])
    // the visible facets become one seamless path with a subpath per facet
    const facets = out.filter((o) => o.cls.includes("facet"))
    expect(facets).toHaveLength(1)
    expect((facets[0].d.match(/M/g) ?? []).length).toBeGreaterThan(4)
    expect(out.filter((o) => o.cls.includes("line edge"))).toHaveLength(1)
  })

  it("shading tells the lid and the two sides apart", () => {
    const out = compose(cam(), [{ mesh: box(0, 0, 0, 2, 2, 2), shade: true }])
    expect(out.map((o) => o.cls.match(/tone-\w+/)?.[0]).sort()).toEqual(["tone-left", "tone-right", "tone-top"])
  })

  it("strokes become open lines with the drawable's depth", () => {
    const out = compose(cam(), [{ pts: [[0, 0, 0], [5, 5, 5]], cls: "dash" }])
    expect(out[0].cls).toBe("line dash")
    expect(out[0].d.endsWith("Z")).toBe(false)
  })

  it("toCamera points up and toward the near corner", () => {
    const e = toCamera(camera(45, 0.5, 1))
    expect(e[0]).toBeGreaterThan(0)
    expect(e[1]).toBeGreaterThan(0)
    expect(e[2]).toBeGreaterThan(0)
  })

  it("a pane faces the way it is told, whichever way its points run", () => {
    const pts: Vec3[] = [[0, 0, 0], [0, 4, 0], [0, 4, 4], [0, 0, 4]]
    for (const order of [pts, pts.slice().reverse()]) {
      const m = pane(order, [1, 0, 0])
      expect(dot(normal(m, m.f[0]), [1, 0, 0])).toBeGreaterThan(0)
    }
    expect(compose(cam(), [{ mesh: pane(pts, [1, 0, 0]) }])).toHaveLength(1)
    expect(compose(cam(), [{ mesh: pane(pts, [-1, 0, 0]) }])).toHaveLength(0)
  })

  it("merge and translate keep the face count", () => {
    const m = merge(box(0, 0, 0, 1, 1, 1), translate(box(0, 0, 0, 1, 1, 1), [3, 0, 0]))
    expect(m.f).toHaveLength(12)
    expect(m.v).toHaveLength(16)
  })
})
