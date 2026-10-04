"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { block, MATERIAL, type BlockType } from "@/registry/isometric/lib/isometric/blocks"
import type { Ctx, Entity, PointerInfo } from "@/registry/isometric/lib/isometric/entity"
import { camera, fit, project, scale as fromIntensity, unproject, type Camera, type Vec2, type Vec3 } from "@/registry/isometric/lib/isometric/iso"
import { pane } from "@/registry/isometric/lib/isometric/mesh"
import { scene, toCamera, type Drawable, type Stroke } from "@/registry/isometric/lib/isometric/scene"
import { loop } from "@/registry/isometric/lib/isometric/stage"
import { inject } from "@/registry/isometric/lib/isometric/styles"
import { blockEntity } from "@/registry/isometric/ui/isometric/block"
import { chestEntity } from "@/registry/isometric/ui/isometric/chest"
import { churchEntity } from "@/registry/isometric/ui/isometric/church"
import { heartEntity } from "@/registry/isometric/ui/isometric/heart"
import { Hotbar } from "@/registry/isometric/ui/isometric/hotbar"
import { IsoButton } from "@/registry/isometric/ui/isometric/iso-button"
import { pcCaseEntity } from "@/registry/isometric/ui/isometric/pc-case"
import { pulleyEntity } from "@/registry/isometric/ui/isometric/pulley"
import { reactorEntity } from "@/registry/isometric/ui/isometric/reactor"
import { torchEntity } from "@/registry/isometric/ui/isometric/torch"
import { treeEntity } from "@/registry/isometric/ui/isometric/tree"

/**
 * World — a small isometric town where everything works: the church, a
 * reactor in the square, a pulley in the workshop yard, a PC, a heart in the
 * garden, trees, chests and torches, each the same object as its figure.
 * Drag to look around, scroll or use + and − to zoom, and switch on Build to
 * place blocks from the hotbar (Shift+click or right-click mines them).
 * Every object is also listed as a button, which is the keyboard's way in.
 */

const N = 20, B = 8

// Each object as placed: its entity, the figure's intensity range, how big, and where its origin goes.
type Placement = { key: string; title: string; entity: Entity<any, any>; range: readonly [number, number, number]; size: number; at: Vec3; props?: object }

const LEVEL = B
const PLACES: Placement[] = [
  { key: "church", title: "Church", entity: churchEntity, range: [0.4, 0.8, 1.3], size: 0.52, at: [2.5 * B, 11.6 * B, LEVEL] },
  { key: "reactor", title: "Reactor", entity: reactorEntity, range: [0.3, 1, 2.2], size: 0.34, at: [10.5 * B, 10.5 * B, LEVEL] },
  { key: "pulley", title: "Pulley", entity: pulleyEntity, range: [0.6, 1, 1.6], size: 0.36, at: [15 * B, 4.5 * B, LEVEL] },
  { key: "pc", title: "PC Case", entity: pcCaseEntity, range: [6, 10, 14], size: 0.38, at: [15 * B, 13.5 * B, LEVEL], props: { on: true } },
  { key: "heart", title: "Heart", entity: heartEntity, range: [48, 72, 120], size: 0.38, at: [7 * B, 5.5 * B, LEVEL] },
  { key: "chest", title: "Chest", entity: chestEntity, range: [0, 4, 10], size: 0.42, at: [12.5 * B, 17 * B, LEVEL] },
  { key: "ore", title: "Ore block", entity: blockEntity, range: [6, 4, 2], size: 0.34, at: [17.5 * B, 12.5 * B, LEVEL], props: { type: "ore" } },
  { key: "tree-1", title: "Tree", entity: treeEntity, range: [0.3, 1, 2], size: 0.5, at: [4.5 * B, 8 * B, LEVEL] },
  { key: "tree-2", title: "Tree", entity: treeEntity, range: [0.3, 1, 2], size: 0.5, at: [9 * B, 15.5 * B, LEVEL] },
  { key: "tree-3", title: "Tree", entity: treeEntity, range: [0.3, 1, 2], size: 0.5, at: [17.5 * B, 17.5 * B, LEVEL] },
  ...[[8.6, 8.6], [12.4, 8.6], [8.6, 12.4], [12.4, 12.4]].map(([x, y], i): Placement => ({ key: `torch-${i + 1}`, title: "Torch", entity: torchEntity, range: [0, 1, 2.5], size: 0.3, at: [x * B, y * B, LEVEL] })),
]

