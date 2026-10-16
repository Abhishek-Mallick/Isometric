import { plateColor } from "./export"
import type { Camera, Vec2 } from "./iso"
import { compose, picker, type ComposeOptions, type Item, type Out, type Painter } from "./scene"

/**
 * Isometric — a canvas painter for scenes too busy for one svg element per
 * face: thousands of faces moving every frame.
 *
 * It paints the same records as `scene`, and it looks the same, because it
 * never decides a colour itself. Each class is resolved once through the
 * real stylesheet: a hidden probe element inside the host takes the class,
 * and its computed fill, stroke, width and dashes are what the canvas uses.
 * The cache is dropped when the theme tokens change (light, dark, your own
 * `--iso-*`), so it follows `.dark` like every other figure.
 *
 * Coordinates are CSS pixels of the host; the canvas is sized for the
 * device pixel ratio, and strokes keep their CSS width at any zoom.
 */

export type Paint = {
  fill: string | null
  stroke: string | null
  width: number
  dash: number[]
  opacity: number
  fillOpacity: number
  strokeOpacity: number
  font: string
}

const NS = "http://www.w3.org/2000/svg"
const THEME = ["--_plate", "--_hi", "--_edge", "--_mid", "--_lo", "--_accent", "--_sw"]

/** Resolves classes to paint through the stylesheet, from inside `host` (an element with `data-iso`). */
export function resolver(host: HTMLElement) {
  const probe = document.createElementNS(NS, "svg")
  probe.setAttribute("aria-hidden", "true")
  probe.setAttribute("style", "position:absolute;width:0;height:0;overflow:hidden;pointer-events:none;visibility:hidden")
  host.appendChild(probe)
  const path = document.createElementNS(NS, "path")
  const text = document.createElementNS(NS, "text")
  for (const el of [path, text]) {
    el.style.transition = "none"
    probe.appendChild(el)
  }
  const cache = new Map<string, Paint>()
  let theme = ""

  const num = (v: string) => parseFloat(v) || 0
  const color = (v: string) => (!v || v === "none" ? null : v)

  return {
    /** Drops the cache when the theme moved. Call once per frame; cheap when nothing changed. */
    check() {
      const cs = getComputedStyle(host)
      const now = THEME.map((k) => cs.getPropertyValue(k)).join("|")
      if (now !== theme) {
        theme = now
        cache.clear()
      }
    },
    get(cls: string, tint?: string, isText = false): Paint {
      const id = `${isText ? "T" : "P"}|${cls}|${tint ?? ""}`
      let p = cache.get(id)
      if (p) return p
      const el = isText ? text : path
      el.setAttribute("class", cls)
      if (tint) el.style.setProperty("--tint", tint)
      else el.style.removeProperty("--tint")
      const cs = getComputedStyle(el)
      const dash =
        cs.strokeDasharray && cs.strokeDasharray !== "none"
          ? cs.strokeDasharray
              .split(/[\s,]+/)
              .map(num)
              .filter((n) => n > 0)
          : []
      p = {
        fill: color(cs.fill),
        stroke: color(cs.stroke),
        width: num(cs.strokeWidth),
        dash,
        opacity: num(cs.opacity || "1"),
        fillOpacity: num(cs.fillOpacity || "1"),
        strokeOpacity: num(cs.strokeOpacity || "1"),
        font: `${cs.fontWeight} 16px ${cs.fontFamily}`,
      }
      cache.set(id, p)
      return p
    },
    destroy() {
      probe.remove()
    },
  }
}

export type CanvasPainter = Painter & {
  canvas: HTMLCanvasElement
  /** The host's size in CSS pixels, after the last `resize`. */
  size(): Vec2
  /** Matches the canvas to the host's box. Call from a ResizeObserver. */
  resize(): void
  /** The last frame as a standalone svg document, with every colour inlined. */
  svg(background?: boolean): string
  destroy(): void
}

