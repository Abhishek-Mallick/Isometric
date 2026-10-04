import type { Vec3 } from "./iso"
import { box, pane } from "./mesh"
import type { Drawable, Stroke } from "./scene"

/**
 * Isometric — blocks: unit cubes in nine materials, with texture drawn in
 * lines and a material tint mixed into the plate colour. Shared by the block
 * figures, the world and the block icon.
 *
 * Texture is drawn on the lid and on the +x and +y sides, the faces every
 * Isometric camera sees (its azimuth is between 0° and 90°).
 */

export type BlockType = "grass" | "dirt" | "stone" | "ore" | "sand" | "log" | "planks" | "leaves" | "glass"

export const BLOCK_TYPES: BlockType[] = ["grass", "dirt", "stone", "ore", "sand", "log", "planks", "leaves", "glass"]

/** Each material: its name, its tint, and the custom property that overrides the tint. */
export const MATERIAL: Record<BlockType, { label: string; tint: string }> = {
  grass: { label: "Grass", tint: "var(--iso-grass, #5f9f4a)" },
  dirt: { label: "Dirt", tint: "var(--iso-dirt, #8b5e3c)" },
  stone: { label: "Stone", tint: "var(--iso-stone, #8d939b)" },
  ore: { label: "Ore", tint: "var(--iso-stone, #8d939b)" },
  sand: { label: "Sand", tint: "var(--iso-sand, #d8c486)" },
  log: { label: "Log", tint: "var(--iso-log, #85583a)" },
  planks: { label: "Planks", tint: "var(--iso-planks, #bf955f)" },
  leaves: { label: "Leaves", tint: "var(--iso-leaves, #4c9441)" },
  glass: { label: "Glass", tint: "transparent" },
}

type Opts = { part?: string; cls?: string; bias?: number; crack?: number; inert?: boolean }

/** A point on a visible face: `f` is the face ("top", "x" or "y"), u and v run across it from 0 to 1. */
function on(f: "top" | "x" | "y", x: number, y: number, z: number, s: number, u: number, v: number, lift = 0.06): Vec3 {
  if (f === "top") return [x + u * s, y + v * s, z + s + lift]
  if (f === "x") return [x + s + lift, y + u * s, z + v * s]
  return [x + u * s, y + s + lift, z + v * s]
}

/** Little marks that say what a block is made of, per face, as segments in face units. */
const marks: Record<BlockType, (f: "top" | "x" | "y") => [number, number, number, number][]> = {
  grass: (f) => (f === "top" ? [[0.2, 0.3, 0.32, 0.3], [0.6, 0.65, 0.75, 0.65], [0.4, 0.85, 0.5, 0.85]] : [[0.15, 0.4, 0.25, 0.4], [0.6, 0.25, 0.7, 0.25]]),
  dirt: () => [[0.2, 0.3, 0.3, 0.3], [0.6, 0.6, 0.72, 0.6], [0.35, 0.78, 0.45, 0.78], [0.75, 0.2, 0.85, 0.2]],
  stone: () => [[0.15, 0.3, 0.4, 0.38], [0.55, 0.7, 0.8, 0.62], [0.3, 0.75, 0.42, 0.85]],
  ore: () => [[0.15, 0.3, 0.4, 0.38], [0.55, 0.75, 0.8, 0.68]],
  sand: () => [[0.25, 0.3, 0.27, 0.3], [0.6, 0.45, 0.62, 0.45], [0.4, 0.75, 0.42, 0.75], [0.8, 0.8, 0.82, 0.8]],
  log: (f) => (f === "top" ? [] : [[0.25, 0.1, 0.25, 0.9], [0.55, 0.15, 0.55, 0.7], [0.8, 0.3, 0.8, 0.95]]),
  planks: (f) => (f === "top" ? [[0, 0.33, 1, 0.33], [0, 0.66, 1, 0.66]] : [[0, 0.33, 1, 0.33], [0, 0.66, 1, 0.66], [0.5, 0, 0.5, 0.33], [0.25, 0.33, 0.25, 0.66], [0.75, 0.66, 0.75, 1]]),
  leaves: () => [[0.2, 0.25, 0.3, 0.35], [0.6, 0.5, 0.7, 0.4], [0.35, 0.75, 0.45, 0.7]],
  glass: () => [[0.15, 0.85, 0.35, 0.65], [0.25, 0.85, 0.4, 0.7]],
}