/** The ground: hills in the far corner, sand roads that cross at the square, grass elsewhere. */
function ground(i: number, j: number): { h: number; type: BlockType } {
  const road = i === 10 || j === 10 || (i >= 9 && i <= 11 && j >= 9 && j <= 11)
  if (road) return { h: 1, type: "sand" }
  const far = i + j
  if (far < 7) return { h: 1 + Math.round(2.2 * (1 - far / 7) + 0.4 * Math.sin(i * 1.7 + j * 2.3)), type: far < 3 ? "stone" : "grass" }
  if (i === 0 || j === 0) return { h: 2, type: "grass" }
  return { h: 1, type: "grass" }
}

type Live = Placement & { state: any; layer: number }

export type WorldProps = Omit<React.ComponentProps<"div">, "children"> & {
  /** Start in build mode. */
  defaultBuild?: boolean
  /** Called when an object's part is activated: the object's key and the part. */
  onActivate?: (object: string, part: string) => void
}

const BAR = [
  { type: "grass", count: 64 }, { type: "stone", count: 64 }, { type: "planks", count: 64 }, { type: "log", count: 64 },
  { type: "glass", count: 64 }, { type: "sand", count: 64 }, { type: "ore", count: 16 }, { type: "leaves", count: 64 }, { type: "dirt", count: 64 },
] as const

