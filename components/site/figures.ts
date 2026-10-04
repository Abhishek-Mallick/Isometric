"use client"

import { Bars } from "@/registry/isometric/ui/isometric/bars"
import { Cube } from "@/registry/isometric/ui/isometric/cube"
import { Cylinders } from "@/registry/isometric/ui/isometric/cylinders"
import { Files } from "@/registry/isometric/ui/isometric/files"
import { Keys } from "@/registry/isometric/ui/isometric/keys"
import { Laptop } from "@/registry/isometric/ui/isometric/laptop"
import { Nodes } from "@/registry/isometric/ui/isometric/nodes"
import { Parcel } from "@/registry/isometric/ui/isometric/parcel"
import { PcCase } from "@/registry/isometric/ui/isometric/pc-case"
import { Heart } from "@/registry/isometric/ui/isometric/heart"
import { Reactor } from "@/registry/isometric/ui/isometric/reactor"
import { Pulley } from "@/registry/isometric/ui/isometric/pulley"
import { Rack } from "@/registry/isometric/ui/isometric/rack"
import { Skyline } from "@/registry/isometric/ui/isometric/skyline"
import { Stack } from "@/registry/isometric/ui/isometric/stack"
import { Steps } from "@/registry/isometric/ui/isometric/steps"

/** Every figure by registry name. Typed loosely: each takes the shared options. */
export const figures: Record<string, React.ComponentType<{ intensity?: number; onRead?: (t: string) => void; className?: string; "aria-label"?: string }>> = {
  skyline: Skyline, stack: Stack, keys: Keys, rack: Rack, laptop: Laptop, bars: Bars,
  steps: Steps, files: Files, cylinders: Cylinders, parcel: Parcel, nodes: Nodes, cube: Cube,
  "pc-case": PcCase, heart: Heart, reactor: Reactor, pulley: Pulley,
}
