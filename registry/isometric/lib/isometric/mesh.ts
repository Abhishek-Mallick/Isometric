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
    const a = m.v[face[i]],
      b = m.v[face[(i + 1) % face.length]]
    n[0] += (a[1] - b[1]) * (a[2] + b[2])
    n[1] += (a[2] - b[2]) * (a[0] + b[0])
    n[2] += (a[0] - b[0]) * (a[1] + b[1])
  }
  return n
}

export const centroid = (m: Mesh, face: number[]): Vec3 => {
  const c: Vec3 = [0, 0, 0]
  for (const i of face) {
    c[0] += m.v[i][0]
    c[1] += m.v[i][1]
    c[2] += m.v[i][2]
  }
  return [c[0] / face.length, c[1] / face.length, c[2] / face.length]
}

/* ---------- builders ---------- */

/** An axis-aligned box. */
export function box(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number): Mesh {
  return extrude(
    [
      [x0, y0],
      [x1, y0],
      [x1, y1],
      [x0, y1],
    ],
    z0,
    z1,
  )
}

/** A box from its centre on the ground and its size: handy for parts placed by their middle. */
export const cube = (cx: number, cy: number, z0: number, w: number, d: number, h: number) => box(cx - w / 2, cy - d / 2, z0, cx + w / 2, cy + d / 2, z0 + h)

/** Signed area of a ground polygon: positive when it runs counter-clockwise seen from above. */
export const area = (poly: readonly Vec2[]) => {
  let s = 0
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i],
      b = poly[(i + 1) % poly.length]
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
export const cylinder = (cx: number, cy: number, z0: number, r: number, h: number, sides = 24) => extrude(ngon(cx, cy, r, sides), z0, z0 + h, true)

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
  const x1 = x0 + len,
    y1 = y0 + wide,
    ym = y0 + wide / 2,
    zr = z0 + rise
  return {
    v: [
      [x0, y0, z0],
      [x1, y0, z0],
      [x1, y1, z0],
      [x0, y1, z0],
      [x0, ym, zr],
      [x1, ym, zr],
    ],
    f: [
      [0, 3, 2, 1],
      [0, 1, 5, 4],
      [2, 3, 4, 5],
      [0, 4, 3],
      [1, 2, 5],
    ],
  }
}

/* ---------- transforms ---------- */

export const translate = (m: Mesh, d: Vec3): Mesh => ({ ...m, v: m.v.map((p) => add(p, d)) })

function rotate(m: Mesh, axis: 0 | 1 | 2, a: number, pivot: Vec3): Mesh {
  if (!a) return m
  const c = Math.cos(a),
    s = Math.sin(a)
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
  const v: Vec3[] = [],
    f: number[][] = [],
    soft: boolean[] = []
  for (const m of ms) {
    const o = v.length
    v.push(...m.v)
    m.f.forEach((face, i) => {
      f.push(face.map((k) => k + o))
      soft.push(!!m.soft?.[i])
    })
  }
  return { v, f, soft: soft.some(Boolean) ? soft : undefined }
}

/** Applies `fn` to every vertex. Pass `mirror` when `fn` reflects space, so the faces turn back outward. */
export function mapMesh(m: Mesh, fn: (p: Vec3) => Vec3, mirror = false): Mesh {
  return { v: m.v.map(fn), f: mirror ? m.f.map((face) => face.slice().reverse()) : m.f, soft: m.soft }
}

/** Lays a mesh built along z onto x: z becomes x, x becomes y, y becomes z. A rotation, so faces stay outward. */
export const zToX = (m: Mesh): Mesh => mapMesh(m, ([x, y, z]) => [z, x, y])
/** Lays a mesh built along z onto y: z becomes y, x becomes z, y becomes x. */
export const zToY = (m: Mesh): Mesh => mapMesh(m, ([x, y, z]) => [y, z, x])

/** A polygon in the y–z plane (as [y, z] pairs) extruded along x: a crank web, a cam lobe, a gasket. */
export const prismX = (poly: readonly Vec2[], x0: number, x1: number, curved = false): Mesh => zToX(extrude(poly, x0, x1, curved))

