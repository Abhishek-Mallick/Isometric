"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { block, MATERIAL, type BlockType } from "@/registry/isometric/lib/isometric/blocks"
import type { Ctx, Entity, PointerInfo } from "@/registry/isometric/lib/isometric/entity"
import { camera, fit, project, scale as fromIntensity, unproject, type Camera, type Vec2, type Vec3 } from "@/registry/isometric/lib/isometric/iso"
import { pane } from "@/registry/isometric/lib/isometric/mesh"
import { compose, scene, toCamera, type Item, type Painter } from "@/registry/isometric/lib/isometric/scene"
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

const N = 20,
  B = 8

/** Every kind of object a world can hold: its entity, its title, the figure's intensity range and its usual size. */
const KINDS = {
  church: { title: "Church", entity: churchEntity, range: [0.4, 0.8, 1.3], size: 0.52 },
  reactor: { title: "Reactor", entity: reactorEntity, range: [0.3, 1, 2.2], size: 0.34 },
  pulley: { title: "Pulley", entity: pulleyEntity, range: [0.6, 1, 1.6], size: 0.36 },
  pc: { title: "PC Case", entity: pcCaseEntity, range: [6, 10, 14], size: 0.38 },
  heart: { title: "Heart", entity: heartEntity, range: [48, 72, 120], size: 0.38 },
  chest: { title: "Chest", entity: chestEntity, range: [0, 4, 10], size: 0.42 },
  block: { title: "Block", entity: blockEntity, range: [6, 4, 2], size: 0.34 },
  tree: { title: "Tree", entity: treeEntity, range: [0.3, 1, 2], size: 0.5 },
  torch: { title: "Torch", entity: torchEntity, range: [0, 1, 2.5], size: 0.3 },
} satisfies Record<string, { title: string; entity: Entity<any, any>; range: readonly [number, number, number]; size: number }>

export type WorldKind = keyof typeof KINDS

/** An object placed in the world. */
export type WorldObject = {
  kind: WorldKind
  /** Where it stands, in ground tiles from the far corner: [x, y], or [x, y, level] to stand it on a raised level. */
  at: [number, number] | [number, number, number]
  /** Scale against the figure's own size; each kind has a size that suits the town. */
  size?: number
  /** The figure's props: `{ on: true }` for the PC, `{ type: "ore" }` for a block. */
  props?: object
  /** A stable id, unique in the world; defaults to the kind and its position in the list. */
  key?: string
  /** The name in the object list; defaults to the kind's title. */
  title?: string
}

/** The town the world starts with when no `objects` are given. */
export const TOWN: readonly WorldObject[] = [
  { kind: "church", key: "church", at: [2.5, 11.6] },
  { kind: "reactor", key: "reactor", at: [10.5, 10.5] },
  { kind: "pulley", key: "pulley", at: [15, 4.5] },
  { kind: "pc", key: "pc", at: [15, 13.5], props: { on: true } },
  { kind: "heart", key: "heart", at: [7, 5.5] },
  { kind: "chest", key: "chest", at: [12.5, 17] },
  { kind: "block", key: "ore", title: "Ore block", at: [17.5, 12.5], props: { type: "ore" } },
  { kind: "tree", key: "tree-1", at: [4.5, 8] },
  { kind: "tree", key: "tree-2", at: [9, 15.5] },
  { kind: "tree", key: "tree-3", at: [6, 2.5] },
  ...[
    [8.6, 8.6],
    [12.4, 8.6],
    [8.6, 12.4],
    [12.4, 12.4],
  ].map(([x, y], i): WorldObject => ({ kind: "torch", key: `torch-${i + 1}`, at: [x, y] })),
]

// Each object as placed: its entity, the figure's intensity range, how big, and where its origin goes.
type Placement = { key: string; title: string; entity: Entity<any, any>; range: readonly [number, number, number]; size: number; at: Vec3; props: object }

function place(list: readonly WorldObject[]): Placement[] {
  const count = new Map<string, number>()
  return list.map((o) => {
    const k = KINDS[o.kind]
    const n = (count.get(o.kind) ?? 0) + 1
    count.set(o.kind, n)
    return {
      key: o.key ?? `${o.kind}-${n}`,
      title: o.title ?? k.title,
      entity: k.entity,
      range: k.range,
      size: k.size * (o.size ?? 1),
      at: [o.at[0] * B, o.at[1] * B, (o.at[2] ?? 1) * B],
      props: o.props ?? {},
    }
  })
}

