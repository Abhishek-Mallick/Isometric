"use client"

import * as React from "react"
import { Slider as SliderPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"
import { IsoDepth, isoDepth, isoFace } from "@/registry/isometric/ui/isometric/iso-depth"

type IsoSliderProps = React.ComponentProps<typeof SliderPrimitive.Root> & {
  /** Draw a tick at each step, up to 40 of them. */
  ticks?: boolean
}

/** A rail with a cube riding it. */
function IsoSlider({ className, defaultValue, value, min = 0, max = 100, step = 1, ticks = false, ...props }: IsoSliderProps) {
  const values = React.useMemo(
    () => (Array.isArray(value) ? value : Array.isArray(defaultValue) ? defaultValue : [min]),
    [value, defaultValue, min],
  )
  const count = Math.round((max - min) / step)
  return (
    <SliderPrimitive.Root
      data-slot="iso-slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      step={step}
      className={cn(
        "relative flex w-full touch-none items-center py-3 select-none data-[disabled]:opacity-50 data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-40 data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col",
        className,
      )}
      {...props}
    >
      <SliderPrimitive.Track
        data-slot="iso-slider-track"
        className="relative grow rounded-[2px] border border-[color:var(--iso-line,color-mix(in_oklab,var(--foreground)_62%,var(--background)))] bg-background shadow-[inset_1px_1px_0_0_var(--iso-side,var(--muted))] data-[orientation=horizontal]:h-2 data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-2"
      >
        {ticks && count > 0 && count <= 40 ? (
          <span
            aria-hidden
            className="absolute inset-x-0 top-full mt-1.5 h-1.5 opacity-60"
            style={{
              backgroundImage: "linear-gradient(to right, var(--iso-line, var(--muted-foreground)) 1px, transparent 1px)",
              backgroundSize: `calc((100% - 1px) / ${count}) 100%`,
            }}
          />
        ) : null}
        <SliderPrimitive.Range
          data-slot="iso-slider-range"
          className="absolute bg-[color-mix(in_oklab,var(--foreground)_75%,var(--background))] data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full"
        />
      </SliderPrimitive.Track>
      {values.map((_, i) => (
        <SliderPrimitive.Thumb
          data-slot="iso-slider-thumb"
          key={i}
          className="group/iso relative block size-4 -translate-x-[1.5px] -translate-y-[1.5px] cursor-grab rounded-[3px] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 active:cursor-grabbing disabled:pointer-events-none"
          style={isoDepth(3)}
        >
          <IsoDepth />
          <span className={cn(isoFace, "block size-4 bg-background group-active/iso:translate-x-(--iso-d) group-active/iso:translate-y-(--iso-d)")} />
        </SliderPrimitive.Thumb>
      ))}
    </SliderPrimitive.Root>
  )
}

export { IsoSlider, type IsoSliderProps }
