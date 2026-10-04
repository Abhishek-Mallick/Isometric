import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * The depth every isometric primitive stands on, drawn in fine lines.
 *
 * A box in oblique projection is its face, the same outline offset by the
 * depth, and three diagonals joining their corners. `IsoDepth` draws the
 * offset outline and the diagonals behind a face; the face is the
 * component's own content. Pressing slides the face along the diagonal into
 * the outline and the diagonals fade, so only `transform` and `opacity`
 * animate.
 *
 * The root of a primitive carries `group/iso` and sets `--iso-d` (the depth)
 * through `isoDepth()`. It sinks while `:active`, or while it has
 * `data-pressed="true"`, or `data-state="inactive"` for tabs.
 *
 * Colours follow shadcn's tokens and can be overridden on any ancestor:
 *   --iso-line   the lines      (default: foreground mixed into background)
 *   --iso-side   the side faces (default: muted)
 */

/** The custom property that sets a primitive's depth, in px. */
export function isoDepth(depth: number, style?: React.CSSProperties): React.CSSProperties {
  return { "--iso-d": `${depth}px`, ...style } as React.CSSProperties
}

const LINE = "var(--iso-line, color-mix(in oklab, var(--foreground) 62%, var(--background)))"
const diagonal = `linear-gradient(to top right, transparent calc(50% - 0.6px), ${LINE} calc(50% - 0.6px), ${LINE} calc(50% + 0.6px), transparent calc(50% + 0.6px))`

/** Classes that sink a face into its depth. */
export const isoSink = {
  /** On press, for buttons, keys and anything clickable. */
  active: "group-active/iso:translate-x-(--iso-d) group-active/iso:translate-y-(--iso-d)",
  /** While the root says so. */
  pressed:
    "group-data-[pressed=true]/iso:translate-x-(--iso-d) group-data-[pressed=true]/iso:translate-y-(--iso-d) group-data-[state=on]/iso:translate-x-(--iso-d) group-data-[state=on]/iso:translate-y-(--iso-d)",
  /** For tabs: the ones not chosen are pressed flat. */
  inactive:
    "group-data-[state=inactive]/iso:translate-x-(--iso-d) group-data-[state=inactive]/iso:translate-y-(--iso-d)",
}

const fade = {
  active: "group-active/iso:opacity-0",
  pressed: "group-data-[pressed=true]/iso:opacity-0 group-data-[state=on]/iso:opacity-0",
  inactive: "group-data-[state=inactive]/iso:opacity-0",
}

/** The face's base classes: on top of its depth, moving on a short ease. */
export const isoFace =
  "relative z-[1] rounded-[3px] border border-[color:var(--iso-line,color-mix(in_oklab,var(--foreground)_62%,var(--background)))] transition-[translate,background-color,color] duration-150 ease-[cubic-bezier(0.2,0.7,0.1,1)] motion-reduce:transition-none"

type IsoDepthProps = React.ComponentProps<"span"> & {
  /** Which states sink the face, so the diagonals know when to fade. */
  sink?: (keyof typeof isoSink)[]
  /** Fill of the side faces. */
  side?: string
}

/** The offset outline and the three diagonals. Place it first inside a `relative group/iso` root. */
export function IsoDepth({ className, sink = ["active"], side, style, ...props }: IsoDepthProps) {
  return (
    <span aria-hidden data-slot="iso-depth" className={cn("pointer-events-none absolute inset-0", className)} style={style} {...props}>
      <span
        className="absolute inset-0 translate-x-(--iso-d) translate-y-(--iso-d) rounded-[3px] border border-[color:var(--iso-line,color-mix(in_oklab,var(--foreground)_62%,var(--background)))]"
        style={{ background: side ?? "var(--iso-side, var(--muted))" }}
      />
      <span
        className={cn(
          "absolute top-0 left-0 right-[calc(var(--iso-d)*-1)] bottom-[calc(var(--iso-d)*-1)] transition-opacity duration-150 motion-reduce:transition-none",
          sink.map((s) => fade[s]),
        )}
        style={{
          backgroundImage: `${diagonal}, ${diagonal}, ${diagonal}`,
          backgroundPosition: "100% 0, 100% 100%, 0 100%",
          backgroundSize: "var(--iso-d) var(--iso-d)",
          backgroundRepeat: "no-repeat",
        }}
      />
    </span>
  )
}