/**
 * A solid of revolution about the z axis: `profile` is a list of [r, z]
 * points, turned through `sides` steps. An open profile that starts or ends
 * off the axis is capped there; a point on the axis (r = 0) closes it to a
 * tip. A `closed` profile is a loop (a ring, a torus) and has no caps. Run
 * an open profile from bottom to top, and a loop counter-clockwise in the
 * r–z plane, and the faces point out.
 *
 * Every turned face is a facet of the curve, so a smooth drawable shows
 * only its outline, its rims and the folds where the profile turns sharply.
 */
export function lathe(profile: readonly Vec2[], sides = 24, closed = false, turn = 0): Mesh {
  const v: Vec3[] = [],
    f: number[][] = [],
    soft: boolean[] = []
  const ring: number[][] = profile.map(([r, z]) => {
    if (r < 1e-9) {
      v.push([0, 0, z])
      return [v.length - 1]
    }
    const idx: number[] = []
    for (let i = 0; i < sides; i++) {
      const a = turn + (i / sides) * Math.PI * 2
      v.push([r * Math.cos(a), r * Math.sin(a), z])
      idx.push(v.length - 1)
    }
    return idx
  })
  const at = (k: number, i: number) => (ring[k].length === 1 ? ring[k][0] : ring[k][i % sides])
  const n = profile.length,
    segs = closed ? n : n - 1
  for (let k = 0; k < segs; k++) {
    const k2 = (k + 1) % n
    for (let i = 0; i < sides; i++) {
      const face = [at(k, i), at(k, i + 1), at(k2, i + 1), at(k2, i)].filter((x, j, all) => all.indexOf(x) === j)
      if (face.length < 3) continue
      f.push(face)
      soft.push(true)
    }
  }
  if (!closed) {
    if (ring[0].length > 1) {
      f.push(ring[0].slice().reverse())
      soft.push(false)
    }
    if (ring[n - 1].length > 1) {
      f.push(ring[n - 1].slice())
      soft.push(false)
    }
  }
  return { v, f, soft }
}

/** A cone cut short: radius r0 at z0, r1 at z0 + h. A bell, a lamp shade, a valve head. */
export const frustum = (cx: number, cy: number, z0: number, r0: number, r1: number, h: number, sides = 24) =>
  translate(
    lathe(
      [
        [r0, 0],
        [r1, h],
      ],
      sides,
    ),
    [cx, cy, z0],
  )

/** A ring of radius R around the z axis, with a round section of radius r. */
export const torus = (R: number, r: number, sides = 32, section = 12) =>
  lathe(
    Array.from({ length: section }, (_, i): Vec2 => {
      const t = (i / section) * Math.PI * 2
      return [R + r * Math.cos(t), r * Math.sin(t)]
    }),
    sides,
    true,
  )

/** A tube: an upright cylinder with a bore, from z0 to z0 + h. A bushing, a liner, a rod's big end. */
export const hollow = (rOut: number, rIn: number, z0: number, h: number, sides = 24) =>
  lathe(
    [
      [rIn, z0],
      [rOut, z0],
      [rOut, z0 + h],
      [rIn, z0 + h],
    ],
    sides,
    true,
  )

/**
 * A round tube swept along a path of points, capped at both ends: a pipe,
 * a hose, an exhaust runner. Frames are carried along the path without
 * twisting, so the facets stay straight.
 */