/** The ground: hills in the far corner, sand roads that cross at the square, grass elsewhere. */
function ground(i: number, j: number): { h: number; type: BlockType } {
  const road = i === 10 || j === 10 || (i >= 9 && i <= 11 && j >= 9 && j <= 11)
  if (road) return { h: 1, type: "sand" }
  const far = i + j
  if (far < 7) return { h: 1 + Math.round(2.2 * (1 - far / 7) + 0.4 * Math.sin(i * 1.7 + j * 2.3)), type: far < 3 ? "stone" : "grass" }
  if (i === 0 || j === 0) return { h: 2, type: "grass" }
  return { h: 1, type: "grass" }
}

/** A placed object as it runs: its state, its painting layer, and whether it moved last frame. */
type Live = Placement & { state: any; layer: number; moving: boolean }

/**
 * A piece of the world painted on its own: a ground column, a placed block,
 * an object, the cursor. Each has its own group and painter, and is composed
 * again only when something about it changes, so a world where one torch
 * flickers repaints one torch.
 */
type Unit = { layer: number; g: SVGGElement; painter: Painter; fresh: boolean; items: () => Item[] }

export type WorldProps = Omit<React.ComponentProps<"div">, "children"> & {
  /** What stands in the world. Defaults to the town (`TOWN`). Objects keep their state across changes by `key`. */
  objects?: readonly WorldObject[]
  /** Start in build mode. */
  defaultBuild?: boolean
  /** Called when an object's part is activated: the object's key and the part. */
  onActivate?: (object: string, part: string) => void
  /** Overlay face normals, painting order and pick polygons. */
  debug?: boolean
}

const BAR = [
  { type: "grass", count: 64 },
  { type: "stone", count: 64 },
  { type: "planks", count: 64 },
  { type: "log", count: 64 },
  { type: "glass", count: 64 },
  { type: "sand", count: 64 },
  { type: "ore", count: 16 },
  { type: "leaves", count: 64 },
  { type: "dirt", count: 64 },
] as const

type Api = {
  zoom(f: number): void
  reset(): void
  focus(key: string | null): void
  activate(key: string): void
  sync(list: readonly WorldObject[]): void
  debug(on: boolean): void
}

