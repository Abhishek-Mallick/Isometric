import * as React from "react"

import { cn } from "@/lib/utils"

type XpBarProps = Omit<React.ComponentProps<"div">, "children"> & {
  /** The current level. */
  level: number
  /** Progress through this level, from 0 to 1. */
  value: number
  /** How many segments the bar is made of. Default 18. */
  segments?: number
}

/** Experience: a segmented bar with the level standing over its middle. */
function XpBar({ level, value, segments = 18, className, ...props }: XpBarProps) {
  const v = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0))
  const lit = Math.round(v * segments)
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(v * 100)}
      aria-valuetext={`Level ${level}, ${Math.round(v * 100)}% to the next`}
      aria-label={props["aria-label"] ?? "Experience"}
      data-slot="xp-bar"
      className={cn("relative grid w-full max-w-md justify-items-center gap-1 pt-1", className)}
      {...props}
    >
      <span className="font-mono text-sm leading-none font-semibold text-[color:var(--iso-xp,var(--primary))] tabular-nums [text-shadow:1px_1px_0_var(--background)]">{level}</span>
      <div className="flex h-2 w-full border border-[color:var(--iso-line,color-mix(in_oklab,var(--foreground)_62%,var(--background)))] bg-background shadow-[inset_1px_1px_0_0_var(--iso-side,var(--muted))]">
        {Array.from({ length: segments }, (_, i) => (
          <span
            key={i}
            className={cn("h-full flex-1 border-r border-[color:var(--iso-side,var(--muted))] transition-colors duration-200 last:border-r-0", i < lit && "bg-[color:var(--iso-xp,var(--primary))]")}
            style={{ transitionDelay: `${i * 12}ms` }}
          />
        ))}
      </div>
    </div>
  )
}

export { XpBar, type XpBarProps }
