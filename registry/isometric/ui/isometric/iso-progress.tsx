import * as React from "react"

import { cn } from "@/lib/utils"
import { IsoDepth, isoDepth, isoFace } from "@/registry/isometric/ui/isometric/iso-depth"

type IsoProgressProps = Omit<React.ComponentProps<"div">, "children"> & {
  /** 0 to 100. */
  value?: number
  /** How many blocks the bar is made of. Default 12. */
  segments?: number
}

/** Progress as a row of blocks: each filled block stands up, each empty one lies flat. */
function IsoProgress({ className, value = 0, segments = 12, ...props }: IsoProgressProps) {
  const v = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0))
  const n = Math.max(1, Math.round(segments))
  const filled = Math.round((v / 100) * n)
  return (
    <div
      data-slot="iso-progress"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(v)}
      className={cn("flex w-full gap-1 pr-[3px] pb-[3px]", className)}
      {...props}
    >
      {Array.from({ length: n }, (_, i) => (
        <span key={i} data-pressed={i >= filled} className="group/iso relative h-3 flex-1" style={isoDepth(3)}>
          <IsoDepth sink={["pressed"]} />
          <span
            className={cn(
              isoFace,
              "block h-full w-full group-data-[pressed=true]/iso:translate-x-(--iso-d) group-data-[pressed=true]/iso:translate-y-(--iso-d)",
              i < filled ? "border-primary bg-primary" : "bg-background",
            )}
            style={{ transitionDelay: `${i * 18}ms` }}
          />
        </span>
      ))}
    </div>
  )
}

export { IsoProgress, type IsoProgressProps }
