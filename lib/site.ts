export const siteConfig = {
  name: "Isometric",
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "https://isometric.buildlab.in").replace(/\/$/, ""),
  description: "Isometric line figures and UI primitives for React. Drawings that answer the pointer, and components that stand on their own depth. Installable with the shadcn CLI.",
  github: "https://github.com/Abhishek-Mallick/Isometric",
}

/** A path on this site, under the base path when it is served from one (GitHub Pages without a custom domain). */
export const withBase = (path: string) => `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}${path}`

export const registryUrl = `${siteConfig.url}/r`

/** The shadcn command for an item, by namespace or by URL. */
export function installCommand(name: string, mode: "namespace" | "url" = "namespace") {
  return `npx shadcn@latest add ${mode === "namespace" ? `@isometric/${name}` : `${registryUrl}/${name}.json`}`
}