/** A canvas painter filling `host`, which must carry `data-iso` (for the stylesheet) and be positioned. */
export function canvasScene(host: HTMLElement, options: ComposeOptions = {}): CanvasPainter {
  const canvas = document.createElement("canvas")
  canvas.setAttribute("aria-hidden", "true")
  host.prepend(canvas)
  const ctx = canvas.getContext("2d")!
  const styles = resolver(host)
  const hits = picker()
  let last: readonly Out[] = []
  let w = 0,
    h = 0,
    dpr = 1

  function resize() {
    w = host.clientWidth
    h = host.clientHeight
    dpr = Math.min(2.5, window.devicePixelRatio || 1)
    canvas.width = Math.max(1, Math.round(w * dpr))
    canvas.height = Math.max(1, Math.round(h * dpr))
  }
  resize()

  function paint(out: readonly Out[]) {
    styles.check()
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, w, h)
    ctx.lineJoin = "round"
    ctx.lineCap = "round"
    for (const o of out) {
      if (o.text) {
        const st = styles.get(o.cls, undefined, true)
        if (!st.fill) continue
        const [a, b, c, d, e, f] = o.text.m
        ctx.save()
        ctx.transform(a / 16, b / 16, c / 16, d / 16, e, f)
        ctx.font = st.font
        ctx.textAlign = o.text.anchor === "middle" ? "center" : o.text.anchor === "end" ? "right" : "left"
        ctx.textBaseline = "alphabetic"
        ctx.globalAlpha = st.opacity * st.fillOpacity
        ctx.fillStyle = st.fill
        ctx.fillText(o.text.s, 0, 0)
        ctx.restore()
        continue
      }
      if (!o.rings.length) continue
      const st = styles.get(o.cls, o.tint)
      ctx.beginPath()
      for (const r of o.rings) {
        if (!r.length) continue
        ctx.moveTo(r[0][0], r[0][1])
        for (let i = 1; i < r.length; i++) ctx.lineTo(r[i][0], r[i][1])
        if (!o.open) ctx.closePath()
      }
      if (st.fill && !o.open) {
        ctx.globalAlpha = st.opacity * st.fillOpacity
        ctx.fillStyle = st.fill
        ctx.fill()
      }
      if (st.stroke && st.width > 0) {
        ctx.globalAlpha = st.opacity * st.strokeOpacity
        ctx.strokeStyle = st.stroke
        ctx.lineWidth = st.width
        ctx.setLineDash(st.dash)
        ctx.stroke()
        if (st.dash.length) ctx.setLineDash([])
      }
    }
    ctx.globalAlpha = 1
    hits.set(out)
    last = out
  }

  const painter: CanvasPainter = {
    canvas,
    options,
    render(c: Camera, items: readonly Item[]) {
      paint(compose(c, items, painter.options))
    },
    paint,
    pick: (p) => hits.pick(p),
    last: () => last,
    size: () => [w, h],
    resize,
    svg: (background = true) => toSVG(last, styles, w, h, background ? plateColor(host) : null),
    destroy() {
      canvas.remove()
      styles.destroy()
    },
  }
  return painter
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")

/** Records as a standalone svg document, colours resolved by `styles`. */
export function toSVG(out: readonly Out[], styles: ReturnType<typeof resolver>, w: number, h: number, background: string | null = null) {
  styles.check()
  const parts: string[] = [`<svg xmlns="${NS}" viewBox="0 0 ${Math.round(w)} ${Math.round(h)}" width="${Math.round(w)}" height="${Math.round(h)}">`]
  if (background) parts.push(`<rect width="100%" height="100%" fill="${esc(background.trim())}"/>`)
  for (const o of out) {
    if (o.text) {
      const st = styles.get(o.cls, undefined, true)
      if (!st.fill) continue
      const [a, b, c, d, e, f] = o.text.m
      const family = st.font.replace(/^\S+ 16px /, "")
      parts.push(
        `<text transform="matrix(${a / 16} ${b / 16} ${c / 16} ${d / 16} ${e} ${f})" font-size="16" font-family="${esc(family)}" text-anchor="${o.text.anchor}" fill="${esc(st.fill)}">${esc(o.text.s)}</text>`,
      )
      continue
    }
    const d = o.d
    if (!d) continue
    const st = styles.get(o.cls, o.tint)
    const attrs = [
      `d="${d}"`,
      `fill="${o.open || !st.fill ? "none" : esc(st.fill)}"`,
      `stroke="${st.stroke ? esc(st.stroke) : "none"}"`,
      `stroke-width="${st.width}"`,
      `stroke-linejoin="round" stroke-linecap="round"`,
    ]
    if (st.dash.length) attrs.push(`stroke-dasharray="${st.dash.join(" ")}"`)
    if (st.opacity !== 1) attrs.push(`opacity="${st.opacity}"`)
    parts.push(`<path ${attrs.join(" ")}/>`)
  }
  parts.push("</svg>")
  return parts.join("")
}