function World({ objects: given = TOWN, defaultBuild = false, onActivate, debug = false, className, ...props }: WorldProps) {
  const host = React.useRef<HTMLDivElement | null>(null)
  const [caption, setCaption] = React.useState("Drag to look around · scroll to zoom")
  const [build, setBuild] = React.useState(defaultBuild)
  const [night, setNight] = React.useState(false)
  const [slot, setSlot] = React.useState(0)
  const api = React.useRef<Api | null>(null)
  const live = React.useRef({ build, slot, onActivate, given, debug })
  React.useLayoutEffect(() => {
    live.current = { build, slot, onActivate, given, debug }
  })
  const places = React.useMemo(() => place(given), [given])

  React.useLayoutEffect(() => {
    const el = host.current!
    inject(document)
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
    svg.setAttribute("aria-hidden", "true")
    el.prepend(svg)
    // pan and zoom move this group; the scene inside is composed once for a fixed camera, so a still world costs nothing
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g")
    g.setAttribute("class", "zoom")
    svg.appendChild(g)
    const world = document.createElementNS("http://www.w3.org/2000/svg", "g")
    const overlay = document.createElementNS("http://www.w3.org/2000/svg", "g")
    g.append(world, overlay)
    // with the overlay on, the world is composed in one go so the painting order can be numbered across it
    const sc = scene(overlay, { debug: true })
    let debugging = live.current.debug
    if (debugging) world.style.display = "none"
    const c: Camera = camera(45, 0.5, 1)
    const eye = toCamera(c)
    const depth = (p: Vec3) => p[0] * eye[0] + p[1] * eye[1] + p[2] * eye[2]
    const view = { x: 0, y: 0, z: 1 }
    let w = 0,
      h = 0

    const spawn = (p: Placement): Live => ({ ...p, state: p.entity.init(p.props), layer: depth(p.at), moving: false })
    let objects: Live[] = place(live.current.given).map(spawn)
    const placed = new Map<string, BlockType[]>()

    const units = new Map<string, Unit>()
    let order: Unit[] = []
    let reorder = true
    function unit(id: string, layer: number, items: () => Item[]) {
      let u = units.get(id)
      if (!u) {
        const ug = document.createElementNS("http://www.w3.org/2000/svg", "g")
        u = { layer, g: ug, painter: scene(ug), fresh: false, items }
        units.set(id, u)
        reorder = true
      } else {
        if (u.layer !== layer) {
          u.layer = layer
          reorder = true
        }
        u.items = items
        u.fresh = false
      }
      return u
    }
    function drop(prefix: string) {
      for (const [id, u] of units)
        if (id === prefix || id.startsWith(`${prefix}:`)) {
          u.g.remove()
          units.delete(id)
          reorder = true
        }
    }
    const stale = (id: string) => {
      const u = units.get(id)
      if (u) u.fresh = false
    }
    let hover: { key: string; part: string } | null = null
    let speaker: string | null = null

    const value = (o: Live) => fromIntensity(0.5, o.range)
    const ctxOf = (o: Live): Ctx => ({
      value: value(o),
      hover: hover?.key === o.key ? hover.part : null,
      camera: { ...c, s: c.s * o.size },
      read: (t) => {
        if (speaker === o.key || hover?.key === o.key) setCaption(`${o.title}: ${t}`)
      },
    })

    /** Fits the whole town to the box: the fixed camera everything is composed for. Drops every cached record. */
    function frame() {
      w = el.clientWidth
      h = el.clientHeight
      svg.setAttribute("viewBox", `0 0 ${w} ${h}`)
      const corners: Vec3[] = [
        [0, 0, 0],
        [N * B, 0, 0],
        [0, N * B, 0],
        [N * B, N * B, 0],
        [0, 0, 5 * B],
        [N * B * 0.2, N * B * 0.6, 9 * B],
      ]
      const P = project(camera(45, c.k, 1))
      const xs = corners.map((p) => P(p[0], p[1], p[2])[0]),
        ys = corners.map((p) => P(p[0], p[1], p[2])[1])
      c.s = Math.min((w * 0.92) / (Math.max(...xs) - Math.min(...xs)), (h * 0.9) / (Math.max(...ys) - Math.min(...ys)))
      fit(c, corners, w / 2, h / 2)
      for (const u of units.values()) u.fresh = false
    }

    function placeView() {
      g.setAttribute("transform", `translate(${view.x} ${view.y}) scale(${view.z})`)
    }

    /** A point on the element, in the composed (unpanned, unzoomed) frame the scene and entities work in. */
    const toScene = (p: Vec2): Vec2 => [(p[0] - view.x) / view.z, (p[1] - view.y) / view.z]

    const height = (i: number, j: number) => (i < 0 || j < 0 || i >= N || j >= N ? 0 : ground(i, j).h)

    /** One column's items, each group with its painting layer: the ground, then any blocks placed on it. */
    function columnItems(i: number, j: number): { layer: number; items: Item[] }[] {
      const { h: hh, type } = ground(i, j)
      const x0 = i * B,
        y0 = j * B,
        x1 = x0 + B,
        y1 = y0 + B,
        z = hh * B
      const part = `t:${i},${j}`
      // flat ground never hides what stands on it, so it paints before every object
      const layer = hh <= 1 ? -1e6 + depth([x0, y0, 0]) : depth([x0 + B / 2, y0 + B / 2, z / 2])
      const top = type === "grass" ? MATERIAL.grass.tint : MATERIAL[type].tint
      const side = type === "grass" ? MATERIAL.dirt.tint : MATERIAL[type].tint
      // ground lids are outlined faintly, so the grid stays behind the objects
      const groundItems: Item[] = [
        {
          mesh: pane(
            [
              [x0, y0, z],
              [x1, y0, z],
              [x1, y1, z],
              [x0, y1, z],
            ],
            [0, 0, 1],
          ),
          tint: top,
          shade: true,
          part,
          cls: "lo",
        },
      ]
      const nx = height(i + 1, j),
        ny = height(i, j + 1)
      if (nx < hh)
        groundItems.push({
          mesh: pane(
            [
              [x1, y0, nx * B],
              [x1, y1, nx * B],
              [x1, y1, z],
              [x1, y0, z],
            ],
            [1, 0, 0],
          ),
          tint: side,
          shade: true,
          part,
        })
      if (ny < hh)
        groundItems.push({
          mesh: pane(
            [
              [x0, y1, ny * B],
              [x1, y1, ny * B],
              [x1, y1, z],
              [x0, y1, z],
            ],
            [0, 1, 0],
          ),
          tint: side,
          shade: true,
          part,
        })
      const groups = [{ layer, items: groundItems }]
      placed.get(`${i},${j}`)?.forEach((t, k) => {
        groups.push({ layer: depth([x0 + B / 2, y0 + B / 2, z + k * B + B / 2]), items: block(t, x0, y0, z + k * B, B, { part }) })
      })
      return groups
    }

    /** An object's items, scaled and moved into place, with its parts named for the world. */
    function objectItems(o: Live): Item[] {
      const items: Item[] = []
      o.entity.draw(o.state, items, ctxOf(o))
      const t = (p: Vec3): Vec3 => [o.at[0] + p[0] * o.size, o.at[1] + p[1] * o.size, o.at[2] + p[2] * o.size]
      return items.map((it): Item => {
        const part = it.part ? `e:${o.key}:${it.part}` : undefined
        const cls = `${it.cls ?? ""}${hover?.key === o.key && it.part === hover.part ? " accent" : ""}`
        if ("pts" in it) return { ...it, pts: it.pts.map(t), part, cls }
        if ("text" in it) return { ...it, at: t(it.at), size: it.size * o.size, part, cls }
        return { ...it, mesh: { ...it.mesh, v: it.mesh.v.map(t) }, part, cls, bias: (it.bias ?? 0) * o.size }
      })
    }

    /** The hovered tile's outline, over everything. */
    function cursor(): Item[] {
      if (hover?.key !== "terrain") return []
      const [i, j] = hover.part.slice(2).split(",").map(Number)
      const x0 = i * B,
        y0 = j * B,
        z = (ground(i, j).h + (placed.get(`${i},${j}`)?.length ?? 0)) * B + 0.2
      return [
        {
          pts: [
            [x0, y0, z],
            [x0 + B, y0, z],
            [x0 + B, y0 + B, z],
            [x0, y0 + B, z],
          ],
          closed: true,
          cls: "accent",
        },
      ]
    }

    /** (Re)creates a column's units: its ground, then each block placed on it. */
    function column(i: number, j: number) {
      drop(`c:${i},${j}`)
      columnItems(i, j).forEach((gr, k) => unit(`c:${i},${j}:${k}`, gr.layer, () => gr.items))
    }
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) column(i, j)
    const objectUnits = () => {
      drop("o")
      for (const o of objects) unit(`o:${o.key}`, o.layer, () => objectItems(o))
    }
    objectUnits()
    unit("cursor", 1e6, cursor)

    function draw() {
      if (debugging) {
        const all: Item[] = []
        for (const u of units.values()) for (const it of u.items()) all.push({ ...it, layer: u.layer })
        sc.render(c, all)
        return
      }
      if (reorder) {
        // layers order the units, which is the order one compose of everything would give
        order = [...units.values()].sort((a, b) => a.layer - b.layer)
        for (const u of order) world.appendChild(u.g)
        reorder = false
      }
      for (const u of order)
        if (!u.fresh) {
          u.painter.paint(compose(c, u.items()))
          u.fresh = true
        }
    }

    /** The part under a point, front-most unit first. */
    function pick(p: Vec2): string | null {
      if (debugging) return sc.pick(p)
      for (let i = order.length - 1; i >= 0; i--) {
        const hit = order[i].painter.pick(p)
        if (hit) return hit
      }
      return null
    }

    const L = loop(el, (dt, now) => {
      let moving = false
      for (const o of objects) {
        const m = !!o.entity.step?.(o.state, dt, ctxOf(o), now)
        // recompose while it moves, and once more on the frame it comes to rest
        if (m || o.moving) stale(`o:${o.key}`)
        o.moving = m
        if (m) moving = true
      }
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
    /** What an entity reads of the pointer: `p` and `from` in the composed frame, and the ground under it. */
    const info = (o: Live, p: Vec2, down: boolean, from: Vec2 | null, part: string | null): PointerInfo => {
      const q = toScene(p)
      const [gx, gy] = unproject(c, q[0], q[1], o.at[2])
      return { p: q, ground: [(gx - o.at[0]) / o.size, (gy - o.at[1]) / o.size], part, down, from: from && toScene(from) }
    }
    const find = (key: string) => objects.find((o) => o.key === key)
    const pickAt = (p: Vec2) => parse(pick(toScene(p)))
    /** Marks what a change touched to be composed again. */
    const touch = (key: string | undefined) => {
      if (!key) return
      stale(key === "terrain" ? "cursor" : `o:${key}`)
    }

    function setHover(next: { key: string; part: string } | null, p: Vec2 | null) {
      const before = hover
      hover = next
      if (before?.key !== next?.key || before?.part !== next?.part) {
        touch(before?.key)
        touch(next?.key)
      }
      if (before && before.key !== next?.key) {
        const o = find(before.key)
        if (o) o.entity.pointer?.(o.state, null, ctxOf(o))
      }
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
      touch(key)
      setCaption(`${o.title}: ${caption ?? o.entity.parts[part] ?? part}`)
      live.current.onActivate?.(key, part)
      L.wake()
    }

    function edit(part: string, mine: boolean) {
      const [i, j] = part.slice(2).split(",").map(Number)
      const k = `${i},${j}`
      const stack = placed.get(k) ?? []
      if (mine) {
        if (!stack.length) {
          setCaption("Only blocks you placed can be mined")
          return
        }
        const t = stack.pop()!
        setCaption(`Mined ${MATERIAL[t].label.toLowerCase()}`)
      } else {
        if (stack.length >= 6) {
          setCaption("That stack is as tall as it goes")
          return
        }
        const t = BAR[live.current.slot].type
        stack.push(t)
        setCaption(`Placed ${MATERIAL[t].label.toLowerCase()} · ${stack.length} high`)
      }
      if (stack.length) placed.set(k, stack)
      else placed.delete(k)
      column(i, j)
      stale("cursor")
      L.wake()
    }

    // a press on an object that listens to the pointer may become its drag (the pulley's rope); otherwise a drag pans
    let from: Vec2 | null = null,
      last: Vec2 | null = null,
      panned = false,
      held = false
    let dragging: Live | null = null,
      pressed: ReturnType<typeof parse> = null
    const down = (e: PointerEvent) => {
      el.focus({ preventScroll: true })
      from = last = at(e)
      panned = held = false
      pressed = pickAt(from)
      dragging = null
      if (pressed && pressed.key !== "terrain") {
        const o = find(pressed.key)!
        if (o.entity.pointer) {
          dragging = o
          o.entity.pointer(o.state, info(o, from, true, from, pressed.part), ctxOf(o))
          touch(o.key)
        }
      }
      el.setPointerCapture(e.pointerId)
    }
    const move = (e: PointerEvent) => {
      const p = at(e)
      if (from && last) {
        if (dragging && !panned && dragging.entity.pointer?.(dragging.state, info(dragging, p, true, from, pressed?.part ?? null), ctxOf(dragging))) {
          held = true
          speaker = dragging.key
          touch(dragging.key)
          L.wake()
        } else if (!held) {
          if (Math.hypot(p[0] - from[0], p[1] - from[1]) > 5) panned = true
          if (panned) {
            view.x += p[0] - last[0]
            view.y += p[1] - last[1]
            placeView()
            el.style.cursor = "grabbing"
          }
        }
        last = p
        return
      }
      setHover(pickAt(p), p)
    }
    const up = (e: PointerEvent) => {
      const p = at(e)
      if (dragging) {
        dragging.entity.pointer?.(dragging.state, info(dragging, p, false, null, pressed?.part ?? null), ctxOf(dragging))
        touch(dragging.key)
      }
      if (!panned && !held && pressed) {
        if (pressed.key === "terrain") {
          if (live.current.build) edit(pressed.part, e.shiftKey || e.button === 2)
        } else activate(pressed.key, pressed.part)
      }
      from = last = null
      dragging = null
      el.releasePointerCapture?.(e.pointerId)
      setHover(pickAt(p), p)
    }
    const leave = () => {
      if (!from) setHover(null, null)
    }
    const zoomAt = (f: number, p: Vec2) => {
      // the composed scale times the zoom stays between 0.6 and 8, as it always has
      const z = Math.max(0.6 / c.s, Math.min(8 / c.s, view.z * f))
      const k = z / view.z
      view.x = p[0] - (p[0] - view.x) * k
      view.y = p[1] - (p[1] - view.y) * k
      view.z = z
      placeView()
    }
    const wheel = (e: WheelEvent) => {
      e.preventDefault()
      zoomAt(Math.exp(-e.deltaY * 0.0015), at(e))
    }
    const menu = (e: Event) => {
      if (live.current.build) e.preventDefault()
    }
    const key = (e: KeyboardEvent) => {
      const step = 40
      if (e.key === "ArrowLeft") view.x += step
      else if (e.key === "ArrowRight") view.x -= step
      else if (e.key === "ArrowUp") view.y += step
      else if (e.key === "ArrowDown") view.y -= step
      else if (e.key === "+" || e.key === "=") zoomAt(1.2, [w / 2, h / 2])
      else if (e.key === "-") zoomAt(1 / 1.2, [w / 2, h / 2])
      else return
      e.preventDefault()
      placeView()
    }
    el.addEventListener("pointerdown", down)
    el.addEventListener("pointermove", move)
    el.addEventListener("pointerup", up)
    el.addEventListener("pointerleave", leave)
    el.addEventListener("wheel", wheel, { passive: false })
    el.addEventListener("contextmenu", menu)
    el.addEventListener("keydown", key)
    const ro = new ResizeObserver(() => {
      frame()
      L.wake()
    })
    ro.observe(el)
    frame()
    placeView()

    api.current = {
      zoom: (f) => zoomAt(f, [w / 2, h / 2]),
      reset: () => {
        view.x = view.y = 0
        view.z = 1
        placeView()
        frame()
        L.wake()
      },
      focus: (k) => {
        const o = k ? find(k) : undefined
        setHover(o ? { key: o.key, part: Object.keys(o.entity.parts)[0] } : null, null)
        if (o) setCaption(`${o.title}: ${o.entity.rest(o.state)}`)
      },
      activate: (k) => {
        const o = find(k)
        if (o) activate(k, Object.keys(o.entity.parts)[0])
      },
      sync: (list) => {
        // keep the state of every object whose key and kind survive; start the rest afresh
        const before = new Map(objects.map((o) => [o.key, o]))
        objects = place(list).map((p) => {
          const had = before.get(p.key)
          if (!had || had.entity !== p.entity) return spawn(p)
          had.entity.update?.(had.state, p.props)
          return { ...had, ...p, state: had.state, layer: depth(p.at) }
        })
        if (hover && hover.key !== "terrain" && !find(hover.key)) hover = null
        objectUnits()
        L.wake()
      },
      debug: (on) => {
        if (on === debugging) return
        debugging = on
        world.style.display = on ? "none" : ""
        if (!on) sc.paint([])
        for (const u of units.values()) u.fresh = false
        L.wake()
      },
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
    return places.map((p) => {
      const n = (seen.get(p.title) ?? 0) + 1
      seen.set(p.title, n)
      return places.filter((q) => q.title === p.title).length > 1 ? `${p.title} ${n}` : p.title
    })
  }, [places])

  React.useEffect(() => {
    api.current?.sync(given)
  }, [given])
  React.useEffect(() => {
    api.current?.debug(debug)
  }, [debug])

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
          <p
            aria-live="polite"
            className="max-w-[60%] rounded-md border bg-background/85 px-2.5 py-1.5 font-mono text-[12px] text-muted-foreground backdrop-blur"
          >
            {caption}
          </p>
          <div className="pointer-events-auto flex flex-wrap gap-2">
            <IsoButton size="sm" depth={3} variant={build ? "solid" : "default"} aria-pressed={build} onClick={() => setBuild((b) => !b)}>
              Build
            </IsoButton>
            <IsoButton size="sm" depth={3} aria-pressed={night} onClick={() => setNight((n) => !n)}>
              {night ? "Day" : "Night"}
            </IsoButton>
            <IsoButton size="icon" depth={3} aria-label="Zoom in" onClick={() => api.current?.zoom(1.25)} className="[&>span]:size-8">
              +
            </IsoButton>
            <IsoButton size="icon" depth={3} aria-label="Zoom out" onClick={() => api.current?.zoom(0.8)} className="[&>span]:size-8">
              −
            </IsoButton>
            <IsoButton size="sm" depth={3} onClick={() => api.current?.reset()}>
              Reset view
            </IsoButton>
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
        {places.map((p, i) => (
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
