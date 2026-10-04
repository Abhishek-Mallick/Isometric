"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

type HeartsMeterProps = Omit<React.ComponentProps<"div">, "children"> & {
  /** Health in hearts, in steps of a half. */
  value: number
  /** How many hearts make full health. Default 10. */
  max?: number
}

/** A pixel heart, nine by eight. */
const HEART = "M1 0h2v1h1v1h1V1h1V0h2v1h1v3H8v1H7v1H6v1H5v1H4V7H3V6H2V5H1V4H0V1h1Z"

/**
 * Health as a row of pixel hearts, with halves. A heart that is lost blinks
 * once. Reads as a meter to assistive tech.
 */
function HeartsMeter({ value, max = 10, className, ...props }: HeartsMeterProps) {
  const v = Math.max(0, Math.min(max, Math.round(value * 2) / 2))
  const prev = React.useRef(v)
  const [lost, setLost] = React.useState<[number, number] | null>(null)
  React.useEffect(() => {
    if (v < prev.current) {
      setLost([v, prev.current])
      const t = setTimeout(() => setLost(null), 700)
      prev.current = v
      return () => clearTimeout(t)
    }
    prev.current = v
  }, [v])
  const id = React.useId().replace(/:/g, "")
  return (
    <div
      role="meter"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={v}
      aria-label={props["aria-label"] ?? "Health"}
      aria-valuetext={`${v} of ${max} hearts`}
      data-slot="hearts-meter"
      className={cn("inline-flex gap-0.5", className)}
      {...props}
    >
      {Array.from({ length: max }, (_, i) => {
        const fill = Math.max(0, Math.min(1, v - i))
        const blinking = lost && i >= Math.floor(lost[0]) && i < Math.ceil(lost[1])
        return (
          <svg key={i} viewBox="-0.5 -0.5 10 9" className={cn("size-[18px]", blinking && "animate-pulse")} aria-hidden shapeRendering="crispEdges">
            <defs>
              <clipPath id={`${id}-${i}`}><rect x="-1" y="-1" width={1 + 9.5 * fill} height="10" /></clipPath>
            </defs>
            <path d={HEART} fill="var(--iso-side, var(--muted))" stroke="var(--iso-line, color-mix(in oklab, var(--foreground) 62%, var(--background)))" strokeWidth="0.7" />
            {fill > 0 ? <path d={HEART} clipPath={`url(#${id}-${i})`} fill="var(--iso-heart, var(--destructive, #e5484d))" stroke="var(--iso-line, color-mix(in oklab, var(--foreground) 62%, var(--background)))" strokeWidth="0.7" /> : null}
            {fill > 0 ? <rect x="2" y="1" width="1" height="1" fill="var(--background, #fff)" opacity="0.7" clipPath={`url(#${id}-${i})`} /> : null}
          </svg>
        )
      })}
    </div>
  )
}

export { HeartsMeter, type HeartsMeterProps }
