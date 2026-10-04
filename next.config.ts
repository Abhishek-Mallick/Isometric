import type { NextConfig } from "next"

// Static export so the site and the registry JSON can be served from any
// static host. Set BASE_PATH when serving from a sub-path.
const basePath = process.env.BASE_PATH || ""

const config: NextConfig = {
  output: "export",
  basePath,
  images: { unoptimized: true },
  trailingSlash: true,
  agentRules: false,
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
}

export default config
