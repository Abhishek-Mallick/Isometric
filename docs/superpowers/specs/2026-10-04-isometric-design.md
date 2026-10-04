# Isometric — v1 design

**Date:** 2026-10-04 · **Status:** approved

## Goal

A UI library of isometric line drawings and isometric UI primitives for React,
distributed as a shadcn registry (source is copied into the consumer's
project). Clean and minimal: thin strokes, filled plates, no gradients,
no shadows beyond construction lines. Listed in the shadcn directory as
`@isometric`.

## Constraints

- Opaline-style flat Next.js app: `app/`, `components/`, `lib/`, `registry/`,
  `scripts/`, `public/`, `registry.json`, `components.json`.
- `references/` is git-ignored and never shipped.
- The project names no other library anywhere in source, docs or registry.
  A script (`scripts/check-names.mjs`) fails the build if it does.
- MIT. The engine's maths is derived from an MIT-licensed reference; its
  copyright line is kept in `LICENSE` as required.
- Commits are authored by the repo owner only.

## Architecture

```
registry/isometric/
  lib/        engine — iso.ts, motion.ts, stage.ts, styles.ts, figure.tsx
  ui/isometric/  figures and primitives, one file each (registry:ui);
                 installs to components/ui/isometric/
registry/index.ts          single metadata source (name, title, description, files, deps, props, demo)
scripts/generate-registry  index.ts → registry.json; `shadcn build` → public/r/*.json
app/                        home, /components, /components/[name], /docs/installation, /llms.txt
components/site/            site chrome
```

### Engine

- `iso.ts`: orthographic camera (azimuth, elevation, scale, offset), `proj`,
  `unproj` (pointer → ground plane), `fit`, rounded rectangles/circles as
  sampled rings with normals, convex hull, `prism` (silhouette + one crease),
  path helpers. All drawing in a 400 × 320 viewBox.
- `motion.ts`: spring (240 Hz substeps) and eased tween; one reduced-motion flag.
- `stage.ts`: svg node helper, one shared `requestAnimationFrame` loop that
  sleeps offscreen (IntersectionObserver) and when nothing moves, pointer in
  viewBox units with touch hold, disposer.
- `styles.ts`: one zero-specificity stylesheet injected once. Tokens:
  `--iso-plate`, `--iso-hi`, `--iso-edge`, `--iso-mid`, `--iso-lo`,
  `--iso-stroke`, each falling back to shadcn tokens (`--background`,
  `--foreground`, `--muted-foreground`, `--border`).
- `figure.tsx`: `createFigure(name, engine, spec)` → a React component that
  renders a 5:4 `<div>`, mounts the engine in a layout effect, forwards ref
  and div props, and passes `intensity` (0…1), `label`, `onRead`.

### Figures (12)

Skyline, Stack, Keys, Rack, Laptop, Bars (`data` prop), Steps, Files,
Cylinders, Parcel, Nodes, Cube. (Cube replaced the planned Voxel, which
read too close to Skyline.) Each maps `intensity` linearly through a
`[lo, mid, hi]` triple to its one engine parameter.

### UI primitives (11)

IsoButton, IsoCard, IsoSwitch, IsoTabs, IsoSlider, IsoToggleGroup, IsoKbd,
IsoInput, IsoProgress, IsoBadge, IsoGrid, on a shared IsoDepth item. Depth
is drawn as an offset outline plus three corner diagonals (oblique
projection); pressing translates the face into the outline and fades the
diagonals, so only transform and opacity animate. Radix (`radix-ui`) supplies behaviour for Switch,
Tabs, Slider, Toggle group. Each primitive uses Tailwind classes with
`var(--iso-*, shadcn fallback)`, so no extra CSS file is installed.

### Registry

Items: `isometric-engine` (lib), `iso-depth`, 12 figures, 11 primitives, `all`.
Every figure and primitive lists the engine (figures) or nothing (primitives)
as a `registryDependencies` URL on the site's base.

## Testing

- Vitest: projection round-trip, hull, prism, spring settles, intensity map.
- Registry test: every item's files exist, names are unique, deps resolve.
- `check-names`, `tsc --noEmit`, `next build` (static export), `shadcn build`.
- Manual browser pass over every component page in light and dark.

## Out of scope for v1

npm package, vanilla (non-React) entry, Svelte/Vue, figure-authoring skill.
