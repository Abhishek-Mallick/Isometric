import type { Vec2, Vec3 } from "@/registry/isometric/lib/isometric/iso"
import { hull } from "@/registry/isometric/lib/isometric/iso"
import { lathe, mapMesh, merge, prismX, rotateX, rotateY, teeth, translate, tube, wheel, zToX, type Mesh } from "@/registry/isometric/lib/isometric/mesh"
import { label, type Drawable, type Item, type Label, type Stroke } from "@/registry/isometric/lib/isometric/scene"

import { PART, type PartId } from "./assembly"
import { lift, lobe, phase, strokeOf } from "./cycle"
import { pose, type Cylinder } from "./kinematics"
import type { EngineSpec } from "./spec"
import { derive } from "./spec"

/**
 * Anatomy — the V12's parts as meshes, posed for one frame.
 *
 * Everything is in millimetres. The crank turns about x (the front, with the
 * timing chains and the damper, is at x < 0); y runs across the engine and z
 * up. Parts that sit on a bank are built in that bank's frame: `u` across
 * the bank (positive toward the vee), `w` up the bores from the crank axis.
 */

export type Mode = "assembled" | "xray" | "exploded" | "cylinder"

export type Frame = {
  /** Display crank angle, degrees. */
  theta: number
  /** Throttle blade, 0…1. */
  throttle: number
  /** Fuel on (running and not cut), and spark advance in degrees. */
  fuel: boolean
  advance: number
  /** Per bank: the turbo shaft's display angle (radians), wastegate 0…1, seconds of blow-off left. */
  turbos: { spin: number; gate: number; vent: number }[]
  /** Exhaust heat, 0…1. */
  heat: number
  /** How far each part has left home, 0…1. */
  away: (id: PartId) => number
  mode: Mode
  /** The isolated part, drawn solid with the rest as outlines. */
  focus: PartId | null
  hover: PartId | null
  /** World direction toward the camera, and the camera's azimuth (radians), for lines and lettering that face it. */
  eye: Vec3
  az: number
  /** In one-cylinder mode, the cylinder shown. */
  only: number
}

/** Where a part sits at home and where it is now, once per bank: for construction lines and callouts. */
export type Anchor = { id: PartId; b: number; home: Vec3; at: Vec3 }
export type Built = { items: Item[]; anchors: Anchor[] }

const MAT = {
  alloy: "#94a3b8",
  head: "#a1a1aa",
  magnesium: "#52525b",
  steel: "#71717a",
  forged: "#64748b",
  piston: "#a8a29e",
  intake: "#3b82f6",
  exhaust: "#ef4444",
  cam: "#78716c",
  iron: "#57534e",
  turbine: "#9a3412",
  compressor: "#cbd5e1",
  pipe: "#0ea5e9",
  rubber: "#3f3f46",
  coil: "#27272a",
  brass: "#ca8a04",
} as const

const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
const mul = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k]
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]

/** A circle in the y–z plane about (cy, cz), as [y, z] points. */
const ring = (cy: number, cz: number, r: number, n: number, a0 = 0): Vec2[] =>
  Array.from({ length: n }, (_, i) => {
    const a = a0 + (i / n) * Math.PI * 2
    return [cy + r * Math.sin(a), cz + r * Math.cos(a)] as Vec2
  })

/** A rounded rectangle in the y–z plane. */
function rounded(y0: number, z0: number, y1: number, z1: number, r: number, n = 4): Vec2[] {
  const out: Vec2[] = []
  const corners: [number, number, number][] = [
    [y1 - r, z1 - r, 0],
    [y0 + r, z1 - r, 90],
    [y0 + r, z0 + r, 180],
    [y1 - r, z0 + r, 270],
  ]
  for (const [cy, cz, a0] of corners)
    for (let i = 0; i <= n; i++) {
      const a = ((a0 + (90 * i) / n) * Math.PI) / 180
      out.push([cy + r * Math.cos(a), cz + r * Math.sin(a)])
    }
  return out
}

/** Everything about the engine that does not move: dimensions and frames, worked out once per spec. */
export function geometry(s: EngineSpec, cylinders: Cylinder[]) {
  const { r } = derive(s)
  const CH = 32,
    SK = 36,
    PR = s.bore / 2 - 0.6
  const D = r + s.rod + CH + 1
  const HEAD = 122,
    CAM = D + 126,
    COVER = 40
  const L = (s.perBank - 1) * s.pitch + s.stagger
  const X0 = -40,
    X1 = L + 40
  const banks = Array.from({ length: s.banks }, (_, b) => {
    const lean = cylinders.find((c) => c.bank === b)!.lean
    const axis: Vec3 = [0, Math.sin(lean), Math.cos(lean)]
    const sgn = b === 0 ? 1 : -1
    const inward: Vec3 = [0, sgn * Math.cos(lean), -sgn * Math.sin(lean)]
    /** A point in this bank's frame. */
    const at = (x: number, u: number, w: number): Vec3 => [x, u * inward[1] + w * axis[1], u * inward[2] + w * axis[2]]
    /** The same point's [y, z]. */
    const yz = (u: number, w: number): Vec2 => {
      const p = at(0, u, w)
      return [p[1], p[2]]
    }
    /** A mesh built along z (x along x, y toward the vee) placed in the bank at (x, u, w). */
    const place = (m: Mesh, x: number, u: number, w: number) => mapMesh(m, ([lx, ly, lz]) => at(x + lx, u + ly, w + lz), b === 1)
    return { b, lean, axis, inward, sgn, at, yz, place }
  })
  // meshes whose shape never changes are built once and only moved after: less garbage, and the
  // scene's per-mesh caches (edges, normals) keep working because the face lists are shared
  const cache = new Map<string, unknown>()
  const memo = <T>(key: string, make: () => T): T => {
    if (!cache.has(key)) cache.set(key, make())
    return cache.get(key) as T
  }
  return { r, CH, SK, PR, D, HEAD, CAM, COVER, L, X0, X1, banks, memo }
}

