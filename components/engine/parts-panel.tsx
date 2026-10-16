import * as React from "react"

import { cn } from "@/lib/utils"
import { PART, PARTS, type Kind, type PartId } from "@/anatomy/assembly"

const GROUPS: { kind: Kind; title: string }[] = [
  { kind: "housing", title: "Housing" },
  { kind: "moving", title: "Moving parts" },
  { kind: "air", title: "Intake" },
  { kind: "exhaust", title: "Exhaust" },
]

/** Every part by what it does; hovering one lights it in the drawing, clicking isolates it. */
export function PartsList({
  focus,
  hover,
  onHover,
  onFocus,
}: {
  focus: PartId | null
  hover: PartId | null
  onHover: (id: PartId | null) => void
  onFocus: (id: PartId | null) => void
}) {
  return (
    <div className="grid gap-3" onPointerLeave={() => onHover(null)}>
      {GROUPS.map(({ kind, title }) => (
        <div key={kind} className="grid gap-1">
          <h3 className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{title}</h3>
          <ul className="flex flex-wrap gap-1">
            {PARTS.filter((p) => p.kind === kind).map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  aria-pressed={focus === p.id}
                  onPointerEnter={() => onHover(p.id)}
                  onFocus={() => onHover(p.id)}
                  onBlur={() => onHover(null)}
                  onClick={() => onFocus(focus === p.id ? null : p.id)}
                  className={cn(
                    "rounded-[3px] border px-2 py-1 text-[12px] transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                    focus === p.id
                      ? "border-ink bg-[color-mix(in_oklab,var(--ink)_12%,var(--background))] text-foreground"
                      : hover === p.id
                        ? "border-[color-mix(in_oklab,var(--ink)_50%,var(--border))] text-foreground"
                        : "border-border text-muted-foreground hover:text-foreground",
                  )}
                >
                  {p.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

/** The isolated part: what it is, what it does, and its figures. */
export function PartCard({ id, onClose }: { id: PartId; onClose: () => void }) {
  const p = PART[id]
  return (
    <div className="grid gap-2 rounded-md border border-ink/50 bg-card/95 p-3 shadow-sm backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div className="grid gap-0.5">
          <span className="font-mono text-[10px] tracking-wider text-ink uppercase">Isolated</span>
          <h3 className="text-sm font-medium">{p.name}</h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          aria-label="Clear isolation"
        >
          Esc
        </button>
      </div>
      <p className="text-[12.5px] leading-snug text-muted-foreground">{p.job}</p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 font-mono text-[11px]">
        {p.facts.map(([k, v]) => (
          <React.Fragment key={k}>
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="tabular-nums">{v}</dd>
          </React.Fragment>
        ))}
      </dl>
    </div>
  )
}
