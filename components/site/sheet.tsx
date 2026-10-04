"use client"

import * as React from "react"
import Link from "next/link"

import { cn } from "@/lib/utils"
import { figures } from "@/components/site/figures"
import { IsoGrid } from "@/registry/isometric/ui/isometric/iso-grid"
import { IsoSlider } from "@/registry/isometric/ui/isometric/iso-slider"

/**
 * A drawing sheet: the figure on an isometric grid, with a title block in the
 * corner that reads what the figure is doing. With `controls`, the block also
 * holds the intensity slider.
 */
export function Sheet({ name, title, controls = false, className, defaultIntensity = 0.5 }: {
  name: string
  title: string
  controls?: boolean
  className?: string
  defaultIntensity?: number
}) {
  const Figure = figures[name]
  const [read, setRead] = React.useState("")
  const [intensity, setIntensity] = React.useState(defaultIntensity)
  return (
    <figure className={cn("relative overflow-hidden rounded-lg border bg-card", className)}>
      <IsoGrid className="absolute inset-0" cell={22} />
      <div className="relative mx-auto max-w-[620px] px-4 pt-4">
        <Figure intensity={intensity} onRead={setRead} />
      </div>
      <figcaption className="relative flex flex-wrap items-stretch border-t text-sm">
        <span className="flex min-w-28 items-center border-r px-4 py-2.5 font-medium">{title}</span>
        <span className="flex min-w-36 flex-1 items-center px-4 py-2.5 font-mono text-[12px] text-muted-foreground tabular-nums" aria-live="polite">
          {read || " "}
        </span>
        {controls ? (
          <label className="flex w-full items-center gap-3 border-t px-4 py-1.5 sm:w-64 sm:border-t-0 sm:border-l">
            <span className="text-muted-foreground">Intensity</span>
            <IsoSlider
              aria-label="Intensity"
              value={[intensity]}
              onValueChange={([v]) => setIntensity(v)}
              min={0}
              max={1}
              step={0.05}
              className="flex-1"
            />
            <span className="w-8 text-right font-mono text-[12px] tabular-nums">{intensity.toFixed(2)}</span>
          </label>
        ) : null}
      </figcaption>
    </figure>
  )
}

/** A small plate for the catalogue: the figure, its name and its live caption. */
export function Plate({ name, title, href }: { name: string; title: string; href: string }) {
  const Figure = figures[name]
  const [read, setRead] = React.useState("")
  return (
    <Link
      href={href}
      className="group relative block overflow-hidden rounded-lg border bg-card transition-colors hover:border-[color-mix(in_oklab,var(--ink)_45%,var(--border))] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <div className="px-3 pt-3"><Figure onRead={setRead} aria-label={title} /></div>
      <div className="flex items-baseline justify-between gap-3 border-t px-3.5 py-2.5 text-sm">
        <span className="font-medium">{title}</span>
        <span className="truncate font-mono text-[11px] text-muted-foreground tabular-nums">{read}</span>
      </div>
    </Link>
  )
}
