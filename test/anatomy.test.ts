import { describe, expect, it } from "vitest"

import { advance, burned, lift, lobe, meanTorque, phase, pressure, strokeOf, sweep, totalTorque, volume } from "@/anatomy/cycle"
import { layout, pistonAcceleration, pistonDistance, pistonDrop, pistonVelocity, pose, rad, rodAngle, wrap } from "@/anatomy/kinematics"
import { ATMOSPHERE, fill, frictionAt, manifold, sim, start, step, stop } from "@/anatomy/sim"
import { derive, V12 } from "@/anatomy/spec"
import { boostAt, gateAt, speedFor, stepTurbo, turbo } from "@/anatomy/turbo"

const s = V12
const { r } = derive(s)
const l = s.rod
const cyls = layout(s)

describe("spec", () => {
  it("is a 6.0 litre twelve that fires every 60°", () => {
    const d = derive(s)
    expect(d.cylinders).toBe(12)
    expect(d.litres).toBeCloseTo(5.97, 2)
    expect(d.interval).toBe(60)
    expect(new Set(s.firing).size).toBe(12)
  })
})

describe("slider-crank", () => {
  it("s(0) = r + l and s(π) = l − r", () => {
    expect(pistonDistance(r, l, 0)).toBeCloseTo(r + l, 9)
    expect(pistonDistance(r, l, Math.PI)).toBeCloseTo(l - r, 9)
    expect(pistonDrop(r, l, Math.PI)).toBeCloseTo(s.stroke, 9)
  })
  it("the rod is upright at both dead centres and leans most near 90°", () => {
    expect(rodAngle(r, l, 0)).toBeCloseTo(0, 9)
    expect(Math.abs(rodAngle(r, l, Math.PI))).toBeLessThan(1e-9)
    expect(rodAngle(r, l, Math.PI / 2)).toBeCloseTo(Math.asin(r / l), 9)
  })
  it("velocity and acceleration are the derivatives of s", () => {
    const h = 1e-5
    for (const a of [0.3, 1.1, 2, 2.9, 4.4, 5.8]) {
      const ds = (pistonDistance(r, l, a + h) - pistonDistance(r, l, a - h)) / (2 * h)
      const dds = (pistonDistance(r, l, a + h) - 2 * pistonDistance(r, l, a) + pistonDistance(r, l, a - h)) / (h * h)
      expect(pistonVelocity(r, l, a)).toBeCloseTo(ds, 4)
      expect(pistonAcceleration(r, l, a)).toBeCloseTo(dds, 1)
    }
  })
  it("the piston passes mid-stroke before the crank reaches 90° (a finite rod)", () => {
    expect(pistonDrop(r, l, Math.PI / 2)).toBeGreaterThan(s.stroke / 2)
  })
})

describe("the vee and the firing order", () => {
  it("each cylinder is at top dead centre on compression when it fires", () => {
    for (const c of cyls) {
      const p = pose(s, c, rad(c.fires))
      expect(p.drop).toBeCloseTo(0, 6)
      expect(phase(c, c.fires)).toBeCloseTo(0, 9)
    }
  })
  it("fires evenly, one cylinder every 60° of crank", () => {
    const at = s.firing.map((n) => cyls[n - 1].fires).sort((a, b) => a - b)
    at.forEach((f, i) => expect(f).toBeCloseTo(i * 60, 9))
  })
  it("pairs the banks on shared throws, laid out like an inline six", () => {
    for (let k = 0; k < 6; k++) expect(wrap(cyls[k].throw - cyls[k + 6].throw, 2 * Math.PI)).toBeCloseTo(0, 9)
    const throws = new Set(cyls.slice(0, 6).map((c) => Math.round((c.throw * 180) / Math.PI)))
    expect(throws.size).toBe(3)
    expect(Math.round((cyls[0].throw * 180) / Math.PI)).toBe(Math.round((cyls[5].throw * 180) / Math.PI))
  })
  it("leans the banks 60° apart", () => {
    expect(((cyls[6].lean - cyls[0].lean) * 180) / Math.PI).toBeCloseTo(60, 9)
  })
})

