"use client"

import { World } from "@/registry/isometric/ui/isometric/world"

/** The playground's world, sized to the window. */
export function WorldView() {
  return <World className="[&>div:first-child]:h-[min(78dvh,820px)]" />
}
