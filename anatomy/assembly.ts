import type { Vec3 } from "@/registry/isometric/lib/isometric/iso"

/**
 * Anatomy — the parts of the engine as a mechanic would take it apart.
 *
 * Every part names what it is and what it does, lists a figure or two, and
 * says how it leaves when the engine is exploded: which way, how far, and at
 * what depth of the assembly tree: covers first, then the cams and valves,
 * and only then the heads, as a mechanic would. Parts that come in banks move along their
 * bank's axis (`bank: true`): up and out of the vee.
 */

export type PartId =
  | "block"
  | "heads"
  | "covers"
  | "coils"
  | "sump"
  | "front"
  | "chain"
  | "crank"
  | "rods"
  | "pistons"
  | "intake-valves"
  | "exhaust-valves"
  | "intake-cams"
  | "exhaust-cams"
  | "plenum"
  | "runners"
  | "throttle"
  | "manifolds"
  | "turbos"
  | "charge"
  | "flywheel"
  | "damper"

export type Kind = "housing" | "moving" | "air" | "exhaust"

export type PartDef = {
  id: PartId
  name: string
  /** One line on what it does. */
  job: string
  /** Figures for the callout: label and value. */
  facts: [string, string][]
  kind: Kind
  /** Explode: a world direction, or along each bank's axis with `bank`, plus extra in world space. */
  away: Vec3
  bank?: number
  /** Order it leaves in: 0 first (outermost), larger later. Reassembly runs the other way. */
  level: number
}

