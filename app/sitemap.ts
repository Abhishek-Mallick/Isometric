import type { MetadataRoute } from "next"

import { siteConfig } from "@/lib/site"
import { docItems } from "@/registry/index"

export const dynamic = "force-static"

export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/components", "/playground", "/engine", "/docs", ...docItems.map((i) => `/components/${i.name}`)].map((p) => ({ url: `${siteConfig.url}${p}/` }))
}
