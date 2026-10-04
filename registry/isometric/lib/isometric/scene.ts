import { hull, round, type Camera, type Vec2, type Vec3 } from "./iso"
import { centroid, dot, normal, type Mesh } from "./mesh"

/**
 * Isometric — a scene: meshes in, svg paths out, and the part under a point.
 *
 * Each frame the caller lists drawables. The scene projects them, hides the
 * faces that turn away from the camera, paints each drawable's faces back to
 * front and the drawables themselves back to front, and writes the result
 * into a pool of `<path>` elements it reuses in order. Nothing is created or
 * removed on an ordinary frame, only `d` and `class` change.
 *
 * Sorting is per drawable, by the depth of its centre plus `bias`: the
 * classic painter's order, which is right for separate solids and can be
 * nudged with `bias` where two of them interlock.
 */

export type Drawable = {
  mesh: Mesh
  /** The part this solid belongs to, for hover, focus and picking. */
  part?: string
  /** Extra classes for every face: `hi`, `lo`, `accent`, `dash`, … */
  cls?: string
  /** Added to the depth: positive paints later (in front). */
  bias?: number
  /**
   * Curved solids: their side facets are filled without lines, and the
   * outline of the whole solid is drawn instead, like the prisms of 0.1.
   */
  smooth?: boolean
  /** Shade each face by the way it faces: lid, left and right get tone classes. */
  shade?: boolean
  /** A material colour, mixed into the plate colour by the tone classes. */
  tint?: string
  /** Not hit by `pick`: guides, glows, rope. */
  inert?: boolean
}

/** Lines that are not solids: rope, wires, sparks. Painted with a drawable's depth. */
export type Stroke = { pts: Vec3[]; cls?: string; part?: string; bias?: number; closed?: boolean }

type Out = { d: string; cls: string; tint?: string; poly?: Vec2[]; part?: string }

/** The world direction toward the camera, for culling and depth. */
export function toCamera(c: Camera): Vec3 {
  const lift = Math.sqrt(1 - c.k * c.k)
  return [Math.sin(c.az), Math.cos(c.az), c.k / lift]
}

const path = (pts: readonly Vec2[], close = true) =>
  pts.length ? `M${pts.map((p) => `${round(p[0])} ${round(p[1])}`).join("L")}${close ? "Z" : ""}` : ""

function inside(p: Vec2, poly: readonly Vec2[]) {
  let hit = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j]
    if (a[1] > p[1] !== b[1] > p[1] && p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]) hit = !hit
  }
  return hit
}

/** Projects, culls and orders drawables into flat path records. Pure: no DOM, so it is testable. */
export function compose(c: Camera, items: readonly (Drawable | Stroke)[]): Out[] {
  const cos = Math.cos(c.az), sin = Math.sin(c.az), lift = Math.sqrt(1 - c.k * c.k)
  const P = (p: Vec3): Vec2 => [c.ox + c.s * (p[0] * cos - p[1] * sin), c.oy + c.s * ((p[0] * sin + p[1] * cos) * c.k - p[2] * lift)]
  const eye = toCamera(c)
  const depthOf = (p: Vec3) => dot(p, eye)

  const ordered = items
    .map((it, i) => {
      if ("pts" in it) {
        const m: Vec3 = it.pts.reduce<Vec3>((s, p) => [s[0] + p[0], s[1] + p[1], s[2] + p[2]], [0, 0, 0]).map((x) => x / it.pts.length) as Vec3
        return { it, i, depth: depthOf(m) + (it.bias ?? 0) }
      }
      const v = it.mesh.v
      let lo: Vec3 = [Infinity, Infinity, Infinity], hi: Vec3 = [-Infinity, -Infinity, -Infinity]
      for (const p of v) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], p[k]); hi[k] = Math.max(hi[k], p[k]) }
      const mid: Vec3 = [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2]
      return { it, i, depth: depthOf(mid) + (it.bias ?? 0) }
    })
    .sort((a, b) => a.depth - b.depth || a.i - b.i)

  const out: Out[] = []
  for (const { it } of ordered) {
    if ("pts" in it) {
      out.push({ d: path(it.pts.map(P), !!it.closed), cls: `line ${it.cls ?? ""}`.trim(), part: it.part })
      continue
    }
    const m = it.mesh
    const pts = m.v.map(P)
    const base = it.cls ?? ""
    const faces = m.f
      .map((f) => ({ f, n: normal(m, f) }))
      .filter(({ n }) => dot(n, eye) > 1e-9)
      .map(({ f, n }) => ({ f, n, depth: depthOf(centroid(m, f)) }))
      .sort((a, b) => a.depth - b.depth)
    for (const { f, n } of faces) {
      const poly = f.map((i) => pts[i])
      const len = Math.hypot(n[0], n[1], n[2]) || 1
      const up = n[2] / len
      let cls = `face ${base}`
      if (it.smooth && Math.abs(up) < 0.2) cls += " facet"
      if (it.shade) cls += up > 0.5 ? " tone-top" : n[0] * cos - n[1] * sin < 0 ? " tone-left" : " tone-right"
      if (it.tint) cls += " tint"
      out.push({ d: path(poly), cls: cls.trim(), tint: it.tint, poly: it.inert ? undefined : poly, part: it.part })
    }
    if (it.smooth) out.push({ d: path(hull(pts)), cls: `line edge ${base}`.trim(), part: it.part })
  }
  return out
}

/** A scene bound to an svg group. */
export function scene(parent: SVGElement) {
  const NS = "http://www.w3.org/2000/svg"
  const pool: SVGPathElement[] = []
  let picks: { poly: Vec2[]; part: string }[] = []

  return {
    /** Renders this frame's drawables. */
    render(c: Camera, items: readonly (Drawable | Stroke)[]) {
      const out = compose(c, items)
      while (pool.length < out.length) pool.push(parent.appendChild(document.createElementNS(NS, "path")))
      out.forEach((o, i) => {
        const el = pool[i]
        if (el.getAttribute("d") !== o.d) el.setAttribute("d", o.d)
        if (el.getAttribute("class") !== o.cls) el.setAttribute("class", o.cls)
        if (o.tint) el.style.setProperty("--tint", o.tint)
        else el.style.removeProperty("--tint")
      })
      for (let i = out.length; i < pool.length; i++) if (pool[i].getAttribute("d")) pool[i].setAttribute("d", "")
      picks = out.filter((o) => o.poly && o.part).map((o) => ({ poly: o.poly!, part: o.part! }))
    },
    /** The part under a point in viewBox units, front-most first; null for none. */
    pick(p: Vec2): string | null {
      for (let i = picks.length - 1; i >= 0; i--) if (inside(p, picks[i].poly)) return picks[i].part
      return null
    },
  }
}
