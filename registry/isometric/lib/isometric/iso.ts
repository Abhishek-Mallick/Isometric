/**
 * Isometric — projection and solids, with no DOM.
 *
 * Every figure draws in a 400 × 320 viewBox and the svg scales it to its box,
 * so nothing here depends on the viewport. World space has x/y on the ground
 * and z pointing up. The camera turns the ground by an azimuth, squashes the
 * ground's depth by `k` (sin of the elevation; 0.5 is the classic 2:1 view)
 * and lifts z by cos of the elevation. There is no perspective and no
 * hidden-line removal: every face is filled with the plate colour and solids
 * are painted back to front, so a nearer one simply covers a farther one.
 */

export type Vec2 = [number, number]
export type Vec3 = [number, number, number]

/** A point on a ground outline, with its outward normal. */
export type Sample = { u: number; v: number; nu: number; nv: number }
export type Ring = Sample[]

/** Orthographic camera: azimuth (radians), depth squash k, scale s, and the screen offset `fit` sets. */
export type Camera = { az: number; k: number; s: number; ox: number; oy: number }
export type Projector = (x: number, y: number, z: number) => Vec2

/** A solid as two paths: its outline and its inner construction lines. */
export type Shape = { outline: string; inner: string }

export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
export const deg = (d: number) => (d * Math.PI) / 180
/** Two decimals keep a thin stroke exact at any zoom and keep path strings short. */
export const round = (n: number) => Math.round(n * 100) / 100

const pt = (p: Vec2) => `${round(p[0])} ${round(p[1])}`

/** A closed polygon. */
export const closed = (pts: readonly Vec2[]) => (pts.length ? `M${pts.map(pt).join("L")}Z` : "")
/** An open polyline; empty when there is nothing to draw. */
export const polyline = (pts: readonly Vec2[]) => (pts.length < 2 ? "" : `M${pts.map(pt).join("L")}`)
/** One segment as its own subpath, so several can share a `d`. */
export const line = (a: Vec2, b: Vec2) => `M${pt(a)}L${pt(b)}`

/* ---------- camera ---------- */

export const camera = (azDeg: number, k: number, s: number): Camera => ({ az: deg(azDeg), k, s, ox: 0, oy: 0 })

/** The projector for the camera as it is now. Call again if the camera moves. */
export function project(c: Camera): Projector {
  const cos = Math.cos(c.az), sin = Math.sin(c.az), lift = Math.sqrt(1 - c.k * c.k)
  return (x, y, z) => {
    const X = x * cos - y * sin
    const Y = x * sin + y * cos
    return [c.ox + c.s * X, c.oy + c.s * (Y * c.k - z * lift)]
  }
}

/** The ground point under a screen point, on the plane at height z. Pointer hits are tested in world units. */
export function unproject(c: Camera, sx: number, sy: number, z = 0): [number, number] {
  const cos = Math.cos(c.az), sin = Math.sin(c.az), lift = Math.sqrt(1 - c.k * c.k)
  const X = (sx - c.ox) / c.s
  const Y = ((sy - c.oy) / c.s + z * lift) / c.k
  return [X * cos + Y * sin, -X * sin + Y * cos]
}

/** Moves the camera so the screen bounds of `pts` are centred on (cx, cy). */
export function fit(c: Camera, pts: readonly Vec3[], cx = 200, cy = 160) {
  c.ox = 0
  c.oy = 0
  const P = project(c)
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity
  for (const p of pts) {
    const [x, y] = P(p[0], p[1], p[2])
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y)
  }
  c.ox = cx - (x0 + x1) / 2
  c.oy = cy - (y0 + y1) / 2
}

/** The corners of a box, for `fit`. */
export const corners = (x0: number, y0: number, x1: number, y1: number, z0: number, z1: number): Vec3[] => [
  [x0, y0, z0], [x1, y0, z0], [x0, y1, z0], [x1, y1, z0],
  [x0, y0, z1], [x1, y0, z1], [x0, y1, z1], [x1, y1, z1],
]

