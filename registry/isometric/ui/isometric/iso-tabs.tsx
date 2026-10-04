"use client"

import * as React from "react"
import { Tabs as TabsPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"
import { IsoDepth, isoDepth, isoFace, isoSink } from "@/registry/isometric/ui/isometric/iso-depth"

function IsoTabs({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return <TabsPrimitive.Root data-slot="iso-tabs" className={cn("flex flex-col gap-4", className)} {...props} />
}

/** A row of tiles. The chosen tile stands up; the rest are pressed flat. */
function IsoTabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return <TabsPrimitive.List data-slot="iso-tabs-list" className={cn("inline-flex w-fit items-center gap-1.5 pr-1 pb-1", className)} {...props} />
}

function IsoTabsTrigger({ className, children, style, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="iso-tabs-trigger"
      className="group/iso relative inline-flex cursor-pointer rounded-[3px] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
      style={isoDepth(3, style)}
      {...props}
    >
      <IsoDepth sink={["inactive"]} />
      <span
        className={cn(
          isoFace,
          isoSink.inactive,
          "inline-flex h-8 items-center gap-1.5 bg-background px-3 text-sm font-medium whitespace-nowrap text-muted-foreground group-data-[state=active]/iso:text-foreground group-hover/iso:text-foreground [&_svg:not([class*='size-'])]:size-4",
          className,
        )}
      >
        {children}
      </span>
    </TabsPrimitive.Trigger>
  )
}

function IsoTabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content data-slot="iso-tabs-content" className={cn("flex-1 outline-none", className)} {...props} />
}

export { IsoTabs, IsoTabsList, IsoTabsTrigger, IsoTabsContent }
