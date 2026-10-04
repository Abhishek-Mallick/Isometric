"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { CopyButton } from "@/components/site/copy-button"

export type InstallData = Record<string, { code: string; html: string }>

const PMS = ["pnpm", "npm", "yarn", "bun"] as const

/** The add command for an item, by package manager, with or without the namespace. */
export function InstallTabs({ commands }: { commands: InstallData }) {
  const [pm, setPm] = React.useState<(typeof PMS)[number]>("pnpm")
  const [mode, setMode] = React.useState<"namespace" | "url">("namespace")
  const current = commands[`${mode}:${pm}`]
  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <div className="flex h-9 items-center border-b pr-1.5 pl-1.5 text-xs">
        <div role="tablist" aria-label="Package manager" className="flex">
          {PMS.map((p) => (
            <button
              key={p}
              role="tab"
              aria-selected={p === pm}
              onClick={() => setPm(p)}
              className={cn("h-7 cursor-pointer rounded-md px-2.5 transition-colors", p === pm ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
            >
              {p}
            </button>
          ))}
        </div>
        <button
          onClick={() => setMode(mode === "namespace" ? "url" : "namespace")}
          className="ml-auto h-7 cursor-pointer rounded-md px-2 text-muted-foreground transition-colors hover:text-foreground"
        >
          {mode === "namespace" ? "Use URL" : "Use @isometric"}
        </button>
        <CopyButton value={current.code} />
      </div>
      <div className="overflow-x-auto px-4 py-3" dangerouslySetInnerHTML={{ __html: current.html }} />
    </div>
  )
}
