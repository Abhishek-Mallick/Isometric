import type { Metadata } from "next"

import { registryUrl, withBase } from "@/lib/site"
import { CodeBlock } from "@/components/site/code-block"
import { DocsShell } from "@/components/site/docs-nav"
import { Footer, Header } from "@/components/site/header"

export const metadata: Metadata = { title: "Installation", description: "Install Isometric with the shadcn CLI and theme it with your own tokens." }

const H2 = ({ id, children }: { id: string; children: React.ReactNode }) => (
  <h2 id={id} className="scroll-mt-20 pt-4 text-xl font-medium tracking-tight">{children}</h2>
)
const P = ({ children }: { children: React.ReactNode }) => <p className="max-w-[68ch] leading-relaxed text-muted-foreground">{children}</p>
const C = ({ children }: { children: React.ReactNode }) => <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em] text-foreground">{children}</code>

export default function Docs() {
  return (
    <>
      <Header />
      <DocsShell current="docs">
        <article className="grid gap-5">
          <h1 className="text-3xl font-medium tracking-tight">Installation</h1>
          <P>
            Isometric is a shadcn registry: the CLI copies each component’s source into your project, so you own it and can change anything.
            It needs React 19, Tailwind CSS v4 and a <C>components.json</C>.
          </P>

          <H2 id="setup">1. Set up shadcn</H2>
          <P>Skip this if your project already has a <C>components.json</C>.</P>
          <CodeBlock lang="bash" code="npx shadcn@latest init" />

          <H2 id="add">2. Add components</H2>
          <P>Add any item by name, or everything at once. Figures bring the engine with them, and primitives bring the depth they stand on.</P>
          <CodeBlock lang="bash" code={`npx shadcn@latest add @isometric/skyline @isometric/iso-button\nnpx shadcn@latest add @isometric/all`} />
          <P>If your CLI does not know the <C>@isometric</C> namespace yet, register it once in <C>components.json</C>, or add items by URL:</P>
          <CodeBlock lang="json" title="components.json" code={`{\n  "registries": {\n    "@isometric": "${registryUrl}/{name}.json"\n  }\n}`} />
          <CodeBlock lang="bash" code={`npx shadcn@latest add ${registryUrl}/skyline.json`} />

          <H2 id="use">3. Use them</H2>
          <P>Components land in <C>components/ui/isometric</C> and the figure engine in <C>lib/isometric</C>.</P>
          <CodeBlock
            title="app/page.tsx"
            code={`import { Stack } from "@/components/ui/isometric/stack"\nimport { IsoButton } from "@/components/ui/isometric/iso-button"\n\nexport default function Page() {\n  return (\n    <main>\n      <Stack intensity={0.7} className="max-w-lg" />\n      <IsoButton variant="solid">Get started</IsoButton>\n    </main>\n  )\n}`}
          />

          <H2 id="theming">Theming</H2>
          <P>
            Nothing to configure: figures and primitives read shadcn’s tokens (<C>--background</C>, <C>--foreground</C>, <C>--muted</C>,{" "}
            <C>--muted-foreground</C>, <C>--border</C>, <C>--primary</C>), so they follow your palette and your <C>.dark</C> class. To tune them
            apart from the rest of your UI, set any of these on an ancestor:
          </P>
          <CodeBlock
            lang="css"
            title="app/globals.css"
            code={`:root {\n  /* figures */\n  --iso-plate: var(--background); /* the fill of every face */\n  --iso-hi: var(--foreground);     /* what is lit */\n  --iso-edge: var(--muted-foreground); /* outlines */\n  --iso-mid: ...;                  /* other strokes */\n  --iso-lo: var(--border);         /* what recedes */\n  --iso-accent: #2450b8;           /* what the pointer touches */\n  --iso-stroke: 0.9;               /* stroke width in CSS px */\n\n  /* primitives */\n  --iso-line: ...;                 /* their lines */\n  --iso-side: var(--muted);        /* their side faces */\n  --iso-grid: var(--border);       /* IsoGrid's lattice */\n}`}
          />
          <P>
            <C>--iso-plate</C> is the one to get right on a coloured background: faces are filled, not transparent, because a nearer face hides
            what is behind it. Set it to the colour the figure sits on.
          </P>

          <H2 id="figures">Figures</H2>
          <P>
            Every figure takes the same options: <C>intensity</C> (0 to 1, how strongly it answers the pointer), <C>theme</C>, <C>label</C> and{" "}
            <C>onRead</C>, which receives the figure’s caption as it changes. It renders one <C>div</C> at a 5:4 aspect ratio, takes any div
            attribute, and forwards its ref.
          </P>
          <CodeBlock code={`<Bars\n  data={[12, 18, 9, 24]}\n  labels={["Q1", "Q2", "Q3", "Q4"]}\n  intensity={0.8}\n  onRead={(text) => setCaption(text)} // "Q2 · 18"\n/>`} />

          <H2 id="objects">Interactive objects</H2>
          <P>
            Objects such as the PC Case, Church and Pulley are made of parts. Clicking a part activates it; dragging works where it makes sense
            (the pulley's rope). From the keyboard, Tab focuses the object, the arrow keys move between its parts, Enter or Space activates one,
            and Escape lets go. The caption names the part and what happened, and is read out to screen readers.
          </P>
          <CodeBlock code={`<Church\n  lit\n  onActivate={(part) => {\n    if (part === "bell") playChime()\n  }}\n/>`} />

          <H2 id="notes">Accessibility and performance</H2>
          <ul className="grid max-w-[68ch] list-disc gap-2 pl-5 text-muted-foreground marker:text-border">
            <li>A figure is an image with a description you can replace with <C>label</C> or <C>aria-label</C>; an interactive object is a focusable group with a live caption.</li>
            <li>With reduced motion, springs land in one step and the Nodes pulse holds still; every figure still answers the pointer.</li>
            <li>All figures on a page share one animation loop. A figure that is off screen, or at rest, does no work.</li>
            <li>On the server a figure is an empty 5:4 box, so nothing shifts when it draws.</li>
            <li>Primitives are built on Radix, so focus, keyboard and screen reader behaviour come with them.</li>
          </ul>

          <H2 id="agents">For agents</H2>
          <P>
            <a className="text-foreground underline underline-offset-4" href={withBase("/llms.txt")}>/llms.txt</a> indexes every item, and every component page
            has a Markdown version at <C>/components/&lt;name&gt;.md</C>.
          </P>
        </article>
      </DocsShell>
      <Footer />
    </>
  )
}
