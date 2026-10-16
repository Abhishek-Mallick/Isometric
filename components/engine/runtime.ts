import { canvasScene } from "@/registry/isometric/lib/isometric/canvas"
import { camera, clamp, type Camera, type Vec2, type Vec3 } from "@/registry/isometric/lib/isometric/iso"
import { reducedMotion, sequence, spring, stepAll, type Sequence, type Spring } from "@/registry/isometric/lib/isometric/motion"
import { toCamera, type Item } from "@/registry/isometric/lib/isometric/scene"
import { loop } from "@/registry/isometric/lib/isometric/stage"
import { inject } from "@/registry/isometric/lib/isometric/styles"

import { LEVELS, PART, PARTS, type PartId } from "@/anatomy/assembly"
import { advance, phase, type Charge } from "@/anatomy/cycle"
import { layout, wrap, type Cylinder } from "@/anatomy/kinematics"
import { build, geometry, type Anchor, type Frame, type Mode } from "@/anatomy/parts"
import { charge, sim, start, step, stop, type Pace, type Sim } from "@/anatomy/sim"
import type { EngineSpec } from "@/anatomy/spec"

import { injectEngine } from "./styles"

/**
 * The live engine on a canvas: the simulation, the camera, the explode
 * choreography, picking and the keyboard. React reads it through `onRead`
 * (about fifteen times a second, and at once on anything discrete) and
 * drives it through the returned handle; nothing here re-renders React per
 * frame.
 */

export type Snapshot = {
  run: Sim["run"]
  rpm: number
  pedal: number
  throttle: number
  /** Manifold pressure, bar absolute; boost, bar over outside air; turbo shaft speed, rpm. */
  map: number
  boost: number
  turbo: number
  gate: number
  venting: boolean
  torque: number
  power: number
  cut: boolean
  /** Display crank angle, 0…720. */
  theta: number
  held: boolean
  pace: Pace
  mode: Mode
  /** The mode being drawn: Exploded until the parts are home again. */
  drawn: Mode
  focus: PartId | null
  hover: PartId | null
  only: number
  /** How far apart the engine is, 0…1. */
  spread: number
  charge: Charge
  /** The cylinder that fired last. */
  fired: number
  /** Camera azimuth, degrees. */
  az: number
}

export type EngineHandle = {
  setMode(m: Mode): void
  setFocus(id: PartId | null): void
  setHover(id: PartId | null): void
  setOnly(n: number): void
  setPedal(v: number): void
  setPace(p: Pace): void
  /** Start when off, stop when running. */
  toggle(): void
  /** Hold the crank at an angle (degrees, 0…720), or let go with null. */
  scrub(theta: number | null): void
  /** A quarter turn of the camera, either way. */
  turn(dir: 1 | -1): void
  resetView(): void
  /** The frame as a standalone svg document. */
  svg(): string
  destroy(): void
}

const VIEW = { az: -38, tilt: 0.5 }
/** The order the keyboard walks the parts in: outside in, as they come off. */
const WALK = PARTS.slice()
  .sort((a, b) => a.level - b.level)
  .map((p) => p.id)

/** The points of a frame, thinned to one per 15 mm cell: enough to frame it, few enough to project every frame. */
function cloudOf(items: readonly Item[]): Vec3[] {
  const seen = new Set<string>(),
    out: Vec3[] = []
  const take = (p: Vec3) => {
    const k = `${Math.round(p[0] / 15)},${Math.round(p[1] / 15)},${Math.round(p[2] / 15)}`
    if (!seen.has(k)) {
      seen.add(k)
      out.push(p)
    }
  }
  for (const it of items) {
    if ("mesh" in it) it.mesh.v.forEach(take)
    else if ("pts" in it) it.pts.forEach(take)
  }
  return out
}

