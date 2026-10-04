import Link from "next/link"

import { siteConfig, withBase } from "@/lib/site"
import { Logo } from "@/components/site/logo"
import { ThemeToggle } from "@/components/site/theme-toggle"

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-14 max-w-[1200px] items-center gap-6 px-5">
        <Link href="/" className="flex items-center gap-2 rounded-sm font-medium tracking-tight focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
          <Logo className="size-5" />
          Isometric
          <span className="text-xs font-normal text-muted-foreground">v0.2</span>
        </Link>
        <nav className="ml-auto flex items-center gap-1 text-sm text-muted-foreground">
          <Link href="/components" className="rounded-md px-2.5 py-1.5 transition-colors hover:text-foreground">Components</Link>
          <Link href="/playground" className="rounded-md px-2.5 py-1.5 transition-colors hover:text-foreground">Playground</Link>
          <Link href="/docs" className="rounded-md px-2.5 py-1.5 transition-colors hover:text-foreground">Docs</Link>
          <a href={siteConfig.github} className="hidden rounded-md px-2.5 py-1.5 transition-colors hover:text-foreground sm:block">GitHub</a>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  )
}

export function Footer() {
  return (
    <footer className="border-t border-border/70">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-x-6 gap-y-2 px-5 py-8 text-sm text-muted-foreground">
        <span className="flex items-center gap-2 text-foreground"><Logo className="size-4" /> Isometric</span>
        <span>MIT licensed. Built by <a className="underline-offset-4 hover:text-foreground hover:underline" href="https://github.com/Abhishek-Mallick">Abhishek Mallick</a>.</span>
        <span className="ml-auto flex gap-5">
          <a className="hover:text-foreground" href={withBase("/llms.txt")}>llms.txt</a>
          <a className="hover:text-foreground" href={withBase("/r/registry.json")}>registry.json</a>
          <a className="hover:text-foreground" href={siteConfig.github}>Source</a>
        </span>
      </div>
    </footer>
  )
}
