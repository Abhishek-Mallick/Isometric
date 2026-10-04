import type { Vec2, Vec3 } from "./iso"

/**
 * Isometric — meshes: solids as vertices and faces, with no DOM.
 *
 * Each face lists vertex indices counter-clockwise as seen from outside the
 * solid, so its normal `(b - a) × (c - a)` points out. That one convention is
 * what lets the scene hide the faces that turn away from the camera. Every
 * builder here keeps it, and every transform preserves it (rotations and
 * translations do; `scale` flips faces when an odd number of axes are
 * mirrored).
 */

/** `soft` marks the facets of a curved surface: a smooth drawable hides their seams. */
export type Mesh = { v: Vec3[]; f: number[][]; soft?: boolean[] }

const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
export const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
export const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]

/** A face's outward normal (not normalised). Uses Newell's method, so it holds for any planar polygon. */
export function normal(m: Mesh, face: number[]): Vec3 {
  const n: Vec3 = [0, 0, 0]
  for (let i = 0; i < face.length; i++) {
    const a = m.v[face[i]], b = m.v[face[(i + 1) % face.length]]
    n[0] += (a[1] - b[1]) * (a[2] + b[2])
    n[1] += (a[2] - b[2]) * (a[0] + b[0])
    n[2] += (a[0] - b[0]) * (a[1] + b[1])
  }
  return n
}

export const centroid = (m: Mesh, face: number[]): Vec3 => {
  const c: Vec3 = [0, 0, 0]
  for (const i of face) { c[0] += m.v[i][0]; c[1] += m.v[i][1]; c[2] += m.v[i][2] }
  return [c[0] / face.length, c[1] / face.length, c[2] / face.length]
}

/* ---------- builders ---------- */

/** An axis-aligned box. */
export function box(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number): Mesh {
  return extrude([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], z0, z1)
}

/** A box from its centre on the ground and its size: handy for parts placed by their middle. */
export const cube = (cx: number, cy: number, z0: number, w: number, d: number, h: number) =>
  box(cx - w / 2, cy - d / 2, z0, cx + w / 2, cy + d / 2, z0 + h)

/** Signed area of a ground polygon: positive when it runs counter-clockwise seen from above. */
export const area = (poly: readonly Vec2[]) => {
  let s = 0
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length]
    s += a[0] * b[1] - b[0] * a[1]
  }
  return s / 2
}

/**
 * A simple polygon on the ground, extruded from z0 to z1. The polygon may run
 * either way round; it is turned counter-clockwise first. It may be concave:
 * its lid and floor are drawn whole, as single faces.
 */
export function extrude(poly: readonly Vec2[], z0: number, z1: number, curved = false): Mesh {
  const p = area(poly) < 0 ? poly.slice().reverse() : poly.slice()
  const n = p.length
  const v: Vec3[] = [...p.map(([x, y]) => [x, y, z0] as Vec3), ...p.map(([x, y]) => [x, y, z1] as Vec3)]
  const f: number[][] = [
    Array.from({ length: n }, (_, i) => n - 1 - i), // floor, facing down
    Array.from({ length: n }, (_, i) => n + i), // lid, facing up
  ]
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    f.push([i, j, n + j, n + i])
  }
  return { v, f, soft: curved ? f.map((_, i) => i >= 2) : undefined }
}

/** A regular polygon about (cx, cy): the outline of a cylinder, a gear, a bolt head. */
export const ngon = (cx: number, cy: number, r: number, sides: number, turn = 0): Vec2[] =>
  Array.from({ length: sides }, (_, i) => {
    const a = turn + (i / sides) * Math.PI * 2
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)]
  })

/** An upright cylinder with `sides` facets. Draw it `smooth` to hide the facet lines. */
export const cylinder = (cx: number, cy: number, z0: number, r: number, h: number, sides = 24) =>
  extrude(ngon(cx, cy, r, sides), z0, z0 + h, true)

