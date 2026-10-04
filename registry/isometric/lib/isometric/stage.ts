import { round, type Camera, type Shape, type Vec2 } from "./iso"
import { setReducedMotion } from "./motion"

/**
 * Isometric — the DOM side every figure shares: svg nodes, one animation
 * loop for every figure on the page, the pointer, and tear-down.
 *
 * Nothing touches `window` at import, so the module is safe to evaluate in a
 * server render. The loop, the IntersectionObserver and the reduced-motion
 * query start with the first figure and stop with the last.
 */

/* ---------- the engine contract ---------- */

/** Where an engine writes its caption. */
export type Readout = { textContent: string | null }
export type Stage = { stage: HTMLElement; svg: SVGSVGElement; read: Readout }
export type Engine<P = object> = {
  /** A new intensity, already mapped to the engine's own number. */
  set(value: number): void
  /** New figure-specific props (data, for example). */
  props?(props: P): void
  destroy(): void
}
export type Mount<P = object> = (stage: Stage, value: number, props: P) => Engine<P>

/* ---------- svg ---------- */

const NS = "http://www.w3.org/2000/svg"
type Attrs = Record<string, string | number>

/** One svg element with its attributes, appended to `parent` when given. */
export function el<K extends keyof SVGElementTagNameMap>(tag: K, attrs?: Attrs | null, parent?: Element | null): SVGElementTagNameMap[K] {
  const node = document.createElementNS(NS, tag)
  if (attrs) for (const k in attrs) node.setAttribute(k, String(attrs[k]))
  if (parent) parent.appendChild(node)
  return node
}

/** A solid's group: its outline (`.edge`) and inner lines (`.inner`). */
export type Solid = { g: SVGGElement; outline: SVGPathElement; inner: SVGPathElement; last: string }
export function solid(parent: Element, cls = ""): Solid {
  const g = el("g", cls ? { class: cls } : null, parent)
  return { g, outline: el("path", { class: "edge" }, g), inner: el("path", { class: "inner" }, g), last: "" }
}

/** Writes a shape into a solid, skipping the DOM when nothing changed. */
export function draw(s: Solid, shape: Shape) {
  const key = shape.outline + shape.inner
  if (key === s.last) return
  s.last = key
  s.outline.setAttribute("d", shape.outline)
  s.inner.setAttribute("d", shape.inner)
}

/** A path with a class, for lines that are not solids. */
export const path = (parent: Element, cls: string, d = "") => el("path", { class: cls, d }, parent)

/** A dot lying on a horizontal plane: an ellipse squashed by the camera. */
export const dot = (parent: Element, c: Camera, r: number, cls = "dot") =>
  el("ellipse", { rx: round(r * c.s), ry: round(r * c.s * c.k), class: cls }, parent)
export function place(node: SVGElement, p: Vec2) {
  node.setAttribute("cx", String(round(p[0])))
  node.setAttribute("cy", String(round(p[1])))
}

/* ---------- one loop, asleep offscreen ---------- */

/** One frame: dt in seconds (at most 50ms), now in ms. Return true to ask for another. */
export type Tick = (dt: number, now: number) => boolean | void
export type Loop = { wake(): void; stop(): void }
type Entry = { node: Element; tick: Tick; visible: boolean; awake: boolean }

let entries: Entry[] = []
const byNode = new Map<Element, Entry>()
let raf = 0, last = 0
let io: IntersectionObserver | null = null
let motion: MediaQueryList | null = null

function frame(now: number) {
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000))
  last = now
  let any = false
  for (const e of entries.slice()) {
    if (!e.visible || !e.awake) continue
    e.awake = !!e.tick(dt, now)
    any ||= e.awake
  }
  raf = any ? requestAnimationFrame(frame) : 0
}

function wake(e: Entry) {
  e.awake = true
  if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame) }
}

const onMotion = () => { setReducedMotion(!!motion?.matches); entries.forEach(wake) }

function start() {
  if (io) return
  io = new IntersectionObserver((list) => {
    for (const item of list) {
      const e = byNode.get(item.target)
      if (!e) continue
      e.visible = item.isIntersecting
      if (e.visible) wake(e)
    }
  }, { rootMargin: "80px" })
  motion = matchMedia("(prefers-reduced-motion: reduce)")
  setReducedMotion(motion.matches)
  motion.addEventListener("change", onMotion)
}

function halt() {
  if (raf) cancelAnimationFrame(raf)
  raf = 0
  io?.disconnect(); io = null
  motion?.removeEventListener("change", onMotion); motion = null
}

/**
 * Joins the shared loop. The tick runs once now so the figure is drawn before
 * it is seen, then every frame while it is within 80px of the viewport and
 * keeps returning true.
 */
export function loop(node: Element, tick: Tick): Loop {
  start()
  const e: Entry = { node, tick, visible: false, awake: true }
  entries.push(e)
  byNode.set(node, e)
  io!.observe(node)
  tick(0, performance.now())
  let gone = false
  return {
    wake: () => { if (!gone) wake(e) },
    stop: () => {
      if (gone) return
      gone = true
      entries = entries.filter((x) => x !== e)
      if (byNode.get(node) === e) { byNode.delete(node); io?.unobserve(node) }
      if (!entries.length) halt()
    },
  }
}

/* ---------- pointer ---------- */

export type PointerHandlers = {
  /** The pointer in viewBox units (400 × 320). */
  move(p: Vec2, e: PointerEvent): void
  down?(p: Vec2, e: PointerEvent): void
  up?(p: Vec2, e: PointerEvent): void
  leave(): void
}

/**
 * Pointer input in viewBox units. A mouse leaving acts at once; a finger
 * lifting holds for 1.2s so a tap reads as a look, not a flash. Returns the
 * disposer.
 */
export function pointer(stage: HTMLElement, on: PointerHandlers): () => void {
  let timer = 0
  const at = (e: PointerEvent): Vec2 => {
    const r = stage.getBoundingClientRect()
    return [((e.clientX - r.left) / r.width) * 400, ((e.clientY - r.top) / r.height) * 320]
  }
  const move = (e: PointerEvent) => { clearTimeout(timer); on.move(at(e), e) }
  const down = (e: PointerEvent) => {
    clearTimeout(timer)
    if (e.pointerType !== "mouse") stage.releasePointerCapture?.(e.pointerId)
    if (on.down) on.down(at(e), e); else on.move(at(e), e)
  }
  const up = (e: PointerEvent) => on.up?.(at(e), e)
  const leave = (e: PointerEvent) => {
    clearTimeout(timer)
    timer = window.setTimeout(() => on.leave(), e.pointerType === "mouse" ? 0 : 1200)
  }
  stage.addEventListener("pointermove", move)
  stage.addEventListener("pointerdown", down)
  stage.addEventListener("pointerup", up)
  stage.addEventListener("pointerleave", leave)
  return () => {
    clearTimeout(timer)
    stage.removeEventListener("pointermove", move)
    stage.removeEventListener("pointerdown", down)
    stage.removeEventListener("pointerup", up)
    stage.removeEventListener("pointerleave", leave)
  }
}

/* ---------- tear-down ---------- */

/** Collects clean-ups so an engine's `destroy` is one call; runs them last first, once. */
export function bag() {
  let fns: Array<() => void> = []
  return {
    add(fn: () => void) { fns.push(fn) },
    dispose() {
      const list = fns
      fns = []
      for (let i = list.length - 1; i >= 0; i--) list[i]()
    },
  }
}
