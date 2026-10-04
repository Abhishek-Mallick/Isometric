"use client"

import * as React from "react"
import { Switch as SwitchPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"
import { IsoDepth, isoDepth, isoFace } from "@/registry/isometric/ui/isometric/iso-depth"

/** A block that slides along a recessed groove. */
function IsoSwitch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="iso-switch"
      className={cn(
        "peer group/switch relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-[3px] border border-[color:var(--iso-line,color-mix(in_oklab,var(--foreground)_62%,var(--background)))] bg-background px-[3px] outline-none",
        "shadow-[inset_2px_2px_0_0_var(--iso-side,var(--muted))] transition-colors duration-150",
        "data-[state=checked]:bg-[color-mix(in_oklab,var(--foreground)_10%,var(--background))]",
        "focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="iso-switch-thumb"
        className="group/iso pointer-events-none relative block size-4 -translate-x-px -translate-y-px transition-transform duration-200 ease-[cubic-bezier(0.2,0.7,0.1,1)] data-[state=checked]:translate-x-[calc(1.25rem-1px)] motion-reduce:transition-none"
        style={isoDepth(2)}
      >
        <IsoDepth sink={[]} />
        <span
          className={cn(
            isoFace,
            "block size-4 bg-background group-data-[state=checked]/switch:border-primary group-data-[state=checked]/switch:bg-primary",
          )}
        />
      </SwitchPrimitive.Thumb>
    </SwitchPrimitive.Root>
  )
}

export { IsoSwitch }
