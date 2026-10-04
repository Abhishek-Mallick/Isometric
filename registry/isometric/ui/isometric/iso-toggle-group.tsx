"use client"

import * as React from "react"
import { ToggleGroup as ToggleGroupPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"
import { IsoDepth, isoDepth, isoFace, isoSink } from "@/registry/isometric/ui/isometric/iso-depth"

/** A row of keys. A key that is on stays pressed down. */
function IsoToggleGroup({ className, ...props }: React.ComponentProps<typeof ToggleGroupPrimitive.Root>) {
  return (
    <ToggleGroupPrimitive.Root
      data-slot="iso-toggle-group"
      className={cn("inline-flex w-fit items-center gap-1.5 pr-1 pb-1", className)}
      {...props}
    />
  )
}

function IsoToggleGroupItem({ className, children, style, ...props }: React.ComponentProps<typeof ToggleGroupPrimitive.Item>) {
  return (
    <ToggleGroupPrimitive.Item
      data-slot="iso-toggle-group-item"
      className="group/iso relative inline-flex cursor-pointer rounded-[3px] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
      style={isoDepth(3, style)}
      {...props}
    >
      <IsoDepth sink={["active", "pressed"]} />
      <span
        className={cn(
          isoFace,
          isoSink.active,
          isoSink.pressed,
          "inline-flex h-8 min-w-8 items-center justify-center gap-1.5 bg-background px-2.5 text-sm font-medium text-foreground group-data-[state=on]/iso:bg-[color-mix(in_oklab,var(--foreground)_9%,var(--background))] [&_svg:not([class*='size-'])]:size-4",
          className,
        )}
      >
        {children}
      </span>
    </ToggleGroupPrimitive.Item>
  )
}

export { IsoToggleGroup, IsoToggleGroupItem }