/* ---------- outlines on the ground ---------- */

/** A rounded rectangle, sampled with outward normals; `n` samples per corner. */
export function roundRect(u0: number, v0: number, u1: number, v1: number, r: number, n = 4): Ring {
  r = Math.max(0, Math.min(r, (u1 - u0) / 2, (v1 - v0) / 2))
  const out: Ring = []
  const arcs: [number, number, number][] = [[u1 - r, v1 - r, 0], [u0 + r, v1 - r, 90], [u0 + r, v0 + r, 180], [u1 - r, v0 + r, 270]]
  for (const [cu, cv, a0] of arcs) {
    for (let i = 0; i <= n; i++) {
      const a = deg(a0 + (90 * i) / n), ca = Math.cos(a), sa = Math.sin(a)
      out.push({ u: cu + r * ca, v: cv + r * sa, nu: ca, nv: sa })
    }
  }
  return out
}

/** A circle of radius r about (cu, cv). */
export function circle(r: number, cu = 0, cv = 0, n = 64): Ring {
  const out: Ring = []
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a)
    out.push({ u: cu + r * ca, v: cv + r * sa, nu: ca, nv: sa })
  }
  return out
}

/** A rounded footprint and the same footprint inset by `b`, for its bevel line. */
export const footprint = (x0: number, y0: number, x1: number, y1: number, r: number, b: number): [Ring, Ring] => [
  roundRect(x0, y0, x1, y1, r),
  roundRect(x0 + b, y0 + b, x1 - b, y1 - b, Math.max(0.3, r - b)),
]

/** Projects a ground ring at height z. */
export const lift = (P: Projector, ring: readonly Sample[], z: number): Vec2[] => ring.map((q) => P(q.u, q.v, z))

/** Convex hull (monotone chain). */
export function hull(input: readonly Vec2[]): Vec2[] {
  const pts = input.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1])
  if (pts.length < 3) return pts
  const cross = (o: Vec2, a: Vec2, b: Vec2) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
  const lower: Vec2[] = [], upper: Vec2[] = []
  for (const p of pts) {
    while (lower.length > 1 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop()
    lower.push(p)
  }
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i]
    while (upper.length > 1 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop()
    upper.push(p)
  }
  lower.pop()
  upper.pop()
  return lower.concat(upper)
}

/** Whether a sample's normal faces the camera: screen-down on the ground is (sin az, cos az). */
export const facing = (c: Camera) => {
  const s = Math.sin(c.az), co = Math.cos(c.az)
  return (q: Sample) => q.nu * s + q.nv * co >= -1e-6
}

/** The single cyclic run of samples that pass `keep`, in ring order. */
export function run(ring: readonly Sample[], keep: (q: Sample) => boolean): Ring {
  const n = ring.length
  let start = -1
  for (let i = 0; i < n; i++) if (keep(ring[i]) && !keep(ring[(i + n - 1) % n])) { start = i; break }
  if (start < 0) return keep(ring[0]) ? ring.slice() : []
  const out: Ring = []
  for (let i = 0; i < n && keep(ring[(start + i) % n]); i++) out.push(ring[(start + i) % n])
  return out
}

/* ---------- solids ---------- */

/**
 * A rounded prism standing from z0 to z1. The outline is the hull of its top
 * and bottom rings, so vertical edges are never drawn; the one inner line is
 * the front run of an inset ring on the lid, which reads as a bevel. Works
 * for circles too, which makes it a cylinder.
 */
export function prism(
  P: Projector,
  front: (q: Sample) => boolean,
  ring: readonly Sample[],
  bevel: readonly Sample[] | null,
  z0: number,
  z1: number,
): Shape {
  return {
    outline: closed(hull(lift(P, ring, z1).concat(lift(P, ring, z0)))),
    inner: bevel ? polyline(lift(P, run(bevel, front), z1)) : "",
  }
}

