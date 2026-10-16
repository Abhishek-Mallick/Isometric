/**
 * Anatomy — an engine described by numbers. Every part's shape and every
 * moving thing is built from a spec, so a second engine is a second spec
 * (plus whatever parts it adds).
 *
 * Lengths are millimetres, angles degrees, speeds rpm, pressures bar
 * (absolute unless named `boost`), unless a field says otherwise.
 */

export type ValveTiming = {
  /** Crank degrees in the cycle (0 = top dead centre, start of the power stroke) where the valve starts to open. */
  open: number
  /** Where it seats again; may run past 720 into the next cycle. */
  close: number
  /** Peak lift, mm. */
  lift: number
  /** Head diameter, mm. */
  head: number
}

export type TurboSpec = {
  /** Shaft speed at full exhaust flow, rpm. */
  max: number
  /** Shaft speed with the engine idling, rpm. */
  idle: number
  /** Seconds to spool most of the way up, and to wind down. */
  spool: number
  fall: number
  /** Boost (bar over the air outside) at full shaft speed, before the wastegate. */
  boost: number
  /** Where the wastegate holds boost: bar at low rpm, tapering to `taper` by the redline. */
  gate: number
  taper: number
  /** Compressor wheel tip radius, mm. */
  wheel: number
}

export type EngineSpec = {
  id: string
  name: string
  /** A short line for the page. */
  summary: string
  /** Cylinders per bank and banks (a V12 is 6 × 2). */
  perBank: number
  banks: number
  /** Angle between the banks, degrees. */
  vee: number
  /** Order the cylinders fire in, by number. Bank A is 1…perBank, front to back; bank B follows. */
  firing: number[]
  bore: number
  stroke: number
  /** Centre to centre, mm. */
  rod: number
  compression: number
  /** Distance between cylinder centres along a bank, mm. */
  pitch: number
  /** How far bank B sits behind bank A along the crank, mm: the width of one rod on a shared pin. */
  stagger: number
  idle: number
  redline: number
  /** Fuel is cut here, and comes back `hysteresis` rpm lower. */
  limiter: number
  hysteresis: number
  intake: ValveTiming
  exhaust: ValveTiming
  /** Valves per cylinder: two intake, two exhaust for 4. */
  valves: number
  /** Polytropic index for compression and expansion. */
  gamma: number
  /** How far combustion multiplies cylinder pressure at full charge: tuned so the torque matches `torque`. */
  burn: number
  /** Spark advance before top dead centre at idle and at the redline, crank degrees. */
  advance: [number, number]
  /** Wiebe burn: crank degrees from 10% to 90% burned, and the shape factors. */
  burnAngle: number
  /** Rotating inertia including the dyno, kg·m². */
  inertia: number
  /** Claimed peak figures, for the readout and to check the model against. */
  torque: number
  power: number
  turbo: TurboSpec
}

/**
 * A 6.0 litre, 60° twin-turbo V12 with two cams per bank, four valves per
 * cylinder and one turbo per bank, modelled on modern luxury and grand
 * touring V12s. The crank is laid out like an inline six: throws 120° apart,
 * each shared by one cylinder from each bank, so the engine fires every 60°.
 */
export const V12: EngineSpec = {
  id: "v12-twin-turbo",
  name: "V12 Twin-Turbo",
  summary: "6.0 litre 60° V12, twin turbochargers, 48 valves",
  perBank: 6,
  banks: 2,
  vee: 60,
  firing: [1, 7, 5, 11, 3, 9, 6, 12, 2, 8, 4, 10],
  bore: 89,
  stroke: 80,
  rod: 144,
  compression: 10,
  pitch: 103,
  stagger: 24,
  idle: 650,
  redline: 6500,
  limiter: 6700,
  hysteresis: 180,
  intake: { open: 350, close: 590, lift: 10.2, head: 34 },
  exhaust: { open: 130, close: 370, lift: 9.6, head: 29 },
  valves: 4,
  gamma: 1.3,
  burn: 4.8,
  advance: [10, 32],
  burnAngle: 50,
  inertia: 1.6,
  torque: 1000,
  power: 463,
  turbo: { max: 165000, idle: 12000, spool: 0.9, fall: 1.8, boost: 1.9, gate: 1.15, taper: 0.62, wheel: 26 },
}

export const ENGINES: EngineSpec[] = [V12]

/** Figures that follow from a spec. */
export function derive(s: EngineSpec) {
  const cylinders = s.perBank * s.banks
  const r = s.stroke / 2
  const area = (Math.PI * s.bore * s.bore) / 4
  const swept = area * s.stroke
  const clearance = swept / (s.compression - 1)
  return {
    cylinders,
    /** Crank radius, mm. */
    r,
    /** Piston crown area, mm². */
    area,
    /** Swept volume of one cylinder, mm³. */
    swept,
    clearance,
    /** Total displacement, litres. */
    litres: (swept * cylinders) / 1e6,
    /** Crank degrees between firings. */
    interval: 720 / cylinders,
  }
}