export function tube(path: readonly Vec3[], r: number, sides = 12): Mesh {
  const n = path.length
  const v: Vec3[] = [],
    f: number[][] = [],
    soft: boolean[] = []
  const tan = (i: number): Vec3 => {
    const a = path[Math.max(0, i - 1)],
      b = path[Math.min(n - 1, i + 1)]
    const d = sub(b, a),
      l = Math.hypot(d[0], d[1], d[2]) || 1
    return [d[0] / l, d[1] / l, d[2] / l]
  }
  let t = tan(0)
  const seed: Vec3 = Math.abs(t[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0]
  let nrm = cross(cross(t, seed), t)
  for (let i = 0; i < n; i++) {
    const t2 = tan(i)
    // carry the normal: remove its part along the new tangent
    const k = dot(nrm, t2)
    nrm = [nrm[0] - k * t2[0], nrm[1] - k * t2[1], nrm[2] - k * t2[2]]
    const l = Math.hypot(nrm[0], nrm[1], nrm[2]) || 1
    nrm = [nrm[0] / l, nrm[1] / l, nrm[2] / l]
    t = t2
    const bi = cross(t, nrm)
    for (let s = 0; s < sides; s++) {
      const a = (s / sides) * Math.PI * 2,
        c = Math.cos(a) * r,
        si = Math.sin(a) * r
      v.push([path[i][0] + nrm[0] * c + bi[0] * si, path[i][1] + nrm[1] * c + bi[1] * si, path[i][2] + nrm[2] * c + bi[2] * si])
    }
  }
  for (let i = 0; i < n - 1; i++)
    for (let s = 0; s < sides; s++) {
      const a = i * sides + s,
        b = i * sides + ((s + 1) % sides)
      f.push([a, b, b + sides, a + sides])
      soft.push(true)
    }
  f.push(Array.from({ length: sides }, (_, s) => sides - 1 - s))
  soft.push(false)
  f.push(Array.from({ length: sides }, (_, s) => (n - 1) * sides + s))
  soft.push(false)
  return { v, f, soft }
}

/**
 * A bladed wheel about the z axis: a turbine or compressor wheel. The hub is
 * a cone from `hub[0]` at z = 0 to `hub[1]` at `height`; each blade runs
 * from the hub to `tip` and leans by `twist` radians from root to nose.
 * Returns the hub and every blade separately, so each sorts as its own solid.
 */
export function wheel(o: {
  hub: [number, number]
  tip: number
  height: number
  blades: number
  thick?: number
  twist?: number
  turn?: number
  sides?: number
}): { hub: Mesh; blades: Mesh[] } {
  const {
    hub: [h0, h1],
    tip,
    height,
    blades,
  } = o
  const thick = o.thick ?? 0.6,
    twist = o.twist ?? 0.6,
    turn = o.turn ?? 0
  const hub = lathe(
    [
      [0, 0],
      [h0, 0],
      [h1, height],
      [0, height],
    ],
    o.sides ?? 16,
  )
  const list: Mesh[] = []
  for (let b = 0; b < blades; b++) {
    const a0 = turn + (b / blades) * Math.PI * 2
    // the blade's outline in its own plane: root along the hub, tip at the rim, nose cut back
    const outline: Vec2[] = [
      [h0 * 0.95, 0],
      [tip, 0],
      [tip * 0.92, height * 0.45],
      [Math.max(h1, tip * 0.55), height],
      [h1 * 0.95, height],
    ]
    const slab = extrude(outline, -thick / 2, thick / 2)
    list.push(
      mapMesh(
        slab,
        ([r, z, w]) => {
          const a = a0 + twist * (z / height)
          return [r * Math.cos(a) - w * Math.sin(a), r * Math.sin(a) + w * Math.cos(a), z]
        },
        true,
      ),
    )
  }
  return { hub, blades: list }
}

/** A toothed outline about (cx, cy): a sprocket, a ring gear. `depth` is how far the teeth stand out from `r`. */
export function teeth(cx: number, cy: number, r: number, count: number, depth: number, turn = 0): Vec2[] {
  const out: Vec2[] = []
  for (let i = 0; i < count; i++) {
    const a = turn + (i / count) * Math.PI * 2,
      step = (Math.PI * 2) / count
    for (const [t, rr] of [
      [0.0, r],
      [0.2, r + depth],
      [0.5, r + depth],
      [0.7, r],
    ] as const) {
      out.push([cx + rr * Math.cos(a + t * step), cy + rr * Math.sin(a + t * step)])
    }
  }
  return out
}

/**
 * A flat polygon of world points, turned to face `toward`: a window pane, a
 * doorway, a sign on a wall. One face, so the scene hides it from behind.
 */
export function pane(pts: readonly Vec3[], toward: Vec3): Mesh {
  const m: Mesh = { v: pts.slice(), f: [pts.map((_, i) => i)] }
  return dot(normal(m, m.f[0]), toward) < 0 ? { v: m.v, f: [m.f[0].slice().reverse()] } : m
}
