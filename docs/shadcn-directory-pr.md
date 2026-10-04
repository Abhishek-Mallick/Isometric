# shadcn directory PR — @isometric

## 0. Before opening the PR (the validator fetches your live registry)

1. Create `github.com/Abhishek-Mallick/Isometric` and push:
   `git remote add origin git@github.com:Abhishek-Mallick/Isometric.git && git push -u origin main`
2. Repo → Settings → Pages → Source: **GitHub Actions**. Custom domain: `isometric.buildlab.in`.
3. DNS at buildlab.in: `CNAME isometric → abhishek-mallick.github.io`.
4. Wait for the Deploy workflow, then check these return JSON:
   - https://isometric.buildlab.in/r/registry.json
   - https://isometric.buildlab.in/r/skyline.json

## 1. Entry to append to `apps/v4/registry/directory.json`

Add as the last element of the array:

```json
  {
    "name": "@isometric",
    "homepage": "https://isometric.buildlab.in",
    "url": "https://isometric.buildlab.in/r/{name}.json",
    "description": "Isometric line figures and UI primitives for React. SVG drawings that answer the pointer, and buttons, cards and tabs that stand on their own depth.",
    "logo": "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' fill='none' stroke='var(--foreground)' stroke-width='1.6' stroke-linejoin='round'><path d='M16 4 27 10.3v12.6L16 29.2 5 22.9V10.3z'/><path d='M5 10.3 16 16.6 27 10.3M16 16.6v12.6'/></svg>"
  }
```

## 2. Commands

```bash
gh repo fork shadcn-ui/ui --clone && cd ui
git checkout -b registry/add-isometric
# edit apps/v4/registry/directory.json (append the entry above)
pnpm install
pnpm validate:registries
git commit -am "feat(registry): add @isometric"
git push -u origin registry/add-isometric
gh pr create --repo shadcn-ui/ui --title "feat(registry): add @isometric" --body-file pr-body.md
```

## 3. PR title

feat(registry): add @isometric

## 4. PR body (pr-body.md)

## Add `@isometric` to the registry directory

This adds [Isometric](https://isometric.buildlab.in) to `apps/v4/registry/directory.json`.

Isometric is an open-source (MIT) registry of isometric line figures and UI primitives for React. The figures are SVG drawings that answer the pointer: a skyline that rises where you point, a laptop whose lid follows you, a bar chart drawn from your data. The primitives stand on a depth drawn in the same lines and sink into it when pressed. Everything is built on Tailwind CSS v4 and Radix UI, follows shadcn/ui conventions (`data-slot`, `cn()`, `asChild`), and reads shadcn's own tokens, so it follows any theme in light and dark with no extra CSS.

### Links

| | |
| --- | --- |
| Website | https://isometric.buildlab.in |
| Components | https://isometric.buildlab.in/components |
| Registry index | https://isometric.buildlab.in/r/registry.json |
| Example item | https://isometric.buildlab.in/r/skyline.json |
| llms.txt | https://isometric.buildlab.in/llms.txt |
| Source (MIT) | https://github.com/Abhishek-Mallick/Isometric |

### Try it

```bash
npx shadcn@latest add @isometric/skyline
npx shadcn@latest add @isometric/all   # every figure and primitive
```

### What's in the registry (26 items)

- **Figures (12):** Skyline, Stack, Keys, Rack, Laptop, Bars (data-driven), Steps, Files, Cylinders, Parcel, Nodes, Cube. Each takes `intensity`, `theme`, `label` and `onRead`, respects `prefers-reduced-motion`, and shares one animation loop that sleeps offscreen.
- **Primitives (11):** Iso Button, Iso Card, Iso Switch, Iso Tabs, Iso Slider, Iso Toggle Group, Iso Kbd, Iso Badge, Iso Progress, Iso Input, Iso Grid
- **Foundations:** `isometric-engine` (`registry:lib`, installs to `lib/isometric/`) and `iso-depth` (the shared depth every primitive stands on)
- **`@isometric/all`:** a `registry:item` that installs everything

### Checklist

- [x] Open source (MIT) and publicly accessible
- [x] `registry.json` conforms to the registry schema (`shadcn registry validate` passes)
- [x] Flat registry: `/r/registry.json` and `/r/<name>.json` at the root
- [x] No `content` in the index's `files` arrays
- [x] `pnpm validate:registries` passes