export function mountEngine(host: HTMLElement, overlay: SVGSVGElement, spec: EngineSpec, onRead: (s: Snapshot) => void): EngineHandle {
  inject(document)
  injectEngine(document)
  const cylinders: Cylinder[] = layout(spec)
  const g = geometry(spec, cylinders)
  const painter = canvasScene(host, { axes: g.banks.flatMap((b) => [b.axis, b.inward]) })
  const e = sim(spec)

  let mode: Mode = "xray"
  let focus: PartId | null = null,
    hover: PartId | null = null,
    only = 1
  const away = new Map<PartId, Spring>(PARTS.map((p) => [p.id, spring(0, 70, 11, 0.002)]))
  const springs = [...away.values()]
  let seq: Sequence | null = null
  const view = { az: spring(VIEW.az, 90, 19, 0.05), tilt: spring(VIEW.tilt, 90, 19, 0.0005), zoom: 1, pan: [0, 0] as Vec2 }
  const spin = e.turbos.map(() => 0)
  let heat = 0
  let dirty = true

  /* ---------- framing ---------- */

  const frameFor = (m: Mode, k: number, n = 1): Frame => ({
    theta: 0,
    throttle: 0,
    fuel: false,
    advance: 0,
    turbos: e.turbos.map(() => ({ spin: 0, gate: 0, vent: 0 })),
    heat: 0,
    away: () => k,
    mode: m,
    focus: null,
    hover: null,
    eye: [0, 0, 1],
    az: 0,
    only: n,
  })
  const clouds = new Map<string, Vec3[]>()
  const cloudFor = (m: Mode, n: number) => {
    const key = m === "cylinder" ? `c${n}` : m === "exploded" ? "x" : "a"
    let c = clouds.get(key)
    if (!c) {
      c = cloudOf(build(spec, cylinders, g, frameFor(m === "assembled" ? "xray" : m, m === "exploded" ? 1 : 0, n)).items)
      clouds.set(key, c)
    }
    return c
  }

  const spread = () => {
    let m = 0
    for (const s of springs) m = Math.max(m, Math.abs(s.x))
    return m
  }
  const drawn = (): Mode => (mode === "exploded" || spread() > 0.002 ? "exploded" : mode)

  /** Scale and centre (in unit-scale screen space) that fit what this mode draws, from the camera as it is now. */
  function target() {
    const [w, h] = painter.size()
    const az = (view.az.x * Math.PI) / 180,
      k = clamp(view.tilt.x, 0.2, 0.86),
      lift = Math.sqrt(1 - k * k)
    const cos = Math.cos(az),
      sin = Math.sin(az)
    let x0 = Infinity,
      x1 = -Infinity,
      y0 = Infinity,
      y1 = -Infinity
    for (const p of cloudFor(drawn() === "exploded" ? "exploded" : mode, only)) {
      const X = p[0] * cos - p[1] * sin,
        Y = (p[0] * sin + p[1] * cos) * k - p[2] * lift
      if (X < x0) x0 = X
      if (X > x1) x1 = X
      if (Y < y0) y0 = Y
      if (Y > y1) y1 = Y
    }
    // room for the title block above and the legend below
    const padX = Math.min(64, w * 0.07),
      padY = Math.min(84, h * 0.13)
    const s = Math.max(0.05, Math.min((w - 2 * padX) / (x1 - x0 || 1), (h - 2 * padY) / (y1 - y0 || 1)))
    return { s, mx: (x0 + x1) / 2, my: (y0 + y1) / 2 }
  }
  const fit = { s: 0, mx: 0, my: 0 }

  /** Eases the fit toward the target. True while it still moves. */
  function ease(dt: number) {
    const t = target()
    if (!fit.s || reducedMotion()) {
      Object.assign(fit, t)
      return false
    }
    const k = 1 - Math.exp(-dt * 5)
    const moving = Math.abs(t.s - fit.s) / t.s > 0.002 || Math.abs(t.mx - fit.mx) * t.s > 0.5 || Math.abs(t.my - fit.my) * t.s > 0.5
    if (moving) {
      fit.s += (t.s - fit.s) * k
      fit.mx += (t.mx - fit.mx) * k
      fit.my += (t.my - fit.my) * k
    } else Object.assign(fit, t)
    return moving
  }

  /** The camera for this frame: the fit, then zoom and pan. */
  function cam(): Camera {
    const [w, h] = painter.size()
    if (!fit.s) Object.assign(fit, target())
    const c = camera(view.az.x, clamp(view.tilt.x, 0.2, 0.86), fit.s * view.zoom)
    c.ox = w / 2 + view.pan[0] - c.s * fit.mx
    c.oy = h / 2 + view.pan[1] - c.s * fit.my
    return c
  }

  /* ---------- explode and reassemble ---------- */

  function explode(out: boolean) {
    // each level leaves after the one outside it; reassembly runs the other way
    const cues = PARTS.map((p, i) => ({
      spring: away.get(p.id)!,
      to: out ? 1 : 0,
      delay: (out ? p.level : LEVELS - p.level) * 0.2 + (i % 3) * 0.04,
    }))
    seq = sequence(cues)
  }

  /* ---------- a frame ---------- */

  const callouts = new Map<string, { g: SVGGElement; line: SVGLineElement; dot: SVGCircleElement; rect: SVGRectElement; text: SVGTextElement }>()
  const NS = "http://www.w3.org/2000/svg"
  function callout(key: string) {
    let c = callouts.get(key)
    if (!c) {
      const gEl = document.createElementNS(NS, "g")
      const line = document.createElementNS(NS, "line"),
        dot = document.createElementNS(NS, "circle")
      const rect = document.createElementNS(NS, "rect"),
        text = document.createElementNS(NS, "text")
      dot.setAttribute("r", "2.2")
      rect.setAttribute("rx", "3")
      gEl.append(line, dot, rect, text)
      overlay.appendChild(gEl)
      c = { g: gEl, line, dot, rect, text }
      callouts.set(key, c)
    }
    return c
  }

  /** Names on the parts: every part when exploded, else the isolated or hovered one. */
  function label(c: Camera, anchors: Anchor[]) {
    const eye = toCamera(c),
      cos = Math.cos(c.az),
      sin = Math.sin(c.az),
      lift = Math.sqrt(1 - c.k * c.k)
    const P = (p: Vec3): Vec2 => [c.ox + c.s * (p[0] * cos - p[1] * sin), c.oy + c.s * ((p[0] * sin + p[1] * cos) * c.k - p[2] * lift)]
    const apart = drawn() === "exploded" && spread() > 0.6
    // one anchor per part: the bank nearer the camera
    const best = new Map<PartId, Anchor>()
    for (const a of anchors) {
      const o = best.get(a.id)
      const d = a.at[0] * eye[0] + a.at[1] * eye[1] + a.at[2] * eye[2]
      if (!o || d > o.at[0] * eye[0] + o.at[1] * eye[1] + o.at[2] * eye[2]) best.set(a.id, a)
    }
    const want: { id: PartId; p: Vec2; focus: boolean }[] = []
    for (const [id, a] of best) {
      const lit = id === focus || id === hover
      if (!(apart && !focus) && !lit) continue
      want.push({ id, p: P(a.at), focus: lit })
    }
    // labels go to the side of the engine their part is on, each side top to bottom, pushed apart where they would collide
    const mid = want.length ? want.reduce((m, x) => m + x.p[0], 0) / want.length : 0
    const [w, h] = painter.size()
    const seen = new Set<string>()
    // a lone label (the hovered or isolated part) takes whichever side has room: side 0
    for (const side of want.length === 1 ? [0] : [-1, 1]) {
      const list = want.filter((x) => !side || (x.p[0] >= mid ? 1 : -1) === side).sort((a, b) => a.p[1] - b.p[1])
      let floor = 8
      for (const { id, p, focus: lit } of list) {
        const name = PART[id].name
        const tw = name.length * 6.6 + 14,
          th = 19
        const right = side ? side === 1 : p[0] < w * 0.6
        const x = clamp(right ? p[0] + 34 : p[0] - 34 - tw, 6, w - tw - 6)
        const y = clamp(Math.max(p[1] - 30, floor), 6, h - th - 6)
        floor = y + th + 5
        const el = callout(id)
        seen.add(id)
        el.g.setAttribute("class", lit ? "focus" : "")
        el.g.style.display = ""
        const ex = right ? x : x + tw,
          ey = y + th / 2
        el.line.setAttribute("x1", String(p[0]))
        el.line.setAttribute("y1", String(p[1]))
        el.line.setAttribute("x2", String(ex))
        el.line.setAttribute("y2", String(ey))
        el.dot.setAttribute("cx", String(p[0]))
        el.dot.setAttribute("cy", String(p[1]))
        el.rect.setAttribute("x", String(x))
        el.rect.setAttribute("y", String(y))
        el.rect.setAttribute("width", String(tw))
        el.rect.setAttribute("height", String(th))
        el.text.setAttribute("x", String(x + 7))
        el.text.setAttribute("y", String(y + 13))
        if (el.text.textContent !== name) el.text.textContent = name
      }
    }
    for (const [key, el] of callouts) if (!seen.has(key)) el.g.style.display = "none"
  }

  function render() {
    const c = cam()
    const q = charge(spec, e)
    const f: Frame = {
      theta: e.theta,
      throttle: e.throttle,
      // turned by hand, the cycle is shown as if it were running
      fuel: e.run === "off" ? true : q.fuel,
      advance: advance(spec, e.rpm),
      turbos: e.turbos.map((t, b) => ({ spin: spin[b], gate: t.gate, vent: t.vent })),
      heat,
      away: (id) => away.get(id)!.x,
      mode: drawn(),
      focus,
      hover,
      eye: toCamera(c),
      az: c.az,
      only,
    }
    const built = build(spec, cylinders, g, f)
    const items: Item[] = built.items
    // construction lines from each part's home to where it is now
    for (const a of built.anchors) {
      const d = Math.hypot(a.at[0] - a.home[0], a.at[1] - a.home[1], a.at[2] - a.home[2])
      if (d > 6 && (!focus || focus === a.id)) items.push({ pts: [a.home, a.at], cls: "construct", layer: 5 })
    }
    painter.render(c, items)
    label(c, built.anchors)
  }

  /* ---------- reading out ---------- */

  let lastRead = -1
  function read(now: number, force = false) {
    if (!force && now - lastRead < 66) return
    lastRead = now
    const boost = e.turbos.reduce((a, t) => a + t.boost, 0) / e.turbos.length
    const th = wrap(e.theta, 720)
    let fired = cylinders[0]
    for (const c of cylinders) if (phase(c, th) < phase(fired, th)) fired = c
    onRead({
      run: e.run,
      rpm: e.rpm,
      pedal: e.pedal,
      throttle: e.throttle,
      map: e.map,
      boost,
      turbo: e.turbos.reduce((a, t) => a + t.speed, 0) / e.turbos.length,
      gate: Math.max(...e.turbos.map((t) => t.gate)),
      venting: e.turbos.some((t) => t.vent > 0),
      torque: e.torque,
      power: e.power,
      cut: e.cut,
      theta: th,
      held: e.held,
      pace: e.pace,
      mode,
      drawn: drawn(),
      focus,
      hover,
      only,
      spread: spread(),
      charge: charge(spec, e),
      fired: fired.n,
      az: wrap(view.az.x, 360),
    })
  }

  /* ---------- the loop ---------- */

  const tick = (dt: number, now: number) => {
    let busy = false
    if (e.run !== "off") {
      const before = e.theta
      step(spec, e, dt)
      // with reduced motion the engine runs and reads out, but the picture holds still
      if (reducedMotion() && !e.held) e.theta = before
      busy = true
    }
    if (!reducedMotion() && !e.held)
      e.turbos.forEach((t, b) => {
        if (t.speed < 1) return
        // the shaft's real speed is far past any screen; show its spin rising with it
        spin[b] += dt * Math.PI * 2 * Math.min(5, 0.4 + (4.6 * t.speed) / spec.turbo.max)
        busy = true
      })
    const glow = clamp(0.1 + (0.9 * Math.max(0, e.power)) / spec.power, 0, 1) * (e.run === "running" ? 1 : 0)
    if (Math.abs(glow - heat) > 0.01) {
      heat += (glow - heat) * (1 - Math.exp(-dt / 2.5))
      busy = true
    }
    if (seq) {
      if (!seq.step(dt)) seq = null
      busy = true
    }
    if (stepAll([view.az, view.tilt], dt)) busy = true
    if (ease(dt)) busy = true
    if (busy || dirty) {
      render()
      dirty = false
    }
    read(now, !busy)
    return busy || e.run !== "off"
  }
  const runner = loop(host, tick)
  const wake = (now = false) => {
    dirty = true
    runner.wake()
    if (now) read(performance.now(), true)
  }

  /* ---------- pointer: orbit, pan, zoom, hover, click to isolate ---------- */

  const local = (ev: PointerEvent | WheelEvent | MouseEvent): Vec2 => {
    const r = host.getBoundingClientRect()
    return [ev.clientX - r.left, ev.clientY - r.top]
  }
  let drag: { id: number; at: Vec2; az: number; tilt: number; pan: Vec2; moved: boolean; panning: boolean } | null = null

  const onDown = (ev: PointerEvent) => {
    if (ev.button > 2) return
    host.setPointerCapture(ev.pointerId)
    drag = { id: ev.pointerId, at: local(ev), az: view.az.to, tilt: view.tilt.to, pan: [...view.pan], moved: false, panning: ev.shiftKey || ev.button !== 0 }
  }
  const onMove = (ev: PointerEvent) => {
    const p = local(ev)
    if (drag && drag.id === ev.pointerId) {
      const dx = p[0] - drag.at[0],
        dy = p[1] - drag.at[1]
      if (!drag.moved && Math.hypot(dx, dy) > 4) {
        drag.moved = true
        host.style.cursor = "grabbing"
      }
      if (drag.moved) {
        if (drag.panning) view.pan = [drag.pan[0] + dx, drag.pan[1] + dy]
        else {
          view.az.to = view.az.x = drag.az + dx * 0.35
          view.tilt.to = view.tilt.x = clamp(drag.tilt + dy * 0.0028, 0.2, 0.86)
          view.az.v = view.tilt.v = 0
        }
        wake()
      }
      return
    }
    const id = (painter.pick(p) as PartId | null) ?? null
    host.style.cursor = id ? "pointer" : "grab"
    if (id !== hover) {
      hover = id
      wake(true)
    }
  }
  const onUp = (ev: PointerEvent) => {
    if (!drag || drag.id !== ev.pointerId) return
    const was = drag
    drag = null
    host.style.cursor = "grab"
    if (was.moved || ev.button !== 0) return
    const id = (painter.pick(local(ev)) as PartId | null) ?? null
    focus = id && id !== focus ? id : null
    wake(true)
  }
  const onLeave = () => {
    if (!drag && hover) {
      hover = null
      wake(true)
    }
  }
  const onWheel = (ev: WheelEvent) => {
    ev.preventDefault()
    const p = local(ev),
      [w, h] = painter.size()
    const z0 = view.zoom,
      z1 = clamp(z0 * Math.exp(-ev.deltaY * 0.0016), 0.6, 4.5)
    // zoom about the pointer: the point under it stays put
    const k = z1 / z0
    view.pan = [p[0] - w / 2 - (p[0] - w / 2 - view.pan[0]) * k, p[1] - h / 2 - (p[1] - h / 2 - view.pan[1]) * k]
    view.zoom = z1
    wake()
  }
  const onDouble = () => handle.resetView()
  const noMenu = (ev: Event) => ev.preventDefault()

  host.addEventListener("pointerdown", onDown)
  host.addEventListener("pointermove", onMove)
  host.addEventListener("pointerup", onUp)
  host.addEventListener("pointercancel", onUp)
  host.addEventListener("pointerleave", onLeave)
  host.addEventListener("wheel", onWheel, { passive: false })
  host.addEventListener("dblclick", onDouble)
  host.addEventListener("contextmenu", noMenu)
  host.style.cursor = "grab"

  /* ---------- keyboard ---------- */

  const onKey = (ev: KeyboardEvent) => {
    if (ev.metaKey || ev.ctrlKey || ev.altKey) return
    const k = ev.key
    const modes: Record<string, Mode> = { "1": "assembled", "2": "xray", "3": "exploded", "4": "cylinder" }
    let used = true
    if (modes[k]) handle.setMode(modes[k])
    else if (k === "x" || k === "X") handle.setMode(mode === "xray" ? "assembled" : "xray")
    else if (k === " ") handle.toggle()
    else if (k === "q" || k === "Q") handle.turn(-1)
    else if (k === "e" || k === "E") handle.turn(1)
    else if (k === "ArrowRight" || k === "ArrowLeft") {
      const i = hover ? WALK.indexOf(hover) : -1,
        n = WALK.length,
        fwd = k === "ArrowRight"
      hover = WALK[i < 0 ? (fwd ? 0 : n - 1) : (i + (fwd ? 1 : n - 1)) % n]
      wake(true)
    } else if (k === "ArrowUp" || k === "ArrowDown") handle.setPedal(clamp(Math.round((e.pedal + (k === "ArrowUp" ? 0.1 : -0.1)) * 10) / 10, 0, 1))
    else if (k === "Enter") {
      if (hover) {
        focus = hover === focus ? null : hover
        wake(true)
      }
    } else if (k === "Escape") {
      if (focus || hover) {
        focus = null
        hover = null
        wake(true)
      } else used = false
    } else if (k === "[" || k === "]") handle.setOnly(((only - 1 + (k === "]" ? 1 : cylinders.length - 1)) % cylinders.length) + 1)
    else if (k === "r" || k === "R") handle.resetView()
    else used = false
    if (used) ev.preventDefault()
  }
  host.addEventListener("keydown", onKey)

  const resize = new ResizeObserver(() => {
    painter.resize()
    wake()
  })
  resize.observe(host)

  const handle: EngineHandle = {
    setMode(m) {
      if (m === mode) return
      const was = mode
      mode = m
      if (m === "exploded") explode(true)
      else if (was === "exploded") explode(false)
      wake(true)
    },
    setFocus(id) {
      focus = id
      wake(true)
    },
    setHover(id) {
      if (id !== hover) {
        hover = id
        wake(true)
      }
    },
    setOnly(n) {
      only = clamp(Math.round(n), 1, cylinders.length)
      wake(true)
    },
    setPedal(v) {
      e.pedal = clamp(v, 0, 1)
      wake(true)
    },
    setPace(p) {
      e.pace = p
      wake(true)
    },
    toggle() {
      if (e.run === "off" || e.run === "stopping") {
        e.held = false
        start(e)
      } else stop(e)
      wake(true)
    },
    scrub(theta) {
      if (theta === null) e.held = false
      else {
        e.held = true
        // keep the angle's turn count so the picture does not jump a revolution
        const base = e.theta - wrap(e.theta, 720)
        e.theta = base + wrap(theta, 720)
      }
      wake(true)
    },
    turn(dir) {
      view.az.to = Math.round((view.az.to + dir * 90 - VIEW.az) / 90) * 90 + VIEW.az
      wake(true)
    },
    resetView() {
      view.az.to = VIEW.az + Math.round((view.az.x - VIEW.az) / 360) * 360
      view.tilt.to = VIEW.tilt
      view.zoom = 1
      view.pan = [0, 0]
      wake(true)
    },
    svg: () => painter.svg(),
    destroy() {
      runner.stop()
      resize.disconnect()
      host.removeEventListener("pointerdown", onDown)
      host.removeEventListener("pointermove", onMove)
      host.removeEventListener("pointerup", onUp)
      host.removeEventListener("pointercancel", onUp)
      host.removeEventListener("pointerleave", onLeave)
      host.removeEventListener("wheel", onWheel)
      host.removeEventListener("dblclick", onDouble)
      host.removeEventListener("contextmenu", noMenu)
      host.removeEventListener("keydown", onKey)
      for (const c of callouts.values()) c.g.remove()
      painter.destroy()
    },
  }
  return handle
}
