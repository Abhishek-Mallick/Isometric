import * as React from "react"

import { cn } from "@/lib/utils"
import { IsoDepth, isoDepth, isoFace, isoSink } from "@/registry/isometric/ui/isometric/iso-depth"

type IsoKbdProps = React.ComponentProps<"kbd"> & {
  /** Hold the key down. */
  pressed?: boolean
  /** Depth in px. Default 3. */
  depth?: number
}

/** A keycap for shortcuts. `pressed` sinks it, for showing a key being held. */
function IsoKbd({ className, pressed = false, depth = 3, style, children, ...props }: IsoKbdProps) {
  return (
    <kbd
      data-slot="iso-kbd"
      data-pressed={pressed}
      className="group/iso relative mr-(--iso-d) mb-(--iso-d) inline-flex align-middle"
      style={isoDepth(depth, style)}
      {...props}
    >
      <IsoDepth sink={["pressed"]} />
      <span
        className={cn(
          isoFace,
          isoSink.pressed,
          "inline-flex h-6 min-w-6 items-center justify-center gap-1 bg-background px-1.5 font-mono text-[11px] font-medium text-foreground [&_svg:not([class*='size-'])]:size-3",
          className,
        )}
      >
        {children}
      </span>
    </kbd>
  )
}

export { IsoKbd, type IsoKbdProps }