/** A pyramid on a ground polygon, its apex at (ax, ay, az). */
export function pyramid(base: readonly Vec2[], z0: number, apex: Vec3): Mesh {
  const p = area(base) < 0 ? base.slice().reverse() : base.slice()
  const n = p.length
  const v: Vec3[] = [...p.map(([x, y]) => [x, y, z0] as Vec3), apex]
  const f: number[][] = [Array.from({ length: n }, (_, i) => n - 1 - i)]
  for (let i = 0; i < n; i++) f.push([i, (i + 1) % n, n])
  return { v, f }
}

/**
 * A gabled roof running along x: `len` long, `wide` across, its ridge `rise`
 * above the eaves at z0. `overhang` pushes the eaves out past the walls.
 */
export function gable(x0: number, y0: number, z0: number, len: number, wide: number, rise: number): Mesh {
  const x1 = x0 + len, y1 = y0 + wide, ym = y0 + wide / 2, zr = z0 + rise
  return {
    v: [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [x0, ym, zr], [x1, ym, zr]],
    f: [[0, 3, 2, 1], [0, 1, 5, 4], [2, 3, 4, 5], [0, 4, 3], [1, 2, 5]],
  }
}

/* ---------- transforms ---------- */

export const translate = (m: Mesh, d: Vec3): Mesh => ({ ...m, v: m.v.map((p) => add(p, d)) })

function rotate(m: Mesh, axis: 0 | 1 | 2, a: number, pivot: Vec3): Mesh {
  if (!a) return m
  const c = Math.cos(a), s = Math.sin(a)
  return {
    v: m.v.map((p) => {
      const [x, y, z] = sub(p, pivot)
      const r: Vec3 = axis === 0 ? [x, y * c - z * s, y * s + z * c] : axis === 1 ? [x * c + z * s, y, -x * s + z * c] : [x * c - y * s, x * s + y * c, z]
      return add(r, pivot)
    }),
    f: m.f,
    soft: m.soft,
  }
}

/** Turns about the x axis through `pivot`, by `a` radians (right-handed). */
export const rotateX = (m: Mesh, a: number, pivot: Vec3 = [0, 0, 0]) => rotate(m, 0, a, pivot)
export const rotateY = (m: Mesh, a: number, pivot: Vec3 = [0, 0, 0]) => rotate(m, 1, a, pivot)
export const rotateZ = (m: Mesh, a: number, pivot: Vec3 = [0, 0, 0]) => rotate(m, 2, a, pivot)

/** Scales about `pivot`. A mirrored scale reverses every face so the normals still point out. */
export function scale(m: Mesh, s: Vec3 | number, pivot: Vec3 = [0, 0, 0]): Mesh {
  const k: Vec3 = typeof s === "number" ? [s, s, s] : s
  const flip = (k[0] < 0 ? 1 : 0) + (k[1] < 0 ? 1 : 0) + (k[2] < 0 ? 1 : 0)
  return {
    v: m.v.map((p) => add(pivot, [(p[0] - pivot[0]) * k[0], (p[1] - pivot[1]) * k[1], (p[2] - pivot[2]) * k[2]])),
    f: flip % 2 ? m.f.map((face) => face.slice().reverse()) : m.f,
    soft: m.soft,
  }
}

/** Several meshes as one. Only for meshes that do not overlap: they are sorted as a single solid. */
export function merge(...ms: Mesh[]): Mesh {
  const v: Vec3[] = [], f: number[][] = [], soft: boolean[] = []
  for (const m of ms) {
    const o = v.length
    v.push(...m.v)
    m.f.forEach((face, i) => { f.push(face.map((k) => k + o)); soft.push(!!m.soft?.[i]) })
  }
  return { v, f, soft: soft.some(Boolean) ? soft : undefined }
}

/**
 * A flat polygon of world points, turned to face `toward`: a window pane, a
 * doorway, a sign on a wall. One face, so the scene hides it from behind.
 */
export function pane(pts: readonly Vec3[], toward: Vec3): Mesh {
  const m: Mesh = { v: pts.slice(), f: [pts.map((_, i) => i)] }
  return dot(normal(m, m.f[0]), toward) < 0 ? { v: m.v, f: [m.f[0].slice().reverse()] } : m
}
