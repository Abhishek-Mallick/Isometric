"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { BlockSlot, slotLabel, type SlotItem } from "@/registry/isometric/ui/isometric/block-icon"

type InventoryProps = Omit<React.ComponentProps<"div">, "onChange" | "defaultValue"> & {
  items: SlotItem[]
  /** Slots per row. Default 9. */
  columns?: number
  /** Total slots; extra ones are empty. Defaults to the item count rounded up to whole rows. */
  size?: number
  value?: number
  defaultValue?: number
  onValueChange?: (index: number) => void
}

/** A grid of slots. Click one, or move with the arrow keys while it has focus. */
function Inventory({ items, columns = 9, size, value, defaultValue = 0, onValueChange, className, ...props }: InventoryProps) {
  const total = size ?? Math.max(columns, Math.ceil(items.length / columns) * columns)
  const [inner, setInner] = React.useState(defaultValue)
  const current = value ?? inner
  const choose = (i: number) => {
    const next = Math.max(0, Math.min(total - 1, i))
    if (value === undefined) setInner(next)
    onValueChange?.(next)
  }
  const id = React.useId()
  return (
    <div
      role="listbox"
      aria-label={props["aria-label"] ?? "Inventory"}
      aria-activedescendant={`${id}-${current}`}
      tabIndex={0}
      data-slot="inventory"
      onKeyDown={(e) => {
        const step = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: columns, ArrowUp: -columns }[e.key]
        if (step) { e.preventDefault(); choose(current + step) }
      }}
      className={cn(
        "inline-grid w-fit border border-[color:var(--iso-line,color-mix(in_oklab,var(--foreground)_62%,var(--background)))] bg-[color-mix(in_oklab,var(--muted)_60%,var(--background))] p-1 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
        className,
      )}
      style={{ gridTemplateColumns: `repeat(${columns}, auto)` }}
      {...props}
    >
      {Array.from({ length: total }, (_, i) => (
        <BlockSlot
          key={i}
          id={`${id}-${i}`}
          role="option"
          aria-selected={i === current}
          aria-label={slotLabel(items[i] ?? null)}
          item={items[i] ?? null}
          selected={i === current}
          onClick={() => choose(i)}
          className="-mt-px -ml-px"
        />
      ))}
    </div>
  )
}

export { Inventory, type InventoryProps }