function World({ defaultBuild = false, onActivate, className, ...props }: WorldProps) {
  const host = React.useRef<HTMLDivElement | null>(null)
  const [caption, setCaption] = React.useState("Drag to look around · scroll to zoom")
  const [build, setBuild] = React.useState(defaultBuild)
  const [night, setNight] = React.useState(false)
  const [slot, setSlot] = React.useState(0)
  const api = React.useRef<{ zoom(f: number): void; reset(): void; focus(key: string | null): void; activate(key: string): void } | null>(null)
  const live = React.useRef({ build, slot, onActivate })
  live.current = { build, slot, onActivate }

  React.useLayoutEffect(() => {
    const el = host.current!
    inject(document)
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
    svg.setAttribute("aria-hidden", "true")
    el.prepend(svg)
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g")
    svg.appendChild(g)
    const sc = scene(g)
    const c: Camera = camera(45, 0.5, 1)
    const eye = toCamera(c)
    const depth = (p: Vec3) => p[0] * eye[0] + p[1] * eye[1] + p[2] * eye[2]
    let w = 0, h = 0

    const objects: Live[] = PLACES.map((p) => ({ ...p, state: p.entity.init(p.props ?? {}), layer: depth([p.at[0], p.at[1], p.at[2]]) }))
    const placed = new Map<string, BlockType[]>()
    let hover: { key: string; part: string } | null = null
    let speaker: string | null = null

    const value = (o: Live) => fromIntensity(0.5, o.range)
    const ctxOf = (o: Live): Ctx => ({
      value: value(o),
      hover: hover?.key === o.key ? hover.part : null,
      camera: { ...c, s: c.s * o.size },
      read: (t) => { if (speaker === o.key || hover?.key === o.key) setCaption(`${o.title}: ${t}`) },
    })

    function frame() {
      w = el.clientWidth
      h = el.clientHeight
      svg.setAttribute("viewBox", `0 0 ${w} ${h}`)
      const corners: Vec3[] = [[0, 0, 0], [N * B, 0, 0], [0, N * B, 0], [N * B, N * B, 0], [0, 0, 5 * B], [N * B * 0.2, N * B * 0.6, 9 * B]]
      const P = project(camera(45, c.k, 1))
      const xs = corners.map((p) => P(p[0], p[1], p[2])[0]), ys = corners.map((p) => P(p[0], p[1], p[2])[1])
      c.s = Math.min((w * 0.92) / (Math.max(...xs) - Math.min(...xs)), (h * 0.9) / (Math.max(...ys) - Math.min(...ys)))
      fit(c, corners, w / 2, h / 2)
    }

    function draw() {
      const out: (Drawable | Stroke)[] = []
      // terrain: each column's lid, and only the sides its neighbours leave open
      const height = (i: number, j: number) => (i < 0 || j < 0 || i >= N || j >= N ? 0 : ground(i, j).h)
      for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
        const { h: hh, type } = ground(i, j)
        const x0 = i * B, y0 = j * B, x1 = x0 + B, y1 = y0 + B, z = hh * B
        const part = `t:${i},${j}`
        // flat ground never hides what stands on it, so it paints before every object
        const layer = hh <= 1 ? -1e6 + depth([x0, y0, 0]) : depth([x0 + B / 2, y0 + B / 2, z / 2])
        const top = type === "grass" ? MATERIAL.grass.tint : MATERIAL[type].tint
        const side = type === "grass" ? MATERIAL.dirt.tint : MATERIAL[type].tint
        // ground lids are outlined faintly, so the grid stays behind the objects
        out.push({ mesh: pane([[x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z]], [0, 0, 1]), tint: top, shade: true, part, layer, cls: "lo" })
        const nx = height(i + 1, j), ny = height(i, j + 1)
        if (nx < hh) out.push({ mesh: pane([[x1, y0, nx * B], [x1, y1, nx * B], [x1, y1, z], [x1, y0, z]], [1, 0, 0]), tint: side, shade: true, part, layer })
        if (ny < hh) out.push({ mesh: pane([[x0, y1, ny * B], [x1, y1, ny * B], [x1, y1, z], [x0, y1, z]], [0, 1, 0]), tint: side, shade: true, part, layer })
        const stack = placed.get(`${i},${j}`)
        stack?.forEach((t, k) => {
          for (const d of block(t, x0, y0, z + k * B, B, { part })) out.push({ ...d, layer: depth([x0 + B / 2, y0 + B / 2, z + k * B + B / 2]) })
        })
        if (hover?.key === "terrain" && hover.part === part) out.push({ pts: [[x0, y0, z + (stack?.length ?? 0) * B + 0.2], [x1, y0, z + (stack?.length ?? 0) * B + 0.2], [x1, y1, z + (stack?.length ?? 0) * B + 0.2], [x0, y1, z + (stack?.length ?? 0) * B + 0.2]], closed: true, cls: "accent", layer: 1e6 })
      }
      // objects, each scaled into place and painted as a whole
      for (const o of objects) {
        const items: (Drawable | Stroke)[] = []
        o.entity.draw(o.state, items, ctxOf(o))
        const t = (p: Vec3): Vec3 => [o.at[0] + p[0] * o.size, o.at[1] + p[1] * o.size, o.at[2] + p[2] * o.size]
        for (const it of items) {
          const part = it.part ? `e:${o.key}:${it.part}` : undefined
          const lit = hover?.key === o.key && it.part === hover.part ? " accent" : ""
          if ("pts" in it) out.push({ ...it, pts: it.pts.map(t), part, cls: `${it.cls ?? ""}${lit}`, layer: o.layer })
          else out.push({ ...it, mesh: { ...it.mesh, v: it.mesh.v.map(t) }, part, cls: `${it.cls ?? ""}${lit}`, bias: (it.bias ?? 0) * o.size, layer: o.layer })
        }
      }
      sc.render(c, out)
    }

    const L = loop(el, (dt, now) => {
      let moving = false
      for (const o of objects) if (o.entity.step?.(o.state, dt, ctxOf(o), now)) moving = true
      draw()
      return moving
    })

    /* ---------- input ---------- */

    const at = (e: PointerEvent | WheelEvent): Vec2 => {
      const r = el.getBoundingClientRect()
      return [e.clientX - r.left, e.clientY - r.top]
    }
    const parse = (part: string | null) => {
      if (!part) return null
      if (part.startsWith("t:")) return { key: "terrain", part }
      const [, key, ...rest] = part.split(":")
      return { key, part: rest.join(":") }
    }
    const info = (o: Live, p: Vec2, down: boolean, from: Vec2 | null, part: string | null): PointerInfo => {
      const [gx, gy] = unproject(c, p[0], p[1], o.at[2])
      return { p, ground: [(gx - o.at[0]) / o.size, (gy - o.at[1]) / o.size], part, down, from }
    }
    const find = (key: string) => objects.find((o) => o.key === key)

    function setHover(next: { key: string; part: string } | null, p: Vec2 | null) {
      const before = hover
      hover = next
      if (before && before.key !== next?.key) { const o = find(before.key); if (o) o.entity.pointer?.(o.state, null, ctxOf(o)) }
      if (next && next.key !== "terrain" && p) {
        const o = find(next.key)!
        o.entity.pointer?.(o.state, info(o, p, false, null, next.part), ctxOf(o))
        if (before?.part !== next.part || before?.key !== next.key) setCaption(`${o.title}: ${o.entity.parts[next.part] ?? next.part}`)
      } else if (next?.key === "terrain" && live.current.build && (before?.key !== "terrain" || before.part !== next.part)) {
        setCaption(`Place ${MATERIAL[BAR[live.current.slot].type].label.toLowerCase()} · Shift+click to mine`)
      }
      el.style.cursor = next && (next.key !== "terrain" || live.current.build) ? "pointer" : "grab"
      L.wake()
    }

    function activate(key: string, part: string) {
      const o = find(key)
      if (!o) return
      speaker = key
      const caption = o.entity.activate?.(o.state, part, ctxOf(o))
      setCaption(`${o.title}: ${caption ?? o.entity.parts[part] ?? part}`)
      live.current.onActivate?.(key, part)
      L.wake()
    }

    function edit(part: string, mine: boolean) {
      const [i, j] = part.slice(2).split(",").map(Number)
      const k = `${i},${j}`
      const stack = placed.get(k) ?? []
      if (mine) {
        if (!stack.length) { setCaption("Only blocks you placed can be mined"); return }
        const t = stack.pop()!
        setCaption(`Mined ${MATERIAL[t].label.toLowerCase()}`)
      } else {
        if (stack.length >= 6) { setCaption("That stack is as tall as it goes"); return }
        const t = BAR[live.current.slot].type
        stack.push(t)
        setCaption(`Placed ${MATERIAL[t].label.toLowerCase()} · ${stack.length} high`)
      }
      if (stack.length) placed.set(k, stack); else placed.delete(k)
      L.wake()
    }

    // a press on an object that listens to the pointer may become its drag (the pulley's rope); otherwise a drag pans
    let from: Vec2 | null = null, last: Vec2 | null = null, panned = false, held = false
    let dragging: Live | null = null, pressed: ReturnType<typeof parse> = null
    const down = (e: PointerEvent) => {
      el.focus({ preventScroll: true })
      from = last = at(e)
      panned = held = false
      pressed = parse(sc.pick(from))
      dragging = null
      if (pressed && pressed.key !== "terrain") {
        const o = find(pressed.key)!
        if (o.entity.pointer) { dragging = o; o.entity.pointer(o.state, info(o, from, true, from, pressed.part), ctxOf(o)) }
      }
      el.setPointerCapture(e.pointerId)
    }
    const move = (e: PointerEvent) => {
      const p = at(e)
      if (from && last) {
        if (dragging && !panned && dragging.entity.pointer?.(dragging.state, info(dragging, p, true, from, pressed?.part ?? null), ctxOf(dragging))) {
          held = true
          speaker = dragging.key
          L.wake()
        } else if (!held) {
          if (Math.hypot(p[0] - from[0], p[1] - from[1]) > 5) panned = true
          if (panned) { c.ox += p[0] - last[0]; c.oy += p[1] - last[1]; el.style.cursor = "grabbing"; L.wake() }
        }
        last = p
        return
      }
      setHover(parse(sc.pick(p)), p)
    }
    const up = (e: PointerEvent) => {
      const p = at(e)
      if (dragging) dragging.entity.pointer?.(dragging.state, info(dragging, p, false, null, pressed?.part ?? null), ctxOf(dragging))
      if (!panned && !held && pressed) {
        if (pressed.key === "terrain") { if (live.current.build) edit(pressed.part, e.shiftKey || e.button === 2) }
        else activate(pressed.key, pressed.part)
      }
      from = last = null
      dragging = null
      el.releasePointerCapture?.(e.pointerId)
      setHover(parse(sc.pick(p)), p)
    }
    const leave = () => { if (!from) setHover(null, null) }
    const zoomAt = (f: number, p: Vec2) => {
      const s = Math.max(0.6, Math.min(8, c.s * f))
      const k = s / c.s
      c.ox = p[0] - (p[0] - c.ox) * k
      c.oy = p[1] - (p[1] - c.oy) * k
      c.s = s
      L.wake()
    }
    const wheel = (e: WheelEvent) => { e.preventDefault(); zoomAt(Math.exp(-e.deltaY * 0.0015), at(e)) }
    const menu = (e: Event) => { if (live.current.build) e.preventDefault() }
    const key = (e: KeyboardEvent) => {
      const step = 40
      if (e.key === "ArrowLeft") c.ox += step
      else if (e.key === "ArrowRight") c.ox -= step
      else if (e.key === "ArrowUp") c.oy += step
      else if (e.key === "ArrowDown") c.oy -= step
      else if (e.key === "+" || e.key === "=") zoomAt(1.2, [w / 2, h / 2])
      else if (e.key === "-") zoomAt(1 / 1.2, [w / 2, h / 2])
      else return
      e.preventDefault()
      L.wake()
    }
    el.addEventListener("pointerdown", down)
    el.addEventListener("pointermove", move)
    el.addEventListener("pointerup", up)
    el.addEventListener("pointerleave", leave)
    el.addEventListener("wheel", wheel, { passive: false })
    el.addEventListener("contextmenu", menu)
    el.addEventListener("keydown", key)
    const ro = new ResizeObserver(() => { frame(); L.wake() })
    ro.observe(el)
    frame()

    api.current = {
      zoom: (f) => zoomAt(f, [w / 2, h / 2]),
      reset: () => { frame(); L.wake() },
      focus: (k) => { setHover(k ? { key: k, part: Object.keys(find(k)!.entity.parts)[0] } : null, null); if (k) setCaption(`${find(k)!.title}: ${find(k)!.entity.rest(find(k)!.state)}`) },
      activate: (k) => activate(k, Object.keys(find(k)!.entity.parts)[0]),
    }

    return () => {
      L.stop()
      ro.disconnect()
      el.removeEventListener("pointerdown", down)
      el.removeEventListener("pointermove", move)
      el.removeEventListener("pointerup", up)
      el.removeEventListener("pointerleave", leave)
      el.removeEventListener("wheel", wheel)
      el.removeEventListener("contextmenu", menu)
      el.removeEventListener("keydown", key)
      svg.remove()
      api.current = null
    }
  }, [])

  const names = React.useMemo(() => {
    const seen = new Map<string, number>()
    return PLACES.map((p) => {
      const n = (seen.get(p.title) ?? 0) + 1
      seen.set(p.title, n)
      return PLACES.filter((q) => q.title === p.title).length > 1 ? `${p.title} ${n}` : p.title
    })
  }, [])

  return (
    <div data-slot="world" className={cn("grid gap-3 lg:grid-cols-[minmax(0,1fr)_200px]", night && "dark", className)} {...props}>
      <div className="relative min-h-[420px] overflow-hidden rounded-lg border bg-background text-foreground">
        <div
          ref={host}
          data-iso="world"
          role="application"
          aria-label="Isometric world. Drag or use the arrow keys to look around, plus and minus to zoom. Use the object list to operate objects."
          tabIndex={0}
          className="absolute inset-0 outline-none focus-visible:ring-2 focus-visible:ring-ring"
          style={{ aspectRatio: "auto", touchAction: "none" }}
        />
        <div className="pointer-events-none absolute inset-x-3 top-3 flex flex-wrap items-start justify-between gap-2">
          <p aria-live="polite" className="max-w-[60%] rounded-md border bg-background/85 px-2.5 py-1.5 font-mono text-[12px] text-muted-foreground backdrop-blur">{caption}</p>
          <div className="pointer-events-auto flex flex-wrap gap-2">
            <IsoButton size="sm" depth={3} variant={build ? "solid" : "default"} aria-pressed={build} onClick={() => setBuild((b) => !b)}>Build</IsoButton>
            <IsoButton size="sm" depth={3} aria-pressed={night} onClick={() => setNight((n) => !n)}>{night ? "Day" : "Night"}</IsoButton>
            <IsoButton size="icon" depth={3} aria-label="Zoom in" onClick={() => api.current?.zoom(1.25)} className="[&>span]:size-8">+</IsoButton>
            <IsoButton size="icon" depth={3} aria-label="Zoom out" onClick={() => api.current?.zoom(0.8)} className="[&>span]:size-8">−</IsoButton>
            <IsoButton size="sm" depth={3} onClick={() => api.current?.reset()}>Reset view</IsoButton>
          </div>
        </div>
        {build ? (
          <div className="absolute inset-x-0 bottom-3 flex justify-center">
            <Hotbar items={[...BAR]} value={slot} onValueChange={setSlot} aria-label="Block to place" />
          </div>
        ) : null}
      </div>
      <nav aria-label="Objects in the world" className="grid content-start gap-1 text-sm">
        <p className="px-1 pb-1 text-xs text-muted-foreground">Objects</p>
        {PLACES.map((p, i) => (
          <button
            key={p.key}
            type="button"
            onClick={() => api.current?.activate(p.key)}
            onMouseEnter={() => api.current?.focus(p.key)}
            onFocus={() => api.current?.focus(p.key)}
            onMouseLeave={() => api.current?.focus(null)}
            onBlur={() => api.current?.focus(null)}
            className="cursor-pointer rounded-md px-2.5 py-1.5 text-left text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:bg-muted focus-visible:text-foreground focus-visible:outline-none"
          >
            {names[i]}
          </button>
        ))}
      </nav>
    </div>
  )
}

export { World }
