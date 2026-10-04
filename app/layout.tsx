import type { Metadata, Viewport } from "next"
import { GeistMono } from "geist/font/mono"
import { GeistSans } from "geist/font/sans"

import { siteConfig } from "@/lib/site"

import "./globals.css"

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: { default: "Isometric: line figures and UI for React", template: "%s · Isometric" },
  description: siteConfig.description,
  openGraph: { title: "Isometric", description: siteConfig.description, url: siteConfig.url, siteName: "Isometric", type: "website" },
  twitter: { card: "summary_large_image", title: "Isometric", description: siteConfig.description },
  alternates: { types: { "text/plain": `${siteConfig.url}/llms.txt` } },
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f7f8" },
    { media: "(prefers-color-scheme: dark)", color: "#0c1a2c" },
  ],
}

// Sets the theme before paint, so a dark reader never sees paper flash.
const themeScript = `try{var t=localStorage.getItem("theme");if(t==="dark"||(!t&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark")}catch(e){}`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh font-sans">{children}</body>
    </html>
  )
}