export type Geometry = ReturnType<typeof geometry>

/** Where the turbo for a bank sits: its axis runs along x. */
const turboAt = (b: number) => ({ y: (b === 0 ? -1 : 1) * 262, z: 70, comp: 262, turb: 336 })

/** The engine posed for one frame. */
export function build(s: EngineSpec, cylinders: Cylinder[], g: Geometry, f: Frame): Built {
  const items: Item[] = []
  const anchors: Anchor[] = []
  const { r, CH, SK, PR, D, HEAD, CAM, COVER, L, X0, X1, banks, memo } = g
  const xray = f.mode === "xray",
    exploded = f.mode === "exploded",
    single = f.mode === "cylinder"
  const shown = (c: Cylinder) => !single || c.n === f.only

  /** How far a part has moved from home, in world space (per bank for bank parts). */
  const shift = (id: PartId, b = 0): Vec3 => {
    const def = PART[id],
      k = f.away(id)
    if (!k) return [0, 0, 0]
    const side = def.away[1] && b === 0 ? -1 : 1
    const base: Vec3 = [def.away[0], def.away[1] * side, def.away[2]]
    const along = def.bank ? mul(banks[b].axis, def.bank) : ([0, 0, 0] as Vec3)
    return mul(add(base, along), k)
  }

  const anchor = (id: PartId, home: Vec3, b = 0) => {
    anchors.push({ id, b, home, at: add(home, shift(id, b)) })
  }

  /** Styles a part by mode: housings turn to wire in X-ray, everything but the isolated part does when isolating. */
  /** `shell`: a casing on a moving part (a turbo's housings), drawn as outlines in X-ray so what turns inside shows. */
  function put(id: PartId, it: Drawable, b = 0, shell = false) {
    const def = PART[id]
    const d = shift(id, b)
    const moved: Drawable = d[0] || d[1] || d[2] ? { ...it, mesh: translate(it.mesh, d) } : it
    const accent = f.hover === id || f.focus === id ? " accent" : ""
    if (f.focus && f.focus !== id) {
      items.push({ ...moved, wire: true, smooth: true, cls: "faded", layer: 0, part: id, inert: true })
      return
    }
    const housing = def.kind !== "moving" || shell
    if ((xray || single) && housing && !f.focus) {
      items.push({ ...moved, wire: true, smooth: true, cls: `ghost${accent}`, layer: 2, part: id })
      return
    }
    items.push({ ...moved, cls: `${it.cls ?? ""}${accent}`.trim(), part: id, layer: f.focus === id ? 3 : 0 })
  }

  function line(id: PartId, pts: Vec3[], cls: string, b = 0, closed = false) {
    const d = shift(id, b)
    if (f.focus && f.focus !== id) return
    const housing = PART[id].kind !== "moving"
    if ((xray || single) && housing) return
    const s: Stroke = { pts: d[0] || d[1] || d[2] ? pts.map((p) => add(p, d)) : pts, cls, part: id, closed, layer: f.focus === id ? 3 : 0 }
    items.push(s)
  }

  function text(id: PartId, l: Label, b = 0) {
    if (f.focus && f.focus !== id) return
    if ((xray || single) && PART[id].kind !== "moving") return
    items.push({ ...l, at: add(l.at, shift(id, b)), part: id })
  }

  /** Points on a circle round an axis, only the half facing the camera: a ring line on a round part. */
  function arc(c: Vec3, e1: Vec3, e2: Vec3, radius: number, n = 12): Vec3[] {
    // the normal of the surface at angle t is cos t·e1 + sin t·e2; keep the half that faces the eye
    const t0 = Math.atan2(dot(e2, f.eye), dot(e1, f.eye))
    const out: Vec3[] = []
    for (let i = 0; i <= n; i++) {
      const t = t0 - Math.PI / 2 + 0.12 + ((Math.PI - 0.24) * i) / n
      out.push(add(c, add(mul(e1, radius * Math.cos(t)), mul(e2, radius * Math.sin(t)))))
    }
    return out
  }

  /** The direction along x that reads left to right from this camera. */
  const readX: Vec3 = [Math.cos(f.az) >= 0 ? 1 : -1, 0, 0]

  /* ---------- the housing ---------- */

  const assembledLike = f.mode === "assembled" || exploded || f.focus
  if (!single) {
    // the block: a vee of two decks over the crankcase, with ribs down its flanks
    const [A, B] = banks
    const poly: Vec2[] = [[-135, -70], [135, -70], [135, 40], B.yz(-60, D), B.yz(60, D), [0, 120], A.yz(60, D), A.yz(-60, D), [-135, 40]]
    put("block", { mesh: memo("block", () => prismX(poly, X0, X1)), shade: true, tint: MAT.alloy })
    anchor("block", [L / 2, 0, 60])
    if (assembledLike)
      for (let k = 0; k < s.perBank; k++)
        for (const y of [-135.4, 135.4]) {
          const x = k * s.pitch + s.stagger / 2 + s.pitch / 2
          if (x < X1 - 10)
            line(
              "block",
              [
                [x, y, -62],
                [x, y, 34],
              ],
              "lo",
            )
        }

    for (const bk of banks) {
      const { b, yz, at } = bk
      const head: Vec2[] = [yz(-64, D), yz(64, D), yz(64, D + HEAD), yz(-64, D + HEAD)]
      put("heads", { mesh: memo(`head${b}`, () => prismX(head, X0, X1)), shade: true, tint: MAT.head }, b)
      anchor("heads", at(L / 2, 0, D + HEAD / 2), b)
      // the cam cover, chamfered along its top, with a plug coil over every cylinder
      const top = D + HEAD + COVER
      const cover: Vec2[] = [yz(-60, D + HEAD), yz(60, D + HEAD), yz(60, top - 14), yz(46, top), yz(-46, top), yz(-60, top - 14)]
      put("covers", { mesh: memo(`cover${b}`, () => prismX(cover, X0 + 6, X1 - 6)), shade: true, tint: MAT.magnesium }, b)
      anchor("covers", at(L / 2, 0, top), b)
      const word = b === 0 ? "V12" : "TWIN TURBO"
      // lettering runs along x the way that reads from here, and up = normal × along, so it faces out of the cover
      const u = readX,
        n = bk.axis
      const v: Vec3 = [n[1] * u[2] - n[2] * u[1], n[2] * u[0] - n[0] * u[2], n[0] * u[1] - n[1] * u[0]]
      text("covers", label(word, at(L / 2 - 30, 0, top + 0.4), u, v, 15, { anchor: "middle", cls: "mid" }), b)
      for (const c of cylinders)
        if (c.bank === b) {
          put(
            "coils",
            {
              mesh: memo(`coil${c.n}`, () =>
                bk.place(
                  lathe(
                    [
                      [12, 0],
                      [12, 16],
                      [8, 22],
                    ],
                    10,
                  ),
                  c.x,
                  0,
                  top,
                ),
              ),
              smooth: true,
              tint: MAT.coil,
              shade: true,
            },
            b,
            true,
          )
        }
      anchor("coils", at(L / 2, 0, top + 20), b)
    }

    // the sump, under the crankcase
    put("sump", {
      mesh: memo("sump", () =>
        prismX(
          [
            [-128, -70],
            [128, -70],
            [116, -150],
            [-116, -150],
          ],
          X0 + 12,
          X1 - 12,
        ),
      ),
      shade: true,
      tint: MAT.alloy,
    })
    anchor("sump", [L / 2, 0, -110])

    // the timing cover over the chains: the outline of the block and both heads, seen from the front
    const front: Vec2[] = [
      [-135, -70],
      [135, -70],
      [135, 40],
      B.yz(-64, D),
      B.yz(-64, D + HEAD),
      B.yz(64, D + HEAD),
      [0, 250],
      A.yz(64, D + HEAD),
      A.yz(-64, D + HEAD),
      A.yz(-64, D),
      [-135, 40],
    ]
    put("front", { mesh: memo("front", () => prismX(front, X0 - 36, X0)), shade: true, tint: MAT.alloy })
    anchor("front", [X0 - 18, 0, 120])
  }

  /* ---------- the crank, rods and pistons ---------- */

  const theta = (f.theta * Math.PI) / 180
  // assembled, the housing hides the internals, so they are not drawn unless one of them is isolated
  const internals = f.mode !== "assembled" || !!f.focus
  const rodsAway = f.away("rods") > 0.02 || exploded
  // the crank pins hide where solid rods are round them: not when the rods are away or faded
  const pinsBare = rodsAway || (!!f.focus && f.focus !== "rods")
  const pinsCovered = new Map<number, [number, number][]>()
  for (const c of cylinders) {
    if (!shown(c) || !internals) continue
    const p = pose(s, c, theta)
    const bk = banks[c.bank]
    // the rod, clipped where it disappears into the piston skirt, unless it has been taken out
    const big = ring(p.pin[0], p.pin[1], 29, 14),
      small = ring(p.wrist[0], p.wrist[1], 15, 10)
    let outline = hull([...big, ...small])
    if (!rodsAway && f.focus !== "rods") {
      const lim = p.dist - SK - 0.6
      outline = clip(outline, [bk.axis[1], bk.axis[2]], lim)
    }
    put("rods", { mesh: prismX(outline, c.x - 11, c.x + 11, true), smooth: true, shade: true, tint: MAT.forged }, c.bank)
    const covered = pinsCovered.get(c.slot) ?? []
    covered.push([c.x - 11, c.x + 11])
    pinsCovered.set(c.slot, covered)

    // the piston, with its ring grooves on the side facing us
    const piston = translate(
      memo(`piston${c.bank}`, () =>
        bk.place(
          lathe(
            [
              [PR, -SK],
              [PR, CH],
            ],
            20,
          ),
          0,
          0,
          0,
        ),
      ),
      bk.at(c.x, 0, p.dist),
    )
    put("pistons", { mesh: piston, smooth: true, tint: MAT.piston, shade: true }, c.bank)
    const e1: Vec3 = [1, 0, 0],
      e2 = bk.inward
    for (const dw of [CH - 6, CH - 10, CH - 14]) line("pistons", arc(bk.at(c.x, 0, p.dist + dw), e1, e2, PR + 0.3), "lo", c.bank)

    // the charge in the chamber: its colour says which stroke the cylinder is on
    if ((xray || single) && !f.focus) {
      const ph = phase(c, f.theta)
      const crown = p.dist + CH
      const h = D + 6 - crown
      const st = strokeOf(ph)
      const burning = f.fuel && st === "power" && ph < 70
      const cls = `gas ${st}${burning ? " burn" : ""}`
      items.push({
        mesh: bk.place(
          lathe(
            [
              [PR - 0.5, 0],
              [PR - 0.5, h],
            ],
            20,
          ),
          c.x,
          0,
          crown,
        ),
        smooth: true,
        cls,
        inert: true,
      })
      // the spark, a moment before the top on compression
      const spark = (((ph - (720 - f.advance)) % 720) + 720) % 720
      if (f.fuel && spark < 26) {
        const tip = bk.at(c.x, 0, D + 4)
        for (let k = 0; k < 6; k++) {
          const a = (k / 6) * Math.PI * 2 + spark * 0.2
          const dir = add(mul([1, 0, 0], Math.cos(a)), mul(bk.inward, Math.sin(a)))
          items.push({ pts: [add(tip, mul(dir, 3)), add(add(tip, mul(dir, 11)), mul(bk.axis, -3))], cls: "spark" })
        }
      }
    }
  }

  if (internals)
    for (const bk of banks) {
      // halfway up the stroke along each bank: where the pistons and the rods are, on average
      const c = cylinders.find((x) => x.bank === bk.b && shown(x))
      if (!c) continue
      const x = single ? c.x : L / 2
      anchor("pistons", bk.at(x, 0, s.rod + CH), bk.b)
      anchor("rods", bk.at(x, 0, s.rod / 2), bk.b)
    }

  // the crankshaft: seven main journals, six shared pins, twelve webs with their counterweights, the snout and the flange.
  // Its shape depends only on which rods hide its pins, so it is built once at θ = 0 and turned as a rigid body.
  if (internals) {
    const pieces = memo(`crank|${single ? f.only : 0}|${pinsBare ? 1 : 0}`, crankAt0)
    for (const m of pieces) put("crank", { mesh: rotateX(m, -theta), smooth: true, shade: true, tint: MAT.steel })
    anchor("crank", [L / 2, 0, 0])
  }

  function crankAt0(): Mesh[] {
    const parts: Mesh[] = []
    const journal = (x0: number, x1: number, rad = 32) => parts.push(prismX(ring(0, 0, rad, 18), x0, x1, true))
    const p = s.pitch
    if (single) {
      // short stubs of the main journals either side of the throw, to show the axis it turns about
      const k = cylinders[f.only - 1].slot
      journal(k * p - 44, -26 + k * p)
      journal(k * p + 50, k * p + 68)
    } else {
      journal(-62, -26)
      for (let k = 0; k < s.perBank - 1; k++) journal(k * p + 50, (k + 1) * p - 26)
      journal((s.perBank - 1) * p + 50, (s.perBank - 1) * p + 84)
      journal(-130, -62, 22)
      journal((s.perBank - 1) * p + 84, L + 84, 46)
    }
    for (let k = 0; k < s.perBank; k++) {
      const c = cylinders[k]
      if (single && c.n !== f.only && cylinders[k + s.perBank]?.n !== f.only) continue
      const a = c.throw
      const pc: Vec2 = [r * Math.sin(a), r * Math.cos(a)]
      const web = hull([
        ...ring(pc[0], pc[1], 30, 12),
        ...ring(0, 0, 36, 12),
        ...Array.from({ length: 9 }, (_, i): Vec2 => {
          const t = a + Math.PI - 1 + (2 * i) / 8
          return [74 * Math.sin(t), 74 * Math.cos(t)]
        }),
      ])
      parts.push(prismX(web, k * p - 26, k * p - 12, true), prismX(web, k * p + 36, k * p + 50, true))
      // the pin shows only where no rod is round it
      let spans: [number, number][] = [[k * p - 12, k * p + 36]]
      for (const [c0, c1] of pinsBare ? [] : (pinsCovered.get(k) ?? []))
        spans = spans.flatMap(
          ([a0, a1]) =>
            (c1 <= a0 || c0 >= a1
              ? [[a0, a1]]
              : [
                  [a0, c0],
                  [c1, a1],
                ].filter(([u0, u1]) => u1 - u0 > 0.5)) as [number, number][],
        )
      for (const [a0, a1] of spans) parts.push(prismX(ring(pc[0], pc[1], 25, 14), a0, a1, true))
    }
    // each piece sorts on its own: journals, webs and pins interleave along the crank
    return parts
  }

  if (!single) {
    // the flywheel and its ring gear at the back
    put("flywheel", {
      mesh: rotateX(
        memo("flywheel", () => prismX(teethYZ(0, 0, 146, 48, 5, 0), L + 84, L + 104, true)),
        -theta,
      ),
      smooth: true,
      shade: true,
      tint: MAT.steel,
    })
    anchor("flywheel", [L + 94, 0, 0])
    // the damper on the nose, its spokes turning with the crank
    put("damper", { mesh: memo("damper", () => prismX(ring(0, 0, 85, 30), -156, -132, true)), smooth: true, shade: true, tint: MAT.rubber })
    put("damper", { mesh: memo("hub", () => prismX(ring(0, 0, 30, 14), -162, -156, true)), smooth: true, shade: true, tint: MAT.steel })
    for (let k = 0; k < 5; k++) {
      const a = theta + (k / 5) * Math.PI * 2
      line(
        "damper",
        [
          [-156.4, 32 * Math.sin(a), 32 * Math.cos(a)],
          [-156.4, 78 * Math.sin(a), 78 * Math.cos(a)],
        ],
        "mid",
      )
    }
    line(
      "damper",
      [
        [-156.6, 80 * Math.sin(theta), 80 * Math.cos(theta)],
        [-156.6, 86 * Math.sin(theta), 86 * Math.cos(theta)],
      ],
      "mark",
    )
    for (const dx of [-138, -144, -150]) line("damper", arc([dx, 0, 0], [0, 1, 0], [0, 0, 1], 85.4), "lo")
    anchor("damper", [-144, 0, 0])
  }

  /* ---------- the valvetrain ---------- */

  for (const bk of internals ? banks : []) {
    const { b, at } = bk
    const camTurn = theta / 2
    for (const kind of ["intake", "exhaust"] as const) {
      const v = s[kind],
        u = kind === "intake" ? 17 : -17
      const valveId: PartId = kind === "intake" ? "intake-valves" : "exhaust-valves"
      const camId: PartId = kind === "intake" ? "intake-cams" : "exhaust-cams"
      const hr = v.head / 2 - (kind === "intake" ? 1.5 : 1)
      const valve = memo(`valve${b}${kind}`, () =>
        bk.place(
          merge(
            lathe(
              [
                [hr, 0],
                [hr, 2.4],
                [3.6, 9],
                [3.6, 90],
              ],
              8,
            ),
            lathe(
              [
                [13, 90],
                [13, 100],
              ],
              10,
            ),
          ),
          0,
          0,
          0,
        ),
      )
      const center = at(0, u, CAM),
        pivot: Vec3 = [0, center[1], center[2]]
      for (const c of cylinders) {
        if (c.bank !== b || !shown(c)) continue
        const ph = phase(c, f.theta),
          lv = lift(v, ph)
        for (const dx of [-17, 17]) {
          const x = c.x + dx
          put(valveId, { mesh: translate(valve, at(x, u, D + 10 - lv)), smooth: true, shade: true, tint: kind === "intake" ? MAT.intake : MAT.exhaust }, b)
          // the spring between its seat and the retainer, squeezed as the valve opens
          if (xray || exploded || single || f.focus === valveId) {
            const lo = D + 52,
              hi = D + 98 - lv,
              turns = 5.5,
              n = 44
            const coil: Vec3[] = []
            for (let i = 0; i <= n; i++) {
              const t = i / n,
                a = t * turns * Math.PI * 2
              coil.push(at(x + 10.5 * Math.cos(a), u + 10.5 * Math.sin(a), lo + (hi - lo) * t))
            }
            line(valveId, coil, "spring", b)
          }
          // the lobe over it, built where it points at θ = 0 and turned with the camshaft at half crank speed
          const at0 = memo(`lobe${c.n}${kind}${dx}`, () => {
            const nose = lobe(c, v, 0)
            const prof: Vec2[] = LOBE.map((psi) => {
              const rr = 16 + (Math.abs(psi) < Math.PI / 3 ? v.lift * Math.cos(1.5 * psi) ** 2 : 0)
              return [center[1] + rr * Math.sin(nose + psi), center[2] + rr * Math.cos(nose + psi)]
            })
            return prismX(prof, x - 7, x + 7, true)
          })
          put(camId, { mesh: rotateX(at0, -camTurn, pivot), smooth: true, shade: true, tint: MAT.cam }, b)
        }
      }
      // the shaft, and its sprocket at the front
      if (!single) {
        put(
          camId,
          { mesh: memo(`shaft${b}${kind}`, () => prismX(ring(center[1], center[2], 11, 12), X0 + 4, X1 - 8, true)), smooth: true, shade: true, tint: MAT.cam },
          b,
        )
        const sx = b === 0 ? -52 : -64
        const sprocket = memo(`sprocket${b}${kind}`, () => prismX(teethYZ(center[1], center[2], 48, 20, 4, 0), sx, sx + 8, true))
        put("chain", { mesh: rotateX(sprocket, -camTurn, pivot), smooth: true, shade: true, tint: MAT.steel })
      } else {
        const c = cylinders[f.only - 1]
        put(
          camId,
          {
            mesh: memo(`stub${c.n}${kind}`, () => prismX(ring(center[1], center[2], 11, 12), c.x - 30, c.x + 30, true)),
            smooth: true,
            shade: true,
            tint: MAT.cam,
          },
          b,
        )
      }
      anchor(camId, at(L / 2, u, CAM), b)
    }
    anchor("intake-valves", at(L / 2, 17, D + 60), b)
    anchor("exhaust-valves", at(L / 2, -17, D + 60), b)
  }

  /* ---------- the timing chains ---------- */

  if (!single && internals) {
    for (const bk of banks) {
      const sx = bk.b === 0 ? -48 : -60
      put("chain", {
        mesh: rotateX(
          memo(`drive${bk.b}`, () => prismX(teethYZ(0, 0, 24, 10, 3.5, 0), sx - 4, sx + 4, true)),
          -theta,
        ),
        smooth: true,
        shade: true,
        tint: MAT.steel,
      })
      const ci = bk.at(0, 17, CAM),
        ce = bk.at(0, -17, CAM)
      // the chain wraps the crank sprocket and both cam sprockets; its links run round as the crank turns
      const loop = hull([...ring(0, 0, 27, 20), ...ring(ci[1], ci[2], 51, 28), ...ring(ce[1], ce[2], 51, 28)])
      const pts = resample(loop, 9.525, theta * 24)
      line(
        "chain",
        pts.map(([y, z]) => [sx, y, z] as Vec3),
        "chain",
        0,
        true,
      )
    }
    anchor("chain", [-56, 0, 160])
  }

  /* ---------- air: filters, turbos, charge pipes, throttle, plenum, runners ---------- */

  if (!single) {
    // plenum and throttle body sit in the vee
    put("plenum", { mesh: memo("plenum", () => prismX(rounded(-76, 292, 76, 372, 26), -14, L + 10, true)), smooth: true, shade: true, tint: MAT.alloy })
    anchor("plenum", [L / 2, 0, 372])
    // the throttle's bore is open at both ends; with its blade drawn inside, its faces sort one by one
    const blade = xray || exploded || f.focus === "throttle"
    const tb = memo("throttle", () =>
      mapMesh(
        lathe(
          [
            [37, -24],
            [42, -24],
            [42, 24],
            [37, 24],
          ],
          22,
          true,
        ),
        ([x, y, z]) => [z - 38, x, y + 332],
      ),
    )
    put("throttle", { mesh: tb, smooth: true, shade: true, tint: MAT.alloy, split: blade })
    if (blade) {
      const disc = memo("blade", () => prismX(ring(0, 332, 36, 18), -39, -37, true))
      put("throttle", { mesh: rotateY(disc, (Math.PI / 2) * (0.08 + 0.9 * f.throttle), [-38, 0, 332]), smooth: true, tint: MAT.brass })
    }
    anchor("throttle", [-38, 0, 332])
    // the inlet: both charge pipes join in a tee in front of the throttle
    put("charge", {
      mesh: memo("tee", () =>
        tube(
          [
            [-118, -64, 332],
            [-118, 64, 332],
          ],
          30,
          14,
        ),
      ),
      smooth: true,
      shade: true,
      tint: MAT.pipe,
    })
    put("charge", {
      mesh: memo("neck", () =>
        tube(
          [
            [-118, 0, 332],
            [-64, 0, 332],
          ],
          32,
          14,
        ),
      ),
      smooth: true,
      shade: true,
      tint: MAT.pipe,
    })
    for (const bk of banks) {
      const b = bk.b,
        t = turboAt(b),
        sy = Math.sign(t.y)
      // up from the compressor, forward along the outside of the head, then across the front to the tee
      const run: Vec3[] = [
        [t.comp + 4, t.y, t.z + 52],
        [t.comp + 4, t.y, t.z + 140],
        [t.comp - 30, 290 * sy, 228],
        [-30, 290 * sy, 236],
        [-96, 262 * sy, 270],
        [-118, 170 * sy, 312],
        [-118, 64 * sy, 332],
      ]
      put("charge", { mesh: memo(`charge${b}`, () => tube(run, 26, 12)), smooth: true, shade: true, tint: MAT.pipe }, b)
      // the blow-off valve on the charge pipe, venting as the throttle shuts
      const bov: Vec3 = [t.comp + 4, t.y + sy * 26, t.z + 130]
      put(
        "charge",
        {
          mesh: memo(`bov${b}`, () =>
            mapMesh(
              lathe(
                [
                  [11, 0],
                  [11, 16],
                  [6, 22],
                ],
                10,
              ),
              ([x, y, z]) => [bov[0] + x, bov[1] + z * sy, bov[2] + y],
              sy > 0,
            ),
          ),
          smooth: true,
          shade: true,
          tint: MAT.steel,
        },
        b,
      )
      const vent = f.turbos[b]?.vent ?? 0
      if (vent > 0)
        for (let k = 0; k < 3; k++) {
          const reach = 12 + (0.7 - vent) * 60 + k * 9
          line("charge", [add(bov, [k * 6 - 6, sy * (24 + reach * 0.4), 4]), add(bov, [k * 9 - 9, sy * (34 + reach), 10 + k * 4])], "vent", b)
        }
    }
    anchor("charge", [-118, 0, 332])

    for (const bk of banks) {
      const { b, at } = bk
      for (const c of cylinders) {
        if (c.bank !== b) continue
        const sy = -bk.sgn
        put(
          "runners",
          {
            mesh: memo(`runner${c.n}`, () => tube([at(c.x, 64, D + 52), at(c.x, 84, D + 64), [c.x, sy * 66, 286], [c.x, sy * 40, 300]], 15, 8)),
            smooth: true,
            shade: true,
            tint: MAT.alloy,
          },
          b,
        )
      }
      anchor("runners", at(L / 2, 84, D + 64), b)
    }
  }

  /* ---------- exhaust: manifolds and turbos ---------- */

  if (!single) {
    const heat = Math.round(f.heat * 5) / 5
    const hot = mix(MAT.iron, "#f97316", heat * 0.85)
    for (const bk of banks) {
      const { b, at } = bk
      const t = turboAt(b),
        sy = Math.sign(t.y)
      const coll = (x: number) => at(x, -120, D - 36)
      for (const c of cylinders) {
        if (c.bank !== b) continue
        put(
          "manifolds",
          { mesh: memo(`primary${c.n}`, () => tube([at(c.x, -64, D + 44), at(c.x, -96, D + 30), coll(c.x)], 14, 8)), smooth: true, shade: true, tint: hot },
          b,
        )
      }
      put(
        "manifolds",
        {
          mesh: memo(`collector${b}`, () => tube([coll(-16), coll(L * 0.5), coll(L - 30), [t.turb, t.y * 0.86, t.z + 70], [t.turb, t.y, t.z + 50]], 22, 10)),
          smooth: true,
          shade: true,
          tint: hot,
        },
        b,
      )
      anchor("manifolds", coll(L / 2), b)

      // the turbo: compressor and turbine housings on one shaft, the air filter on the inlet, the downpipe on the outlet.
      // Filter and downpipe close both ends, so the wheels show only in the X-ray, where the housings are outlines.
      const alongX = (m: Mesh, x: number, flip = false) => mapMesh(zToX(m), ([x0, y0, z0]) => [x + (flip ? -x0 : x0), t.y + y0, t.z + z0], flip)
      put("turbos", { mesh: memo(`comp${b}`, () => alongX(lathe(SCROLL, 20, true), t.comp)), smooth: true, shade: true, tint: MAT.compressor }, b, true)
      put(
        "turbos",
        {
          mesh: memo(`core${b}`, () =>
            alongX(
              lathe(
                [
                  [20, 0],
                  [20, 54],
                ],
                14,
              ),
              t.comp + 18,
            ),
          ),
          smooth: true,
          shade: true,
          tint: MAT.steel,
        },
        b,
        true,
      )
      put(
        "turbos",
        {
          mesh: memo(`turb${b}`, () => alongX(lathe(SCROLL_T, 20, true), t.turb, true)),
          smooth: true,
          shade: true,
          tint: mix(MAT.turbine, "#f97316", heat * 0.6),
        },
        b,
        true,
      )
      put(
        "turbos",
        {
          mesh: memo(`filter${b}`, () =>
            mapMesh(
              lathe(
                [
                  [0, 0],
                  [30, 0],
                  [42, 56],
                  [0, 56],
                ],
                16,
              ),
              ([x, y, z]) => [t.comp - 92 - z, t.y + x, t.z + y],
              true,
            ),
          ),
          smooth: true,
          shade: true,
          tint: MAT.rubber,
        },
        b,
        true,
      )
      put(
        "turbos",
        {
          mesh: memo(`hose${b}`, () =>
            tube(
              [
                [t.comp - 92, t.y, t.z],
                [t.comp - 40, t.y, t.z],
              ],
              29,
              14,
            ),
          ),
          smooth: true,
          shade: true,
          tint: MAT.rubber,
        },
        b,
        true,
      )
      put(
        "turbos",
        {
          mesh: memo(`downpipe${b}`, () =>
            tube(
              [
                [t.turb + 42, t.y, t.z],
                [t.turb + 80, t.y, t.z - 20],
                [t.turb + 92, t.y, t.z - 170],
              ],
              26,
              12,
            ),
          ),
          smooth: true,
          shade: true,
          tint: hot,
        },
        b,
        true,
      )
      if (xray) {
        // both wheels on the shaft, spinning; the nose of each faces out of its housing
        const pivot: Vec3 = [0, t.y, t.z],
          spin = (f.turbos[b]?.spin ?? 0) * sy
        const wheels = memo(`wheels${b}`, () => {
          const nose = (m: Mesh) => mapMesh(m, ([x, y, z]) => [x, y, 4 - z], true)
          const cw = wheel({ hub: [9, 3.5], tip: 25, height: 26, blades: 10, thick: 1.6, twist: 0.8, sides: 12 })
          const tw = wheel({ hub: [10, 4], tip: 24, height: 22, blades: 11, thick: 1.8, twist: -0.7, sides: 12 })
          const round = (m: Mesh) => ({ m, smooth: true }),
            flat = (m: Mesh) => ({ m, smooth: false })
          return [
            round(alongX(nose(cw.hub), t.comp)),
            ...cw.blades.map((m) => flat(alongX(nose(m), t.comp))),
            round(alongX(nose(tw.hub), t.turb, true)),
            ...tw.blades.map((m) => flat(alongX(nose(m), t.turb, true))),
            round(
              alongX(
                lathe(
                  [
                    [5, 0],
                    [5, t.turb - t.comp],
                  ],
                  8,
                ),
                t.comp,
              ),
            ),
          ]
        })
        for (const { m, smooth } of wheels) put("turbos", { mesh: rotateX(m, spin, pivot), smooth, shade: true, tint: MAT.steel }, b)
      }
      // the wastegate's can, and its rod pushing the flap open
      const can: Vec3 = [t.turb - 6, t.y + sy * 52, t.z + 40]
      put(
        "turbos",
        {
          mesh: memo(`can${b}`, () =>
            translate(
              lathe(
                [
                  [15, 0],
                  [15, 22],
                  [4, 24],
                ],
                12,
              ),
              can,
            ),
          ),
          smooth: true,
          shade: true,
          tint: MAT.steel,
        },
        b,
      )
      const gate = f.turbos[b]?.gate ?? 0
      line("turbos", [can, add(can, [10, -sy * 14, -34 + gate * 10])], "mid", b)
      anchor("turbos", [t.comp + 30, t.y, t.z + 40], b)
    }
  }

  /* ---------- in one-cylinder mode, the cylinder's own housing as outlines ---------- */

  if (single) {
    const c = cylinders[f.only - 1],
      bk = banks[c.bank]
    const liner = bk.place(
      lathe(
        [
          [s.bore / 2 + 4, 0],
          [s.bore / 2 + 4, D - (s.rod - r - SK) + 10],
        ],
        24,
      ),
      c.x,
      0,
      s.rod - r - SK - 10,
    )
    items.push({ mesh: liner, wire: true, smooth: true, cls: "ghost", layer: 2 })
    const head: Vec2[] = [bk.yz(-64, D), bk.yz(64, D), bk.yz(64, D + HEAD), bk.yz(-64, D + HEAD)]
    items.push({ mesh: prismX(head, c.x - 52, c.x + 52), wire: true, cls: "ghost", layer: 2 })
  }

  return { items, anchors }
}