/**
 * A sharp box from (x0, y0, z0) to (x1, y1, z1): the classic three-face cube.
 * The outline is its hull; the inner lines are the two lid edges and the one
 * vertical edge that meet at the corner nearest the camera.
 */
export function block(P: Projector, x0: number, y0: number, x1: number, y1: number, z0: number, z1: number): Shape {
  const foot: [number, number][] = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]
  const bottom = foot.map(([x, y]) => P(x, y, z0))
  const top = foot.map(([x, y]) => P(x, y, z1))
  let near = 0
  for (let i = 1; i < 4; i++) if (bottom[i][1] > bottom[near][1]) near = i
  const prev = (near + 3) % 4, next = (near + 1) % 4
  return {
    outline: closed(hull(top.concat(bottom))),
    inner: line(top[prev], top[near]) + line(top[near], top[next]) + (z1 - z0 > 0.01 ? line(top[near], bottom[near]) : ""),
  }
}

/** Any planar polygon given by world points: a wall, a lid, a sheet of paper. */
export const face = (P: Projector, pts: readonly Vec3[]) => closed(pts.map((p) => P(p[0], p[1], p[2])))

/** World segments as one path. */
export const segments = (P: Projector, pairs: readonly [Vec3, Vec3][]) =>
  pairs.map(([a, b]) => line(P(a[0], a[1], a[2]), P(b[0], b[1], b[2]))).join("")

/** A ring turned by `a` radians about (cu, cv); normals turn with it. */
export function turn(ring: readonly Sample[], a: number, cu: number, cv: number): Ring {
  const c = Math.cos(a), s = Math.sin(a)
  return ring.map((q) => {
    const du = q.u - cu, dv = q.v - cv
    return { u: cu + du * c - dv * s, v: cv + du * s + dv * c, nu: q.nu * c - q.nv * s, nv: q.nu * s + q.nv * c }
  })
}

/** A flat quad lying on the plane z: a tile, a screen, a label. */
export const tile = (P: Projector, x0: number, y0: number, x1: number, y1: number, z: number) =>
  closed([P(x0, y0, z), P(x1, y0, z), P(x1, y1, z), P(x0, y1, z)])

/** A rounded flat panel standing on a plane; `pts` are its world corners, each rounded by r. */
export function smooth(pts: readonly Vec2[], r: number, n = 4): Vec2[] {
  const m = pts.length, out: Vec2[] = []
  for (let i = 0; i < m; i++) {
    const a = pts[(i + m - 1) % m], p = pts[i], b = pts[(i + 1) % m]
    const la = Math.hypot(a[0] - p[0], a[1] - p[1]), lb = Math.hypot(b[0] - p[0], b[1] - p[1])
    const t = Math.min(r, la / 2, lb / 2)
    const p1: Vec2 = [p[0] + ((a[0] - p[0]) / la) * t, p[1] + ((a[1] - p[1]) / la) * t]
    const p2: Vec2 = [p[0] + ((b[0] - p[0]) / lb) * t, p[1] + ((b[1] - p[1]) / lb) * t]
    for (let k = 0; k <= n; k++) {
      const s = k / n, w = 1 - s
      out.push([w * w * p1[0] + 2 * w * s * p[0] + s * s * p2[0], w * w * p1[1] + 2 * w * s * p[1] + s * s * p2[1]])
    }
  }
  return out
}

/** Maps intensity 0…1 through [at 0, at 0.5, at 1], two straight lines meeting at the middle. */
export function scale(intensity: unknown, [lo, mid, hi]: readonly [number, number, number]): number {
  const n = typeof intensity === "string" && intensity.trim() !== "" ? Number(intensity) : intensity
  const i = typeof n === "number" && Number.isFinite(n) ? clamp(n, 0, 1) : 0.5
  const v = i <= 0.5 ? lo + (i / 0.5) * (mid - lo) : mid + ((i - 0.5) / 0.5) * (hi - mid)
  return Math.round(v * 1000) / 1000
}
