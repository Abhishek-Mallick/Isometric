import Link from "next/link"

import { Footer, Header } from "@/components/site/header"

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="mx-auto grid max-w-[1200px] place-items-start gap-3 px-5 py-24">
        <h1 className="text-3xl font-medium tracking-tight">This page isn’t on the drawing.</h1>
        <p className="text-muted-foreground">The link may be old. Every component is listed on the components page.</p>
        <Link href="/components" className="text-sm underline underline-offset-4">Go to components</Link>
      </main>
      <Footer />
    </>
  )
}