/** Cracks for mining, one more set per stage. */
const cracks: [number, number, number, number][][] = [
  [[0.5, 0.5, 0.3, 0.3], [0.5, 0.5, 0.75, 0.4]],
  [[0.5, 0.5, 0.45, 0.85], [0.3, 0.3, 0.12, 0.38], [0.75, 0.4, 0.9, 0.2]],
  [[0.45, 0.85, 0.2, 0.9], [0.75, 0.4, 0.85, 0.7], [0.3, 0.3, 0.35, 0.1]],
]

/** One block at (x, y, z), `s` on a side, as drawables. */
export function block(type: BlockType, x: number, y: number, z: number, s: number, o: Opts = {}): (Drawable | Stroke)[] {
  const out: (Drawable | Stroke)[] = []
  const tint = MATERIAL[type].tint
  const base = { part: o.part, bias: o.bias ?? 0, inert: o.inert }
  const strokeBias = (o.bias ?? 0) + 0.001
  if (type === "grass") {
    // a dirt body under a turf cap, with a ragged edge where the turf meets the dirt
    out.push({ mesh: box(x, y, z, x + s, y + s, z + s * 0.78), shade: true, tint: MATERIAL.dirt.tint, cls: o.cls, ...base })
    out.push({ mesh: box(x, y, z + s * 0.78, x + s, y + s, z + s), shade: true, tint, cls: o.cls, ...base, bias: base.bias + 0.0005 })
    for (const f of ["x", "y"] as const) {
      const pts: Vec3[] = []
      for (let i = 0; i <= 8; i++) pts.push(on(f, x, y, z, s, i / 8, i % 2 ? 0.7 : 0.62))
      out.push({ pts, cls: "lo", part: o.part, bias: strokeBias })
    }
  } else if (type === "glass") {
    out.push({ mesh: box(x, y, z, x + s, y + s, z + s), cls: `glass ${o.cls ?? ""}`, ...base })
  } else {
    out.push({ mesh: box(x, y, z, x + s, y + s, z + s), shade: true, tint, cls: o.cls, ...base })
  }
  for (const f of ["top", "x", "y"] as const) {
    for (const [u0, v0, u1, v1] of marks[type](f)) out.push({ pts: [on(f, x, y, z, s, u0, v0), on(f, x, y, z, s, u1, v1)], cls: "lo", part: o.part, bias: strokeBias })
    for (let c = 0; c < Math.min(3, o.crack ?? 0); c++) for (const [u0, v0, u1, v1] of cracks[c]) out.push({ pts: [on(f, x, y, z, s, u0, v0), on(f, x, y, z, s, u1, v1)], cls: "hi", part: o.part, bias: strokeBias })
  }
  if (type === "log") {
    // growth rings on the cut end
    for (const r of [0.38, 0.22]) {
      const ring = [[0.5 - r, 0.5 - r], [0.5 + r, 0.5 - r], [0.5 + r, 0.5 + r], [0.5 - r, 0.5 + r], [0.5 - r, 0.5 - r]].map(([u, v]) => on("top", x, y, z, s, u, v))
      out.push({ pts: ring, cls: "lo", part: o.part, bias: strokeBias })
    }
  }
  if (type === "ore") {
    // flecks of ore in the stone: small lit squares on each face
    const flecks: [number, number][] = [[0.25, 0.6], [0.62, 0.3], [0.7, 0.8]]
    for (const f of ["top", "x", "y"] as const) for (const [u, v] of flecks) {
      const sq = [[u - 0.07, v - 0.07], [u + 0.07, v - 0.07], [u + 0.07, v + 0.07], [u - 0.07, v + 0.07]].map(([a, b]) => on(f, x, y, z, s, a, b, 0.08))
      const toward: Vec3 = f === "top" ? [0, 0, 1] : f === "x" ? [1, 0, 0] : [0, 1, 0]
      out.push({ mesh: pane(sq, toward), cls: "solid", part: o.part, bias: strokeBias, inert: true })
    }
  }
  return out
}
