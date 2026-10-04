<div align="center">
  <a href="https://isometric.buildlab.in">
    <img src="app/icon.svg" width="64" height="64" alt="Isometric" />
  </a>
  <p style="font-size: 32px;">Isometric</p>
  <p>Isometric line figures and UI primitives for React.</p>
  <p>
    <a href="https://isometric.buildlab.in">Website</a> ·
    <a href="https://isometric.buildlab.in/components">Components</a> ·
    <a href="https://isometric.buildlab.in/llms.txt">llms.txt</a> ·
    <a href="./CHANGELOG.md">Changelog</a> ·
    <a href=".github/CONTRIBUTING.md">Contributing</a>
  </p>
  <p>
    <a href="./LICENSE"><img alt="MIT License" src="https://img.shields.io/badge/license-MIT-black" /></a>
    <a href="https://github.com/Abhishek-Mallick/isometric/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/Abhishek-Mallick/isometric/actions/workflows/ci.yml/badge.svg" /></a>
  </p>
</div>

<br />

Isometric is a collection of drawings and controls that stand in three dimensions, drawn in fine lines. The **figures** are SVG drawings that answer the pointer: a skyline that rises where you point, a laptop whose lid follows you, a bar chart drawn from your data. The **primitives** are buttons, cards, tabs and the rest, each standing on a depth drawn in the same lines and sinking into it when pressed. You install the source with the shadcn CLI, so every component is yours to edit.

## What's included

- **12 figures**: Skyline, Stack, Keys, Rack, Laptop, Bars, Steps, Files, Cylinders, Parcel, Nodes and Cube. Each takes the same options (`intensity`, `theme`, `label`, `onRead`) and reads out what it is doing.
- **11 primitives**: Button, Card, Switch, Tabs, Slider, Toggle Group, Kbd, Badge, Progress, Input and Grid, built on Radix UI with keyboard and screen-reader support.
- **A small engine** (`lib/isometric`): orthographic projection, solids painted back to front, springs, and one shared animation loop that sleeps offscreen and when nothing moves. No dependencies beyond React.
- **Your theme, unchanged.** Everything reads shadcn's tokens, so it follows your palette and `.dark`. Tune it with `--iso-*` custom properties.
- **Docs for humans and agents**: every component page has a live preview, install command, props table and source, plus [`llms.txt`](https://isometric.buildlab.in/llms.txt) and per-component Markdown.

## Installation

Isometric needs React 19, Tailwind CSS v4 and a `components.json` (run `npx shadcn@latest init` first).

```bash
npx shadcn@latest add @isometric/skyline @isometric/iso-button
npx shadcn@latest add @isometric/all   # everything
```

If your shadcn CLI does not know the namespace yet, register it in `components.json`:

```json
{
  "registries": {
    "@isometric": "https://isometric.buildlab.in/r/{name}.json"
  }
}
```

## Usage

```tsx
import { Bars } from "@/components/ui/isometric/bars"
import { IsoButton } from "@/components/ui/isometric/iso-button"

export default function Page() {
  return (
    <>
      <Bars data={[12, 18, 9, 24]} labels={["Q1", "Q2", "Q3", "Q4"]} intensity={0.7} />
      <IsoButton variant="solid">Get started</IsoButton>
    </>
  )
}
```

## Theming

```css
:root {
  --iso-accent: #2450b8; /* what the pointer touches */
  --iso-plate: var(--background); /* the fill of every face */
  --iso-stroke: 0.9; /* stroke width in CSS px */
  --iso-side: var(--muted); /* the side faces of primitives */
}
```

See [the docs](https://isometric.buildlab.in/docs#theming) for every token.

## Development

```bash
pnpm install
pnpm dev          # generates the registry, then runs the site on :3000
pnpm test         # engine and registry tests
pnpm build        # name check, registry, static export to out/
pnpm test:e2e     # browser smoke tests against out/
```

The registry is generated from [`registry/index.ts`](registry/index.ts). Components live in `registry/isometric/ui/isometric`, the engine in `registry/isometric/lib/isometric`.

## License

[MIT](./LICENSE)
