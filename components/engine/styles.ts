/**
 * The engine's own classes, on top of the figures' stylesheet. Scoped like it
 * (`[data-iso] > svg`), so the canvas painter's probe resolves them, and
 * written in the same tokens, so the engine follows light and dark.
 *
 * Gas takes the colour of its stroke: intake blue, compression violet, the
 * power stroke orange (yellow while it burns), exhaust a warm grey.
 */

const SVG = ":where([data-iso]>svg)"

const rules = [
  `${SVG} :where(.gas){fill:color-mix(in oklab,var(--_g) 30%,var(--_plate));stroke:none}`,
  `${SVG} :where(.line.gas){fill:none;stroke:color-mix(in oklab,var(--_g) 55%,var(--_plate))}`,
  `${SVG} :where(.gas.intake){--_g:#3b82f6}`,
  `${SVG} :where(.gas.compression){--_g:#8b5cf6}`,
  `${SVG} :where(.gas.power){--_g:#f97316}`,
  `${SVG} :where(.gas.exhaust){--_g:#a8a29e}`,
  `${SVG} :where(.gas.burn){--_g:#facc15;fill:color-mix(in oklab,#facc15 62%,var(--_plate))}`,
  `${SVG} :where(.line.spark){stroke:#f59e0b;stroke-width:1.6}`,
  // the chain's links are its dashes; they run as the crank turns
  `${SVG} :where(.line.chain){stroke:color-mix(in oklab,var(--_hi) 62%,var(--_plate));stroke-width:1.7;stroke-dasharray:3.2 1.6;stroke-linecap:butt}`,
  `${SVG} :where(.line.spring){stroke:color-mix(in oklab,var(--_hi) 55%,var(--_plate))}`,
  `${SVG} :where(.line.vent){stroke:var(--_edge);stroke-dasharray:1 3}`,
  `${SVG} :where(.line.mark){stroke:var(--_accent);stroke-width:2.4}`,
  // the housing in X-ray: what you could see in fine lines, what is behind it fainter and dashed
  `${SVG} :where(.wire.ghost){stroke:color-mix(in oklab,var(--_edge) 62%,var(--_plate))}`,
  `${SVG} :where(.wire.hidden.ghost){stroke:color-mix(in oklab,var(--_edge) 30%,var(--_plate));stroke-dasharray:2 3}`,
  `${SVG} :where(.wire.ghost.accent){stroke:var(--_accent)}`,
  // everything but the isolated part: a faint outline, nothing behind it
  `${SVG} :where(.wire.faded){stroke:color-mix(in oklab,var(--_edge) 34%,var(--_plate))}`,
  `${SVG} :where(.wire.hidden.faded){stroke:none}`,
  // what the pointer is on: its faces take a little of the accent
  `${SVG} :where(.tint.accent){fill:color-mix(in oklab,var(--_accent) 24%,color-mix(in oklab,var(--tint) 34%,var(--_plate)))}`,
  `${SVG} :where(.face.accent){stroke:var(--_accent)}`,
  // exploded: dashed construction lines back to where each part lives
  `${SVG} :where(.line.construct){stroke:color-mix(in oklab,var(--_accent) 60%,var(--_plate));stroke-dasharray:3 4}`,
  // callouts, in the overlay above the canvas
  `:where([data-engine-callouts]){position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible}`,
  `:where([data-engine-callouts] line){stroke:color-mix(in oklab,var(--ink,currentColor) 70%,transparent);stroke-width:1}`,
  `:where([data-engine-callouts] circle){fill:var(--ink,currentColor)}`,
  `:where([data-engine-callouts] rect){fill:color-mix(in oklab,var(--card,#fff) 88%,transparent);stroke:color-mix(in oklab,var(--ink,currentColor) 40%,transparent);stroke-width:1}`,
  `:where([data-engine-callouts] text){fill:var(--foreground,currentColor);font:500 11px/1 var(--font-geist-mono,ui-monospace),ui-monospace,monospace;letter-spacing:.02em}`,
  `:where([data-engine-callouts] .focus rect){stroke:var(--ink,currentColor)}`,
  `:where([data-engine-callouts] .focus text){fill:var(--ink,currentColor)}`,
].join("")

// unlayered, so it wins over the figures' sheet (layered, and adopted after any <style>) on the classes it shares
export const css = rules

let done = false

/** Installs the engine's stylesheet once, after the figures' own. */
export function injectEngine(doc: Document) {
  if (done || doc.querySelector("style[data-engine-style]")) return
  done = true
  const style = doc.createElement("style")
  style.setAttribute("data-engine-style", "")
  style.textContent = css
  doc.head.appendChild(style)
}
