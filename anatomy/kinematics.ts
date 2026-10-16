import { derive, type EngineSpec } from "./spec"

/**
 * Anatomy — the slider-crank and the vee.
 *
 * The crank turns about the world x axis, front (the timing chain) at x < 0.
 * A direction in the crank's plane is an angle from +z (up) toward +y. The
 * crank pin of a throw at angle ψ sits at r·(sin(θ + ψ), cos(θ + ψ)) as the
 * crank turns through θ; a cylinder leans at its bank angle β. The angle
 * between the pin and the cylinder's axis is α = θ + ψ − β, and α = 0 is
 * top dead centre.
 */

const RAD = Math.PI / 180
export const rad = (deg: number) => deg * RAD
export const deg = (r: number) => r / RAD
/** An angle wrapped into [0, n). */
export const wrap = (a: number, n = 360) => ((a % n) + n) % n

/** Distance from the crank axis to the piston pin: s(α) = r cos α + √(l² − r² sin² α). */
export function pistonDistance(r: number, l: number, a: number) {
  const sa = Math.sin(a)
  return r * Math.cos(a) + Math.sqrt(l * l - r * r * sa * sa)
}

/** How far the piston is below top dead centre: 0 at TDC, the stroke at BDC. */
export const pistonDrop = (r: number, l: number, a: number) => r + l - pistonDistance(r, l, a)

/** The rod's lean from the cylinder axis: φ = asin(r sin α / l). */
export const rodAngle = (r: number, l: number, a: number) => Math.asin((r * Math.sin(a)) / l)

/** ds/dα: the piston's speed per radian of crank (negative while it falls). */
export function pistonVelocity(r: number, l: number, a: number) {
  const sa = Math.sin(a),
    q = Math.sqrt(l * l - r * r * sa * sa)
  return -r * sa * (1 + (r * Math.cos(a)) / q)
}

/** d²s/dα²: the piston's acceleration per radian² of crank. */
export function pistonAcceleration(r: number, l: number, a: number) {
  const sa = Math.sin(a),
    ca = Math.cos(a),
    q = Math.sqrt(l * l - r * r * sa * sa)
  return -r * ca - (r * r * (ca * ca - sa * sa)) / q - (r ** 4 * sa * sa * ca * ca) / q ** 3
}

export type Cylinder = {
  /** 1-based, as in the firing order. */
  n: number
  /** 0 for bank A, 1 for bank B. */
  bank: number
  /** Position in its bank, 0 at the front. */
  slot: number
  /** Bank lean, radians from +z toward +y. */
  lean: number
  /** Throw angle on the crank, radians. */
  throw: number
  /** Centre along the crank, mm. */
  x: number
  /** Crank degrees, 0…720, at which it fires (top dead centre on compression). */
  fires: number
  /** Unit vector up the bore, in the y–z plane: [0, y, z]. */
  axis: [number, number, number]
}

/**
 * Every cylinder's place and timing, from the firing order. Bank A leans
 * −vee/2, bank B +vee/2. Each throw angle is solved from when its cylinder
 * fires: TDC at θ = fires (mod 360) means ψ = β − fires.
 */
export function layout(s: EngineSpec): Cylinder[] {
  const { cylinders, interval } = derive(s)
  const out: Cylinder[] = []
  for (let k = 0; k < cylinders; k++) {
    const n = k + 1
    const bank = Math.floor(k / s.perBank),
      slot = k % s.perBank
    const lean = rad((bank === 0 ? -1 : 1) * (s.vee / 2))
    const at = s.firing.indexOf(n)
    if (at < 0) throw new Error(`cylinder ${n} is missing from the firing order`)
    const fires = at * interval
    out.push({
      n,
      bank,
      slot,
      lean,
      throw: rad(wrap(deg(lean) - fires)),
      x: slot * s.pitch + bank * s.stagger,
      fires,
      axis: [0, Math.sin(lean), Math.cos(lean)],
    })
  }
  return out
}

/** α for a cylinder at crank angle θ (radians). */
export const crankAngle = (c: Cylinder, theta: number) => theta + c.throw - c.lean

/** The crank pin's centre in the y–z plane at crank angle θ. */
export const pin = (c: Cylinder, r: number, theta: number): [number, number] => [r * Math.sin(theta + c.throw), r * Math.cos(theta + c.throw)]

/** Where one cylinder's moving parts are at crank angle θ. */
export function pose(s: EngineSpec, c: Cylinder, theta: number) {
  const { r } = derive(s)
  const a = crankAngle(c, theta)
  const dist = pistonDistance(r, s.rod, a)
  const [py, pz] = pin(c, r, theta)
  return {
    a,
    /** Pin centre (y, z). */
    pin: [py, pz] as [number, number],
    /** Gudgeon pin centre (y, z): `dist` up the bore. */
    wrist: [c.axis[1] * dist, c.axis[2] * dist] as [number, number],
    dist,
    drop: r + s.rod - dist,
    rod: rodAngle(r, s.rod, a),
  }
}
