import * as React from "react"

import { cn } from "@/lib/utils"
import { MATERIAL, type BlockType } from "@/registry/isometric/lib/isometric/blocks"

/**
 * A block as a small static icon: three faces of a cube in the material's
 * tint, drawn in plain SVG with no script, so it renders on the server.
 * Used by the hotbar and the inventory, and anywhere a block stands for an
 * item.
 */

const LINE = "var(--iso-line, color-mix(in oklab, var(--foreground) 62%, var(--background)))"
const mix = (tint: string, pct: number) => `color-mix(in oklab, ${tint} ${pct}%, var(--background, #fff))`

const TOP = "16,3 28.5,10 16,17 3.5,10"
const LEFT = "3.5,10 16,17 16,30 3.5,23"
const RIGHT = "16,17 28.5,10 28.5,23 16,30"

type BlockIconProps = Omit<React.ComponentProps<"svg">, "children"> & {
  type: BlockType
  /** The accessible name; defaults to the material's name. Pass "" to hide it from assistive tech. */
  label?: string
}

function BlockIcon({ type, label, className, ...props }: BlockIconProps) {
  const tint = MATERIAL[type].tint
  const named = label ?? MATERIAL[type].label
  const side = type === "grass" ? MATERIAL.dirt.tint : tint
  const glass = type === "glass"
  return (
    <svg
      viewBox="0 0 32 32"
      data-slot="block-icon"
      role={named ? "img" : undefined}
      aria-label={named || undefined}
      aria-hidden={named ? undefined : true}
      className={cn("size-8 shrink-0", className)}
      strokeLinejoin="round"
      {...props}
    >
      <g stroke={LINE} strokeWidth="1">
        <polygon points={TOP} fill={glass ? "transparent" : mix(tint, 30)} />
        <polygon points={LEFT} fill={glass ? "transparent" : mix(side, 44)} />
        <polygon points={RIGHT} fill={glass ? "transparent" : mix(side, 58)} />
      </g>
      {type === "grass" ? (
        <g stroke={LINE} strokeWidth="0.8" fill={mix(tint, 40)}>
          <polygon points="3.5,10 16,17 16,20 13,19.5 10,17.5 7,16.5 3.5,13.5" />
          <polygon points="16,17 28.5,10 28.5,13.5 25,15.5 22,17.5 19,19 16,20" />
        </g>
      ) : null}
      <g stroke={LINE} strokeWidth="0.8" fill="none" opacity="0.7">
        {type === "planks" ? <path d="M3.5 14.5 16 21.5M3.5 19 16 26M16 21.5 28.5 14.5M16 26 28.5 19" /> : null}
        {type === "log" ? <path d="M16 6.5 22 10 16 13.5 10 10Z M8 14v6 M12 16.5v8 M20 17v9 M25 14v7" /> : null}
        {type === "stone" || type === "ore" ? <path d="M6 15l4 2 M11 22l3 1.5 M19 22l4-2 M22 14.5l3-1.5" /> : null}
        {type === "dirt" || type === "sand" ? <path d="M7 16h.5 M11 21h.5 M20 21h.5 M24 15h.5 M15 8h.5" /> : null}
        {type === "leaves" ? <path d="M7 14l2 2 M12 20l1.5-1.5 M20 18l2 2 M24 13l-1.5 1.5" /> : null}
        {glass ? <path d="M6 19l4-4 M8 21l3-3 M19 22l4-4" /> : null}
      </g>
      {type === "ore" ? (
        <g fill="var(--iso-accent, var(--primary))">
          <rect x="7" y="17" width="2" height="2" />
          <rect x="21" y="19" width="2" height="2" />
          <rect x="15" y="8" width="2" height="2" />
        </g>
      ) : null}
    </svg>
  )
}

/** One item in a slot: a block type and how many there are. */
type SlotItem = { type: BlockType; count?: number } | null

type BlockSlotProps = React.ComponentProps<"div"> & {
  item: SlotItem
  /** Draw it as the chosen slot. */
  selected?: boolean
}

/** A recessed square that holds one item, with its count in the corner. */
function BlockSlot({ item, selected = false, className, ...props }: BlockSlotProps) {
  return (
    <div
      data-slot="block-slot"
      data-selected={selected || undefined}
      className={cn(
        "relative grid size-11 shrink-0 place-items-center border border-[color:var(--iso-line,color-mix(in_oklab,var(--foreground)_62%,var(--background)))] bg-background",
        "shadow-[inset_3px_3px_0_0_var(--iso-side,var(--muted))] transition-[box-shadow,transform] duration-150",
        "data-[selected]:z-[1] data-[selected]:shadow-[inset_0_0_0_2px_var(--iso-accent,var(--primary))]",
        className,
      )}
      {...props}
    >
      {item ? <BlockIcon type={item.type} label="" className="size-7 transition-transform duration-150 in-data-[selected]:-translate-y-0.5" /> : null}
      {item && (item.count ?? 1) > 1 ? (
        <span className="absolute right-0.5 bottom-0 font-mono text-[10px] leading-none font-medium text-foreground tabular-nums">{item.count}</span>
      ) : null}
    </div>
  )
}

/** The words a screen reader hears for a slot. */
const slotLabel = (item: SlotItem) => (item ? `${MATERIAL[item.type].label}${(item.count ?? 1) > 1 ? `, ${item.count}` : ""}` : "Empty")

export { BlockIcon, BlockSlot, slotLabel, type BlockIconProps, type BlockSlotProps, type SlotItem }