/** Angles round a cam lobe, closer together over the nose. */
const LOBE = [-180, -130, -90, -66, -52, -40, -28, -16, -6, 6, 16, 28, 40, 52, 66, 90, 130].map((d) => (d * Math.PI) / 180)

/** A compressor scroll's section, revolved: inlet bore open toward −z, the wheel's chamber behind it, the volute round it. */
const SCROLL: Vec2[] = [
  [27, -42],
  [32, -42],
  [32, -16],
  [62, -10],
  [66, 2],
  [60, 14],
  [36, 18],
  [0, 18],
  [0, 8],
  [24, 6],
  [27, -2],
]
/** A turbine housing's section: a heavier volute round a smaller wheel, the outlet open toward −z (flipped to face back). */
const SCROLL_T: Vec2[] = [
  [26, -36],
  [31, -36],
  [31, -14],
  [56, -8],
  [60, 4],
  [54, 14],
  [34, 16],
  [0, 16],
  [0, 8],
  [23, 6],
  [26, -2],
]

/** A gear's outline in the y–z plane. */
function teethYZ(cy: number, cz: number, rad: number, count: number, depth: number, turn: number): Vec2[] {
  // teeth() works in x–y with angles from +x; in the crank's plane angles run from +z toward +y, so swap the axes
  return teeth(0, 0, rad, count, depth, turn).map(([a, b]) => [cy + b, cz + a] as Vec2)
}

