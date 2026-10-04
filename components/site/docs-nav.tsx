import Link from "next/link"

import { cn } from "@/lib/utils"
import { categoryLabels, docItems } from "@/registry/index"

/** The side index of every page, grouped as the registry groups them. */
export function DocsNav({ current }: { current?: string }) {
  const link = (href: string, label: string, active: boolean) => (
    <Link
      key={href}
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "block rounded-md px-2.5 py-1 text-sm transition-colors",
        active ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </Link>
  )
  return (
    <nav aria-label="Docs" className="grid gap-6">
      <div className="grid gap-0.5">
        <p className="px-2.5 pb-1 text-xs font-medium text-foreground">Getting started</p>
        {link("/docs", "Installation", current === "docs")}
        {link("/docs#theming", "Theming", false)}
        {link("/components", "All components", current === "components")}
      </div>
      {(["figure", "ui", "foundation"] as const).map((cat) => (
        <div key={cat} className="grid gap-0.5">
          <p className="px-2.5 pb-1 text-xs font-medium text-foreground">{categoryLabels[cat]}</p>
          {docItems.filter((i) => i.category === cat).map((i) => link(`/components/${i.name}`, i.title, current === i.name))}
        </div>
      ))}
    </nav>
  )
}

/** The two-column frame for docs pages. */
export function DocsShell({ current, children }: { current?: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto grid max-w-[1200px] gap-10 px-5 py-10 lg:grid-cols-[200px_minmax(0,1fr)]">
      <aside className="hidden lg:block">
        <div className="sticky top-20 max-h-[calc(100dvh-6rem)] overflow-y-auto pb-6"><DocsNav current={current} /></div>
      </aside>
      <main className="min-w-0">{children}</main>
    </div>
  )
}
