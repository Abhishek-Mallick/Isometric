/**
 * Isometric — the figures' stylesheet, and the one function that installs it
 * in a document or a shadow root.
 *
 * Every selector sits inside `:where()`, so each rule has zero specificity
 * and any rule of yours wins. The public theme is seven custom properties:
 *
 *   --iso-plate   the fill of every face: the colour the figure sits on
 *   --iso-hi      what is lit
 *   --iso-edge    outlines
 *   --iso-mid     other strokes
 *   --iso-lo      what recedes
 *   --iso-accent  the one thing being pointed at (defaults to --iso-hi)
 *   --iso-stroke  stroke width in CSS pixels, at any size
 *
 * Unset, they follow shadcn's tokens (--background, --foreground,
 * --muted-foreground, --border), so a figure matches its page in light and
 * dark with no setup. With no shadcn tokens on the page, they fall back to a
 * neutral palette, dark under `.dark` or `[data-theme="dark"]`.
 */

type Palette = { plate: string; hi: string; edge: string; mid: string; lo: string }

export const LIGHT: Palette = { plate: "#ffffff", hi: "#18181b", edge: "#a1a1aa", mid: "#d4d4d8", lo: "#e4e4e7" }
export const DARK: Palette = { plate: "#0a0a0a", hi: "#fafafa", edge: "#71717a", mid: "#3f3f46", lo: "#27272a" }

/** Follows shadcn's tokens, with `p` as the fallback when they are absent. */
const tokens = (p: Palette) =>
  `--_plate:var(--iso-plate,var(--background,${p.plate}));` +
  `--_hi:var(--iso-hi,var(--foreground,${p.hi}));` +
  `--_edge:var(--iso-edge,var(--muted-foreground,${p.edge}));` +
  `--_mid:var(--iso-mid,color-mix(in oklab,var(--muted-foreground,${p.edge}) 45%,var(--background,${p.plate})));` +
  `--_lo:var(--iso-lo,var(--border,${p.lo}));`

/** A fixed palette, for `theme="light"` and `theme="dark"`. */
const fixed = (p: Palette) =>
  `--_plate:var(--iso-plate,${p.plate});--_hi:var(--iso-hi,${p.hi});--_edge:var(--iso-edge,${p.edge});--_mid:var(--iso-mid,${p.mid});--_lo:var(--iso-lo,${p.lo});`

const EASE = "cubic-bezier(0.2,0.7,0.1,1)"
const SVG = ":where([data-iso]>svg)"

export const css = [
  `:where([data-iso]){display:block;position:relative;aspect-ratio:5/4;touch-action:pan-y;user-select:none;-webkit-user-select:none;--_sw:var(--iso-stroke,0.9);--_accent:var(--iso-accent,var(--_hi));${tokens(LIGHT)}}`,
  `:where(.dark,[data-theme="dark"]) :where([data-iso]){${tokens(DARK)}}`,
  `:where([data-iso][data-iso-theme="light"]){${fixed(LIGHT)}}`,
  `:where([data-iso][data-iso-theme="dark"]){${fixed(DARK)}}`,
  `:where([data-iso]:focus-visible){outline:1.5px solid var(--_hi);outline-offset:3px;border-radius:4px}`,
  `${SVG}{position:absolute;inset:0;width:100%;height:100%;display:block;overflow:visible}`,
  `:where([data-iso]>[data-iso-live]){position:absolute;width:1px;height:1px;margin:-1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}`,
  // faces are filled with the plate colour, painted back to front
  `${SVG} :where(path,ellipse,circle,rect){fill:var(--_plate);stroke:var(--_mid);stroke-width:var(--_sw);vector-effect:non-scaling-stroke;stroke-linejoin:round;stroke-linecap:round;transition:stroke 240ms ${EASE},fill 240ms ${EASE}}`,
  `${SVG} :where(.edge){stroke:var(--_edge)}`,
  `${SVG} :where(.inner,.line){fill:none}`,
  `${SVG} :where(.inner){stroke:var(--_lo)}`,
  `${SVG} :where(.lo){stroke:var(--_lo)}`,
  `${SVG} :where(.hi .edge,.hi.edge,.hi.line){stroke:var(--_hi)}`,
  `${SVG} :where(.hi .inner){stroke:var(--_mid)}`,
  `${SVG} :where(.accent .edge,.accent.edge,.accent.line){stroke:var(--_accent)}`,
  `${SVG} :where(.dash){stroke-dasharray:1.5 3}`,
  `${SVG} :where(.flat){fill:none;stroke:none}`,
  `${SVG} :where(.dot){stroke:none;fill:var(--_hi)}`,
  `${SVG} :where(.dot.dim){fill:var(--_edge)}`,
  `${SVG} :where(.dot.off){fill:var(--_lo)}`,
  `${SVG} :where(.dot.accent){fill:var(--_accent)}`,
].join("")

const done = new WeakSet<Document | ShadowRoot>()

/** Installs the stylesheet once per document or shadow root. */
export function inject(root: Document | ShadowRoot) {
  if (done.has(root)) return
  done.add(root)
  const doc = root.nodeType === 9 ? (root as Document) : (root as ShadowRoot).ownerDocument
  const win = doc.defaultView
  if (win && "adoptedStyleSheets" in root) {
    try {
      const sheet = new win.CSSStyleSheet()
      sheet.replaceSync(css)
      root.adoptedStyleSheets = [...root.adoptedStyleSheets, sheet]
      return
    } catch {
      // no constructable stylesheets: fall through to a <style>
    }
  }
  const style = doc.createElement("style")
  style.setAttribute("data-iso-style", "")
  style.textContent = css
  ;(root.nodeType === 9 ? doc.head ?? doc.documentElement : root).appendChild(style)
}
