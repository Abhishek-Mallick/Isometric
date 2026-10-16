/**
 * Isometric — stills. Any figure's live svg as a standalone file, with the
 * theme's colours written into every element, so it opens the same in a
 * browser, Figma or a slide deck. Canvas scenes export through `svg()` on
 * their painter instead.
 */

const NS = "http://www.w3.org/2000/svg"
const PAINT = ["fill", "stroke", "stroke-width", "stroke-dasharray", "stroke-linejoin", "stroke-linecap", "opacity", "fill-opacity", "stroke-opacity"] as const
const TEXT = ["font-family", "font-size", "font-weight", "letter-spacing"] as const

/** The figure's svg as a document. `background` fills it with the plate colour first. */
export function exportSVG(svg: SVGSVGElement, background = true): string {
  const box = svg.getBoundingClientRect()
  const copy = svg.cloneNode(true) as SVGSVGElement
  const from = [svg, ...Array.from(svg.querySelectorAll("*"))]
  const to = [copy, ...Array.from(copy.querySelectorAll("*"))]
  from.forEach((el, i) => {
    const out = to[i] as SVGElement
    if (i === 0) return
    const cs = getComputedStyle(el)
    if (cs.display === "none" || (el.localName === "path" && !el.getAttribute("d"))) {
      out.remove()
      return
    }
    for (const k of PAINT) {
      const v = cs.getPropertyValue(k)
      if (v && v !== "normal") out.setAttribute(k, v)
    }
    if (el.localName === "text") for (const k of TEXT) out.setAttribute(k, cs.getPropertyValue(k))
    out.removeAttribute("class")
    out.removeAttribute("style")
  })
  copy.setAttribute("xmlns", NS)
  copy.setAttribute("width", String(Math.round(box.width)))
  copy.setAttribute("height", String(Math.round(box.height)))
  copy.removeAttribute("aria-hidden")
  copy.removeAttribute("style")
  if (background) {
    const plate = svg.parentElement ? plateColor(svg.parentElement) : null
    if (plate) {
      const rect = document.createElementNS(NS, "rect")
      rect.setAttribute("width", "100%")
      rect.setAttribute("height", "100%")
      rect.setAttribute("fill", plate)
      copy.prepend(rect)
    }
  }
  return new XMLSerializer().serializeToString(copy)
}

/** The plate colour inside a `data-iso` host, resolved to a colour; null when there is none. */
export function plateColor(host: HTMLElement): string | null {
  // the token may be a color-mix() of other tokens, so let the browser resolve it to a colour
  const probe = document.createElement("span")
  probe.style.cssText = "position:absolute;visibility:hidden;color:var(--_plate,transparent)"
  host.appendChild(probe)
  const plate = getComputedStyle(probe).color
  probe.remove()
  return plate && plate !== "transparent" && plate !== "rgba(0, 0, 0, 0)" ? plate : null
}

/** Saves text as a file through the browser. */
export function download(name: string, text: string, type = "image/svg+xml") {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const a = document.createElement("a")
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
