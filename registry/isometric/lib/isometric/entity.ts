import { camera, fit, project, unproject, type Camera, type Vec2, type Vec3 } from "./iso"
import { scene, type Drawable, type Stroke } from "./scene"
import { bag, el, loop, pointer, type Mount } from "./stage"

/**
 * Isometric — entities: interactive objects built from meshes, with named
 * parts you can point at, click, and reach from the keyboard.
 *
 * An entity is plain data and functions, with no DOM: it builds its state,
 * draws meshes for a frame, steps its animation, and answers activation. A
 * host turns it into something on screen: `entityMount` hosts one entity as
 * a figure, and the world hosts many side by side.
 */

/** What an entity can read and do while it draws, steps or reacts. */
export type Ctx = {
  /** The figure's own number for the current intensity. */
  value: number
  /** The part under the pointer or keyboard focus. */
  hover: string | null
  camera: Camera
  /** Writes the caption. */
  read(text: string): void
}

export type PointerInfo = {
  /** The pointer in viewBox units. */
  p: Vec2
  /** The ground point under it, in the entity's own units. */
  ground: [number, number]
  part: string | null
  down: boolean
  /** Where the press began, while a button is held. */
  from: Vec2 | null
}

export type Entity<S, P> = {
  /** How to frame it: the camera turn and the points that must fit in view. */
  view: { az?: number; k?: number; fit: Vec3[]; zoom?: number; at?: Vec2 }
  /** Part id → its name, in the order the arrow keys walk them. */
  parts: Record<string, string>
  init(props: P): S
  update?(s: S, props: P): void
  draw(s: S, out: (Drawable | Stroke)[], ctx: Ctx): void
  /** Advances by dt seconds. True while anything still moves. */
  step?(s: S, dt: number, ctx: Ctx, now: number): boolean
  /** A click, or Enter on a focused part. Returns the caption to show. */
  activate?(s: S, part: string, ctx: Ctx): string | void
  /** Every pointer move, press and release; null when the pointer leaves. Return true to keep a drag from becoming a click. */
  pointer?(s: S, e: PointerInfo | null, ctx: Ctx): boolean | void
  /** The caption at rest. */
  rest(s: S): string
}

/** Moves drawables by an offset: how a world places an entity. */
export function offset(items: (Drawable | Stroke)[], d: Vec3): (Drawable | Stroke)[] {
  const t = (p: Vec3): Vec3 => [p[0] + d[0], p[1] + d[1], p[2] + d[2]]
  return items.map((it) => ("pts" in it ? { ...it, pts: it.pts.map(t) } : { ...it, mesh: { v: it.mesh.v.map(t), f: it.mesh.f } }))
}

/** A camera that fits `pts` inside the 400 × 320 box with a margin. */
export function frame(view: Entity<unknown, unknown>["view"]): Camera {
  const c = camera(view.az ?? 45, view.k ?? 0.5, 1)
  const P = project(c)
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity
  for (const p of view.fit) {
    const [x, y] = P(p[0], p[1], p[2])
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y)
  }
  c.s = Math.min(340 / (x1 - x0 || 1), 264 / (y1 - y0 || 1)) * (view.zoom ?? 1)
  fit(c, view.fit, view.at?.[0] ?? 200, view.at?.[1] ?? 162)
  return c
}

/** Hosts one entity as a figure: the mount `createFigure` takes. */
export function entityMount<S, P>(entity: Entity<S, P>): Mount<P> {
  return ({ stage, svg, read, activated }, value, props) => {
    const b = bag()
    const s = entity.init(props)
    const cam = frame(entity.view as Entity<unknown, unknown>["view"])
    const order = Object.keys(entity.parts)
    const sc = scene(el("g", null, svg))
    let hover: string | null = null
    let focus = -1
    const ctx: Ctx = { value, hover: null, camera: cam, read: (t) => { read.textContent = t } }

    function render() {
      const out: (Drawable | Stroke)[] = []
      ctx.hover = hover
      entity.draw(s, out, ctx)
      if (hover) for (const it of out) if (it.part === hover) it.cls = `${it.cls ?? ""} accent`
      sc.render(cam, out)
    }

    const L = loop(stage, (dt, now) => {
      const moving = entity.step?.(s, dt, ctx, now) ?? false
      render()
      return moving
    })
    b.add(L.stop)
    read.textContent = entity.rest(s)

    function point(part: string | null) {
      if (part === hover) return
      hover = part
      read.textContent = part ? entity.parts[part] ?? part : entity.rest(s)
      stage.style.cursor = part && entity.activate ? "pointer" : ""
      L.wake()
    }
    function activate(part: string) {
      const caption = entity.activate?.(s, part, ctx)
      read.textContent = caption ?? entity.parts[part] ?? part
      activated?.(part)
      L.wake()
    }

    let from: Vec2 | null = null, dragged = false
    const info = (p: Vec2, down: boolean): PointerInfo => ({ p, ground: unproject(cam, p[0], p[1], 0), part: sc.pick(p), down, from })
    b.add(pointer(stage, {
      move: (p) => {
        const e = info(p, from !== null)
        if (from && Math.hypot(p[0] - from[0], p[1] - from[1]) > 6) dragged = true
        if (entity.pointer?.(s, e, ctx)) dragged = true
        point(e.part)
        L.wake()
      },
      down: (p) => {
        from = p
        dragged = false
        const e = info(p, true)
        if (entity.pointer?.(s, e, ctx)) dragged = true
        point(e.part)
        L.wake()
      },
      up: (p) => {
        const e = info(p, false)
        const wasDrag = dragged
        from = null
        dragged = false
        entity.pointer?.(s, e, ctx)
        if (!wasDrag && e.part) activate(e.part)
        L.wake()
      },
      leave: () => {
        from = null
        dragged = false
        entity.pointer?.(s, null, ctx)
        point(null)
      },
    }))

    // the keyboard walks the parts: arrows move, Enter or Space activates, Escape lets go
    const onKey = (e: KeyboardEvent) => {
      if (!order.length) return
      if (e.key === "ArrowRight" || e.key === "ArrowDown") focus = (focus + 1) % order.length
      else if (e.key === "ArrowLeft" || e.key === "ArrowUp") focus = (focus - 1 + order.length) % order.length
      else if ((e.key === "Enter" || e.key === " ") && focus >= 0) { e.preventDefault(); activate(order[focus]); return }
      else if (e.key === "Escape") { focus = -1; point(null); return }
      else return
      e.preventDefault()
      point(order[focus])
    }
    const onBlur = () => { focus = -1; point(null) }
    stage.addEventListener("keydown", onKey)
    stage.addEventListener("blur", onBlur)
    b.add(() => { stage.removeEventListener("keydown", onKey); stage.removeEventListener("blur", onBlur) })
    b.add(() => svg.replaceChildren())

    return {
      set: (v) => { ctx.value = v; L.wake() },
      props: (next) => { entity.update?.(s, next); L.wake() },
      destroy: b.dispose,
    }
  }
}
