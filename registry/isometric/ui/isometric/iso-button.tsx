"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { IsoDepth, isoDepth, isoFace, isoSink } from "@/registry/isometric/ui/isometric/iso-depth"

const faceVariants = cva(
  "inline-flex w-full items-center justify-center gap-2 font-medium whitespace-nowrap select-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-background text-foreground group-hover/iso:bg-accent",
        solid: "border-primary bg-primary text-primary-foreground group-hover/iso:bg-primary/92",
        outline: "bg-background text-foreground",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        default: "h-9 px-4 text-sm",
        lg: "h-11 px-6 text-base",
        icon: "size-9",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
)

type IsoButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof faceVariants> & {
    /** How far the button stands off the page, in px. Default 4. */
    depth?: number
    /** Render the child element as the root, e.g. a link. */
    asChild?: boolean
  }

/** A button that stands on its own depth and sinks into it when pressed. */
function IsoButton({ className, variant, size, depth = 4, asChild = false, style, children, ...props }: IsoButtonProps) {
  const root = {
    "data-slot": "iso-button",
    className: cn(
      "group/iso relative inline-flex shrink-0 cursor-pointer rounded-[3px] outline-none disabled:pointer-events-none disabled:opacity-50 focus-visible:ring-[3px] focus-visible:ring-ring/50",
      className,
    ),
    style: isoDepth(depth, style),
  }
  const side =
    variant === "solid" ? "color-mix(in oklab, var(--primary) 78%, var(--background))" : variant === "outline" ? "var(--background)" : undefined
  const inner = (content: React.ReactNode) => (
    <>
      <IsoDepth side={side} />
      <span className={cn(isoFace, isoSink.active, faceVariants({ variant, size }))}>{content}</span>
    </>
  )

  // asChild: the child element (a link, say) becomes the root and keeps its own props
  if (asChild && React.isValidElement<{ children?: React.ReactNode; className?: string }>(children)) {
    return React.cloneElement(children, {
      ...props,
      ...root,
      className: cn(root.className, children.props.className),
      children: inner(children.props.children),
    } as React.Attributes)
  }

  return (
    <button type="button" {...props} {...root}>
      {inner(children)}
    </button>
  )
}

export { IsoButton, faceVariants as isoButtonVariants, type IsoButtonProps }
