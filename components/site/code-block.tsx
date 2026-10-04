import { cn } from "@/lib/utils"
import { highlight } from "@/lib/highlight"
import { CopyButton } from "@/components/site/copy-button"

/** Highlighted code with a copy button; `title` names the file. */
export async function CodeBlock({ code, lang = "tsx", title, className }: { code: string; lang?: "tsx" | "ts" | "bash" | "json" | "css"; title?: string; className?: string }) {
  const html = await highlight(code, lang)
  return (
    <div className={cn("overflow-hidden rounded-lg border bg-card", className)}>
      <div className="flex h-9 items-center justify-between border-b pr-1.5 pl-3.5 text-xs text-muted-foreground">
        <span className="truncate font-mono">{title ?? lang}</span>
        <CopyButton value={code} />
      </div>
      <div className="max-h-[520px] overflow-auto px-4 py-3" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  )
}
