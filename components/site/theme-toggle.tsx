"use client"

import * as React from "react"

/** Paper or blueprint. */
export function ThemeToggle() {
  const [dark, setDark] = React.useState<boolean | null>(null)
  React.useEffect(() => setDark(document.documentElement.classList.contains("dark")), [])
  const toggle = () => {
    const next = !document.documentElement.classList.contains("dark")
    document.documentElement.classList.toggle("dark", next)
    try { localStorage.setItem("theme", next ? "dark" : "light") } catch {}
    setDark(next)
  }
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Switch to paper (light)" : "Switch to blueprint (dark)"}
      className="inline-flex size-8 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <svg viewBox="0 0 20 20" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
        <rect x="3" y="3" width="14" height="14" rx="1.5" />
        <path d="M3 17 17 3" />
        <path d="M17 3v14H3z" fill="currentColor" fillOpacity={0.9} stroke="none" className="dark:opacity-0" />
        <path d="M3 3h14L3 17z" fill="currentColor" fillOpacity={0.9} stroke="none" className="opacity-0 dark:opacity-100" />
      </svg>
    </button>
  )
}