describe("the cycle", () => {
  it("runs power, exhaust, intake, compression", () => {
    expect([10, 200, 400, 600].map(strokeOf)).toEqual(["power", "exhaust", "intake", "compression"])
  })
  it("opens each valve only in its window, with overlap at the top of exhaust", () => {
    expect(lift(s.intake, 300)).toBe(0)
    expect(lift(s.exhaust, 400)).toBe(0)
    expect(lift(s.intake, 360)).toBeGreaterThan(0)
    expect(lift(s.exhaust, 360)).toBeGreaterThan(0)
    const mid = (s.intake.open + s.intake.close) / 2
    expect(lift(s.intake, mid)).toBeCloseTo(s.intake.lift, 6)
  })
  it("turns the cams at exactly half crank speed", () => {
    const c = cyls[3]
    expect(lobe(c, s.intake, 720) - lobe(c, s.intake, 0)).toBeCloseTo(2 * Math.PI, 9)
    expect(lobe(c, s.intake, 100) - lobe(c, s.intake, 40)).toBeCloseTo(rad(30), 9)
  })
  it("points each lobe down the bore at the middle of its valve's opening", () => {
    for (const c of cyls)
      for (const v of [s.intake, s.exhaust]) {
        const theta = c.fires + (v.open + v.close) / 2
        const a = lobe(c, v, theta),
          down = c.lean + Math.PI
        expect(Math.cos(a - down)).toBeCloseTo(1, 9)
      }
  })
  it("advances the spark with rpm", () => {
    expect(advance(s, 0)).toBe(s.advance[0])
    expect(advance(s, s.redline)).toBe(s.advance[1])
  })
  it("burns from nothing to all", () => {
    expect(burned(s, -40, 20)).toBe(0)
    expect(burned(s, 80, 20)).toBeGreaterThan(0.99)
  })
  it("has the smallest volume at the top and the compression ratio between the ends", () => {
    expect(volume(s, 180) / volume(s, 0)).toBeCloseTo(s.compression, 6)
  })
  it("peaks in pressure just after the top on a firing cycle, and not on a motoring one", () => {
    const q = { intake: 2.1, exhaust: 1.5, fill: 0.95, fuel: true, advance: 25 }
    const pts = sweep(s, q, 1)
    const top = pts.reduce((a, b) => (b.p > a.p ? b : a))
    expect(top.ph).toBeGreaterThan(0)
    expect(top.ph).toBeLessThan(40)
    expect(top.p).toBeGreaterThan(80)
    expect(top.p).toBeLessThan(160)
    const motoring = sweep(s, { ...q, fuel: false }, 1).reduce((a, b) => (b.p > a.p ? b : a))
    expect(motoring.p).toBeLessThan(top.p / 2)
    expect(pressure(s, 450, q)).toBe(q.intake)
    expect(pressure(s, 300, q)).toBe(q.exhaust)
  })
  it("makes the claimed torque and power on full boost, near enough", () => {
    let best = 0,
      power = 0
    for (let rpm = 1500; rpm <= 6500; rpm += 250) {
      const boost = gateAt(s, rpm)
      const T =
        meanTorque(s, { intake: manifold(1, boost), exhaust: ATMOSPHERE + 0.04 + 0.7 * boost, fill: fill(s, rpm), fuel: true, advance: advance(s, rpm) }, 2) -
        frictionAt(rpm)
      best = Math.max(best, T)
      power = Math.max(power, (T * rpm * Math.PI) / 30 / 1000)
    }
    expect(best).toBeGreaterThan(0.9 * s.torque)
    expect(best).toBeLessThan(1.1 * s.torque)
    expect(power).toBeGreaterThan(0.9 * s.power)
    expect(power).toBeLessThan(1.1 * s.power)
  })
  it("smooths torque with twelve cylinders: the sum never goes negative under load", () => {
    const q = { intake: 2, exhaust: 1.6, fill: 0.95, fuel: true, advance: 25 }
    for (let th = 0; th < 720; th += 3) expect(totalTorque(s, cyls, th, q)).toBeGreaterThan(0)
  })
})