export const PARTS: PartDef[] = [
  {
    id: "covers",
    name: "Cam covers",
    job: "Seal the valvetrain and keep the oil in.",
    facts: [
      ["Material", "cast magnesium"],
      ["Count", "2"],
    ],
    kind: "housing",
    away: [0, 0, 0],
    bank: 640,
    level: 0,
  },
  {
    id: "coils",
    name: "Ignition coils",
    job: "One coil over each plug, stepping 12 V up to the spark.",
    facts: [
      ["Count", "12"],
      ["Spark", "≈ 40 kV"],
    ],
    kind: "moving",
    away: [0, 0, 0],
    bank: 730,
    level: 0,
  },
  {
    id: "plenum",
    name: "Intake plenum",
    job: "A calm reservoir of boosted air feeding all twelve runners evenly.",
    facts: [
      ["Volume", "≈ 9 L"],
      ["Pressure", "manifold"],
    ],
    kind: "air",
    away: [0, 0, 560],
    level: 0,
  },
  {
    id: "throttle",
    name: "Throttle body",
    job: "The butterfly valve that meters the air; the pedal moves it.",
    facts: [
      ["Bore", "82 mm"],
      ["Drive", "electronic"],
    ],
    kind: "air",
    away: [-220, 0, 560],
    level: 0,
  },
  {
    id: "charge",
    name: "Charge pipes",
    job: "Carry compressed air from each turbo forward to the throttle.",
    facts: [["Diameter", "60 mm"]],
    kind: "air",
    away: [-120, 0, 220],
    level: 0,
  },
  {
    id: "front",
    name: "Timing cover",
    job: "Encloses the timing chains at the front of the engine.",
    facts: [["Material", "aluminium"]],
    kind: "housing",
    away: [-380, 0, 0],
    level: 0,
  },
  {
    id: "damper",
    name: "Crank damper",
    job: "A tuned rubber-bonded ring that soaks up the crank's torsional vibration.",
    facts: [["Diameter", "170 mm"]],
    kind: "moving",
    away: [-540, 0, -380],
    level: 1,
  },
  {
    id: "runners",
    name: "Intake runners",
    job: "Twelve tuned pipes, one per cylinder, from the plenum to the ports.",
    facts: [["Length", "≈ 220 mm"]],
    kind: "air",
    away: [0, 0, 420],
    level: 1,
  },
  {
    id: "turbos",
    name: "Turbochargers",
    job: "Exhaust spins the turbine; on the same shaft the compressor packs air into the engine.",
    facts: [
      ["Shaft speed", "up to 165,000 rpm"],
      ["Boost", "1.15 bar"],
    ],
    kind: "moving",
    away: [0, 340, -80],
    level: 1,
  },
  {
    id: "manifolds",
    name: "Exhaust manifolds",
    job: "Gather each bank's six exhausts into its turbo.",
    facts: [
      ["Material", "cast steel"],
      ["Gas", "up to 950 °C"],
    ],
    kind: "exhaust",
    away: [0, 170, -40],
    level: 2,
  },
  {
    id: "heads",
    name: "Cylinder heads",
    job: "Close the cylinders, hold the valves and cams, and carry the ports.",
    facts: [
      ["Valves", "24 per head"],
      ["Material", "aluminium"],
    ],
    kind: "housing",
    away: [0, 0, 0],
    bank: 220,
    level: 4,
  },
  {
    id: "intake-cams",
    name: "Intake camshafts",
    job: "Open the intake valves, turning at half crank speed.",
    facts: [
      ["Lobes", "12 each"],
      ["Duration", "240°"],
    ],
    kind: "moving",
    away: [0, 0, 0],
    bank: 500,
    level: 2,
  },
  {
    id: "exhaust-cams",
    name: "Exhaust camshafts",
    job: "Open the exhaust valves, turning at half crank speed.",
    facts: [
      ["Lobes", "12 each"],
      ["Duration", "240°"],
    ],
    kind: "moving",
    away: [0, 0, 0],
    bank: 500,
    level: 2,
  },
  {
    id: "chain",
    name: "Timing chains",
    job: "Drive the four camshafts from the crank at exactly half its speed.",
    facts: [
      ["Ratio", "2 : 1"],
      ["Chains", "2"],
    ],
    kind: "moving",
    away: [-230, 0, 0],
    level: 2,
  },
  {
    id: "intake-valves",
    name: "Intake valves",
    job: "Let the air in. Two per cylinder, opened by the cam, closed by the spring.",
    facts: [
      ["Count", "24"],
      ["Head", "34 mm"],
      ["Lift", "10.2 mm"],
    ],
    kind: "moving",
    away: [0, 0, 0],
    bank: 370,
    level: 3,
  },
  {
    id: "exhaust-valves",
    name: "Exhaust valves",
    job: "Let the burnt gas out. Smaller than the intakes, and they run hotter.",
    facts: [
      ["Count", "24"],
      ["Head", "29 mm"],
      ["Lift", "9.6 mm"],
    ],
    kind: "moving",
    away: [0, 0, 0],
    bank: 370,
    level: 3,
  },
  {
    id: "sump",
    name: "Oil sump",
    job: "Holds the oil the pump sends round the engine.",
    facts: [["Capacity", "≈ 10 L"]],
    kind: "housing",
    away: [0, 0, -640],
    level: 2,
  },
  {
    id: "pistons",
    name: "Pistons",
    job: "Take the push of the burning gas and hand it to the rods.",
    facts: [
      ["Bore", "89 mm"],
      ["Count", "12"],
      ["Peak load", "≈ 9 t"],
    ],
    kind: "moving",
    away: [0, 0, 0],
    bank: 190,
    level: 5,
  },
  {
    id: "rods",
    name: "Connecting rods",
    job: "Turn the pistons' up-and-down into the crank's rotation.",
    facts: [
      ["Length", "144 mm"],
      ["Count", "12"],
    ],
    kind: "moving",
    away: [0, 0, -380],
    level: 6,
  },
  {
    id: "crank",
    name: "Crankshaft",
    job: "Six throws 120° apart, each shared by a cylinder from each bank.",
    facts: [
      ["Stroke", "80 mm"],
      ["Main bearings", "7"],
    ],
    kind: "moving",
    away: [0, 0, -380],
    level: 6,
  },
  {
    id: "flywheel",
    name: "Flywheel",
    job: "Stores energy between power strokes and carries the starter's ring gear.",
    facts: [["Diameter", "300 mm"]],
    kind: "moving",
    away: [320, 0, -380],
    level: 6,
  },
  {
    id: "block",
    name: "Engine block",
    job: "The backbone: twelve bores in a 60° vee over the crank.",
    facts: [
      ["Bank angle", "60°"],
      ["Displacement", "5,972 cc"],
    ],
    kind: "housing",
    away: [0, 0, 0],
    level: 7,
  },
]

export const PART: Record<PartId, PartDef> = Object.fromEntries(PARTS.map((p) => [p.id, p])) as Record<PartId, PartDef>

/** The deepest level, for timing the stagger. */
export const LEVELS = Math.max(...PARTS.map((p) => p.level))
