# Contributing

Thanks for helping. Isometric is a shadcn registry and a Next.js site in one repository.

## Set up

```bash
pnpm install
pnpm dev
```

Node 22 or later and pnpm 10 are required.

## Where things are

| Path | What |
| --- | --- |
| `registry/isometric/lib/isometric/` | The engine: projection, solids, motion, the shared loop, the React factory |
| `registry/isometric/ui/isometric/` | Every figure and primitive, one file each |
| `registry/index.ts` | The manifest. Every item, its files, dependencies, usage and props |
| `scripts/generate-registry.mts` | Turns the manifest into `registry.json`, `llms.txt` and Markdown |
| `app/`, `components/site/` | The documentation site |

## Adding a figure

1. Write `registry/isometric/ui/isometric/<name>.tsx`. Export a component made with `createFigure`, with a `mount` that draws into the svg it is handed, joins the shared `loop`, and returns `set` and `destroy`.
2. Draw in world units, project with the camera, and paint back to front. Keep to the stroke classes in `styles.ts` (`edge`, `inner`, `line`, `hi`, `accent`, `dot`), so the figure themes like the rest.
3. Map `intensity` to one number through a `[at 0, at 0.5, at 1]` range, and write a short caption to `read.textContent` when something changes.
4. Respect reduced motion: anything that plays on its own must hold still when `reducedMotion()` is true.
5. Add the item to `registry/index.ts` and to `components/site/figures.ts`.

## Adding a primitive

Stand it on `IsoDepth`: the root carries `group/iso` and `style={isoDepth(n)}`, the face uses `isoFace` and one of `isoSink`. Use Radix for anything interactive beyond a button. Add a demo to `components/site/demos.tsx` and an entry in `registry/index.ts`.

## Before you open a pull request

```bash
pnpm typecheck && pnpm test && pnpm build && pnpm test:e2e && pnpm registry:validate
```

Commit `registry.json` when the manifest changes; CI checks it is up to date.
