import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * A recessed well: the opposite of a raised slab. The inner walls along the
 * top and left read as depth going into the page.
 */
function IsoInput({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="iso-input"
      className={cn(
        "flex h-9 w-full min-w-0 rounded-[3px] border border-[color:var(--iso-line,color-mix(in_oklab,var(--foreground)_62%,var(--background)))] bg-background px-3 py-1 text-sm text-foreground",
        "shadow-[inset_3px_3px_0_0_var(--iso-side,var(--muted))] transition-[box-shadow,border-color] duration-150 outline-none",
        "placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground",
        "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium",
        "focus-visible:shadow-[inset_1px_1px_0_0_var(--iso-side,var(--muted))] focus-visible:ring-[3px] focus-visible:ring-ring/40",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20",
        className,
      )}
      {...props}
    />
  )
}

export { IsoInput }