/** Keeps the part of a convex polygon where p · n ≤ k. */
function clip(poly: Vec2[], n: Vec2, k: number): Vec2[] {
  const out: Vec2[] = []
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i],
      b = poly[(i + 1) % poly.length]
    const da = a[0] * n[0] + a[1] * n[1] - k,
      db = b[0] * n[0] + b[1] * n[1] - k
    if (da <= 0) out.push(a)
    if ((da < 0 && db > 0) || (da > 0 && db < 0)) {
      const t = da / (da - db)
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t])
    }
  }
  return out
}

/** Points every `step` along a closed loop, starting `offset` along it: the chain's links, which move as offset grows. */
function resample(loop: Vec2[], step: number, offset: number): Vec2[] {
  const seg: number[] = []
  let total = 0
  for (let i = 0; i < loop.length; i++) {
    const a = loop[i],
      b = loop[(i + 1) % loop.length]
    const d = Math.hypot(b[0] - a[0], b[1] - a[1])
    seg.push(d)
    total += d
  }
  const n = Math.max(3, Math.round(total / step))
  const gap = total / n
  const out: Vec2[] = []
  let at = ((offset % gap) + gap) % gap,
    i = 0,
    base = 0
  for (let k = 0; k < n; k++, at += gap) {
    while (base + seg[i] < at && i < loop.length - 1) {
      base += seg[i]
      i++
    }
    const a = loop[i],
      b = loop[(i + 1) % loop.length],
      t = seg[i] ? (at - base) / seg[i] : 0
    out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t])
  }
  return out
}

/** Mixes two hex colours. */
function mix(a: string, b: string, t: number) {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16)),
    pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16))
  return `#${pa
    .map((v, i) =>
      Math.round(v + (pb[i] - v) * t)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`
}
