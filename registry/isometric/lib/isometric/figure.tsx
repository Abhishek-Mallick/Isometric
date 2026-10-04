"use client"

import * as React from "react"

import { scale } from "./iso"
import type { Mount, Readout } from "./stage"
import { inject } from "./styles"

/**
 * Isometric — turns an engine into a React component.
 *
 * The component renders one empty `<div>` with a 5:4 aspect ratio and mounts
 * the engine on it in a layout effect, so a server render reserves the box
 * and nothing shifts when the drawing arrives. It mounts once: changed
 * options reach the running engine, and `onRead` is read through a ref so an
 * inline function never remounts the figure.
 */

export type FigureOptions = {
  /** How strongly the figure answers the pointer, 0 (subtle) to 1 (strong). Default 0.5. */
  intensity?: number
  /** `"auto"` follows the page's tokens and `.dark`; the others pin a palette. Default `"auto"`. */
  theme?: "auto" | "light" | "dark"
  /** The accessible name. Each figure has an English default. */
  label?: string
  /** The figure's caption each time it changes, e.g. `"step 3 of 5"`. */
  onRead?: (text: string) => void
}

export type FigureProps<P = object> = FigureOptions & Partial<P> & Omit<React.ComponentProps<"div">, "children" | keyof FigureOptions>

export type FigureSpec<P> = {
  /** Kebab-case id, written to `data-iso`. */
  id: string
  /** The default accessible name. */
  label: string
  /** The caption at rest. */
  rest: string
  /** The engine's own number at intensity 0, 0.5 and 1. */
  range: readonly [number, number, number]
  /** Keyboard-operable figures are a focusable group with a live region instead of an image. */
  focusable?: boolean
  /** Figure-specific props and their defaults. */
  defaults: P
  mount: Mount<P>
}

const useIsoLayoutEffect = typeof window === "undefined" ? React.useEffect : React.useLayoutEffect

const report = (err: unknown) => {
  if (typeof reportError === "function") reportError(err)
  else setTimeout(() => { throw err })
}

export function createFigure<P extends object>(name: string, spec: FigureSpec<P>) {
  const keys = Object.keys(spec.defaults) as (keyof P)[]

  function Figure({ ref, intensity, theme = "auto", label, onRead, style, ...rest }: FigureProps<P> & { ref?: React.Ref<HTMLDivElement> }) {
    const own = {} as P
    const attrs: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(rest)) {
      if ((keys as string[]).includes(k)) (own as Record<string, unknown>)[k] = v
      else attrs[k] = v
    }
    const props = { ...spec.defaults, ...own } as P
    const named = label ?? (attrs["aria-label"] as string | undefined) ?? spec.label

    const node = React.useRef<HTMLDivElement | null>(null)
    const engine = React.useRef<ReturnType<Mount<P>> | null>(null)
    const read = React.useRef(onRead)
    const live = React.useRef<HTMLSpanElement | null>(null)

    useIsoLayoutEffect(() => { read.current = onRead })

    useIsoLayoutEffect(() => {
      const host = node.current!
      const root = host.getRootNode()
      inject(root.nodeType === 9 || "host" in root ? (root as Document | ShadowRoot) : document)
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
      svg.setAttribute("viewBox", "0 0 400 320")
      svg.setAttribute("aria-hidden", "true")
      host.prepend(svg)

      let text: string | null = null
      const readout: Readout = {
        get textContent() { return text },
        set textContent(value) {
          const next = value ?? ""
          if (next === text) return
          text = next
          if (live.current) live.current.textContent = next
          try { read.current?.(next) } catch (err) { report(err) }
        },
      }
      const e = spec.mount({ stage: host, svg, read: readout }, scale(intensity, spec.range), props)
      if (text === null) readout.textContent = spec.rest
      engine.current = e
      return () => { e.destroy(); svg.remove(); engine.current = null }
      // mounts once; changes arrive through the effects below
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useIsoLayoutEffect(() => { engine.current?.set(scale(intensity, spec.range)) }, [intensity])

    const signature = JSON.stringify(own)
    useIsoLayoutEffect(() => { engine.current?.props?.(props) }, [signature])

    const setRef = React.useCallback((el: HTMLDivElement | null) => {
      node.current = el
      if (typeof ref === "function") ref(el)
      else if (ref) (ref as React.RefObject<HTMLDivElement | null>).current = el
    }, [ref])

    return (
      <div
        {...(attrs as React.ComponentProps<"div">)}
        ref={setRef}
        data-iso={spec.id}
        data-iso-theme={theme === "auto" ? undefined : theme}
        role={spec.focusable ? "group" : "img"}
        tabIndex={spec.focusable ? 0 : undefined}
        aria-label={named}
        style={{ aspectRatio: "5 / 4", ...style }}
      >
        {spec.focusable ? <span data-iso-live="" aria-live="polite" ref={live} /> : null}
      </div>
    )
  }
  Figure.displayName = name
  return Figure
}