describe("the turbo", () => {
  it("spools toward its target as a lag, and settles", () => {
    const t = turbo()
    const seen: number[] = []
    for (let i = 0; i < 600; i++) {
      stepTurbo(s, t, 1 / 60, 4000, 0.6, 1)
      if (i % 60 === 0) seen.push(t.speed)
    }
    for (let i = 1; i < seen.length; i++) expect(seen[i]).toBeGreaterThan(seen[i - 1])
    const before = t.speed
    for (let i = 0; i < 600; i++) stepTurbo(s, t, 1 / 60, 4000, 0.6, 1)
    expect(Math.abs(t.speed - before) / before).toBeLessThan(0.01)
  })
  it("holds boost at the wastegate however hard it is pushed", () => {
    const t = turbo()
    for (let i = 0; i < 1200; i++) stepTurbo(s, t, 1 / 60, 4000, 2, 1)
    expect(t.boost).toBeLessThanOrEqual(gateAt(s, 4000) + 1e-6)
    expect(t.boost).toBeGreaterThan(gateAt(s, 4000) * 0.95)
    expect(t.gate).toBeGreaterThan(0)
    expect(boostAt(s, speedFor(s, 0.8))).toBeCloseTo(0.8, 9)
  })
  it("vents through the blow-off valve when the throttle shuts on boost", () => {
    const t = turbo()
    for (let i = 0; i < 600; i++) stepTurbo(s, t, 1 / 60, 4500, 1, 1)
    const on = t.boost
    stepTurbo(s, t, 1 / 60, 4500, 1, 0)
    expect(t.vent).toBeGreaterThan(0)
    for (let i = 0; i < 20; i++) stepTurbo(s, t, 1 / 60, 4500, 1, 0)
    expect(t.boost).toBeLessThan(on * 0.3)
  })
})

describe("the running engine", () => {
  const run = (e = sim(s), seconds: number, pedal?: number) => {
    if (pedal !== undefined) e.pedal = pedal
    for (let i = 0; i < seconds * 60; i++) step(s, e, 1 / 60)
    return e
  }
  it("cranks, catches and settles at idle", () => {
    const e = sim(s)
    start(e)
    expect(e.run).toBe("cranking")
    run(e, 8)
    expect(e.run).toBe("running")
    expect(Math.abs(e.rpm - s.idle)).toBeLessThan(40)
  })
  it("revs with the throttle, more throttle more rpm, and bounces off the limiter flat out", () => {
    const e = sim(s)
    start(e)
    run(e, 3)
    const at: number[] = []
    for (const p of [0.25, 0.5, 0.75]) at.push(run(e, 10, p).rpm)
    expect(at[0]).toBeLessThan(at[1])
    expect(at[1]).toBeLessThan(at[2])
    run(e, 6, 1)
    let top = 0,
      low = Infinity,
      cut = false
    for (let i = 0; i < 240; i++) {
      step(s, e, 1 / 60)
      top = Math.max(top, e.rpm)
      low = Math.min(low, e.rpm)
      cut ||= e.cut
    }
    expect(cut).toBe(true)
    expect(top).toBeLessThan(s.limiter + 120)
    expect(low).toBeGreaterThan(s.limiter - s.hysteresis - 250)
  })
  it("stops when asked", () => {
    const e = sim(s)
    start(e)
    run(e, 3)
    stop(e)
    run(e, 6)
    expect(e.run).toBe("off")
    expect(e.rpm).toBe(0)
  })
  it("turns the picture slowly at idle and faster with revs, and not at all when held", () => {
    const e = sim(s)
    start(e)
    run(e, 4)
    const a = e.theta
    run(e, 1)
    const idleTurn = e.theta - a
    run(e, 8, 1)
    const b = e.theta
    run(e, 1)
    expect(e.theta - b).toBeGreaterThan(idleTurn * 2)
    e.held = true
    const c = e.theta
    run(e, 1)
    expect(e.theta).toBe(c)
  })
})
