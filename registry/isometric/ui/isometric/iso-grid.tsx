import * as React from "react"

import { cn } from "@/lib/utils"

type IsoGridProps = React.ComponentProps<"div"> & {
  /** The side of one lattice cell, in px. Default 28. */
  cell?: number
  /** Fade the lattice out toward the edges. Default true. */
  fade?: boolean
}

/**
 * An isometric lattice to put behind content: three families of fine lines at
 * 30°, 150° and 90°, as one repeating SVG. Size and position it like any
 * block, e.g. `absolute inset-0 -z-10`.
 */
function IsoGrid({ className, cell = 28, fade = true, style, ...props }: IsoGridProps) {
  const id = React.useId().replace(/:/g, "")
  const w = cell * Math.sqrt(3), h = cell
  return (
    <div
      aria-hidden
      data-slot="iso-grid"
      className={cn("pointer-events-none text-[color:var(--iso-grid,var(--border))]", className)}
      style={{
        ...(fade ? { maskImage: "radial-gradient(ellipse at center, #000 35%, transparent 75%)", WebkitMaskImage: "radial-gradient(ellipse at center, #000 35%, transparent 75%)" } : null),
        ...style,
      }}
      {...props}
    >
      <svg width="100%" height="100%">
        <defs>
          <pattern id={`iso-grid-${id}`} width={w} height={h * 2} patternUnits="userSpaceOnUse">
            <path
              d={`M0 0L${w} ${h}M0 ${h * 2}L${w} ${h}M0 ${h}L${w} 0M0 ${h}L${w} ${h * 2}M0 0V${h * 2}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#iso-grid-${id})`} />
      </svg>
    </div>
  )
}

export { IsoGrid, type IsoGridProps }
