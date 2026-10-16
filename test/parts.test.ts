import { describe, expect, test } from "vitest"

import { camera, fit } from "@/registry/isometric/lib/isometric/iso"
import { compose, toCamera, type Drawable, type Item } from "@/registry/isometric/lib/isometric/scene"
import { PARTS, type PartId } from "@/anatomy/assembly"
import { layout } from "@/anatomy/kinematics"
import { build, geometry, type Frame, type Mode } from "@/anatomy/parts"
import { V12 } from "@/anatomy/spec"

const cylinders = layout(V12)
const g = geometry(V12, cylinders)
const cam = camera(-38, 0.5, 0.9)
fit(
  cam,
  [
    [-160, -340, -170],
    [650, 340, 420],
  ],
  500,
  400,
)
const axes = g.banks.flatMap((b) => [b.axis, b.inward])

const frame = (mode: Mode, over: Partial<Frame> = {}): Frame => ({
  theta: 37,
  throttle: 0.3,
  fuel: true,
  advance: 20,
  turbos: [
    { spin: 1, gate: 0, vent: 0 },
    { spin: 1, gate: 0, vent: 0 },
  ],
  heat: 0.4,
  away: () => (mode === "exploded" ? 1 : 0),
  mode,
  focus: null,
  hover: null,
  eye: toCamera(cam),
  az: cam.az,
  only: 1,
  ...over,
})
const solids = (items: Item[]) => items.filter((it): it is Drawable => "mesh" in it)
const partsIn = (items: Item[]) => new Set(solids(items).map((d) => d.part))

describe("parts", () => {
  test("assembled, the housing hides the internals, so they are not drawn", () => {
    const seen = partsIn(build(V12, cylinders, g, frame("assembled")).items)
    for (const id of ["crank", "rods", "pistons", "intake-valves", "intake-cams"]) expect(seen.has(id)).toBe(false)
    for (const id of ["block", "heads", "covers", "plenum", "turbos", "manifolds"]) expect(seen.has(id)).toBe(true)
    // isolating an internal part draws it, solid, over the rest in outline
    const iso = solids(build(V12, cylinders, g, frame("assembled", { focus: "crank" })).items)
    expect(iso.some((d) => d.part === "crank" && !d.wire)).toBe(true)
    expect(iso.filter((d) => d.part !== "crank").every((d) => d.wire)).toBe(true)
  })

  test("X-ray draws the housing as outlines and the moving parts solid", () => {
    const items = solids(build(V12, cylinders, g, frame("xray")).items)
    expect(items.filter((d) => d.part === "block").every((d) => d.wire)).toBe(true)
    expect(items.filter((d) => d.part === "pistons")).toHaveLength(12)
    expect(items.filter((d) => d.part === "pistons").every((d) => !d.wire)).toBe(true)
    // the charge in every chamber, coloured by its stroke
    expect(items.filter((d) => d.cls?.startsWith("gas "))).toHaveLength(12)
  })

  test("exploded, every part leaves home and is anchored for its callout", () => {
    const { anchors } = build(V12, cylinders, g, frame("exploded"))
    const ids = new Set(anchors.map((a) => a.id))
    for (const p of PARTS) expect(ids.has(p.id), p.id).toBe(true)
    for (const a of anchors) if (a.id !== "block") expect(Math.hypot(a.at[0] - a.home[0], a.at[1] - a.home[1], a.at[2] - a.home[2]), a.id).toBeGreaterThan(100)
  })

  test("the cams turn at half crank speed: back where they started after 720°, not after 360°", () => {
    const lobes = (theta: number) =>
      solids(build(V12, cylinders, g, frame("xray", { theta })).items).filter((d) => d.part === "intake-cams" && d.mesh.f.length < 40)
    const v = (theta: number) => lobes(theta)[0].mesh.v
    const gap = (a: number[][], b: number[][]) => Math.max(...a.map((p, i) => Math.hypot(p[0] - b[i][0], p[1] - b[i][1], p[2] - b[i][2])))
    expect(gap(v(0), v(720))).toBeLessThan(1e-6)
    expect(gap(v(0), v(360))).toBeGreaterThan(5)
  })

  test("parts that do not change shape are built once and reused", () => {
    const a = solids(build(V12, cylinders, g, frame("xray", { theta: 10 })).items)
    const b = solids(build(V12, cylinders, g, frame("xray", { theta: 200 })).items)
    const faces = (items: Drawable[], id: PartId) => items.filter((d) => d.part === id).map((d) => d.mesh.f)
    for (const id of ["block", "pistons", "crank", "intake-valves"] as PartId[]) expect(faces(a, id)).toEqual(faces(b, id))
    expect(faces(a, "block")[0]).toBe(faces(b, "block")[0])
  })

  test("the performance budget: 120 frames of the running engine in each view", () => {
    // faces drawn after hidden ones are dropped, which is what the frame time follows
    const drawn: Record<string, number> = { assembled: 0, xray: 0, exploded: 0 }
    for (const mode of ["assembled", "xray", "exploded"] as Mode[]) {
      const run = (frames: number, from: number) => {
        let n = 0
        for (let i = 0; i < frames; i++) n = Math.max(n, compose(cam, build(V12, cylinders, g, frame(mode, { theta: (from + i) * 6 })).items, { axes }).length)
        return n
      }
      run(10, 0)
      // the best of three batches of 40, so another busy process on the machine does not decide the result
      let best = Infinity
      for (let k = 0; k < 3; k++) {
        const t0 = performance.now()
        drawn[mode] = Math.max(drawn[mode], run(40, k * 40))
        best = Math.min(best, (performance.now() - t0) / 40)
      }
      // about 2 ms assembled and 6 ms in X-ray on a 2020 laptop; the bound leaves room for a slow CI runner
      expect(best, mode).toBeLessThan(28)
    }
    expect(drawn.assembled).toBeLessThan(300)
    expect(drawn.xray).toBeLessThan(1300)
    expect(drawn.exploded).toBeLessThan(1300)
  }, 30_000)
})
