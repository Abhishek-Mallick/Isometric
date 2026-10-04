# Isometric v1 — implementation plan

Spec: `docs/superpowers/specs/2026-10-04-isometric-design.md`

1. **Scaffold** — package.json (Next 16, React 19, Tailwind 4, radix-ui,
   shiki, shadcn, vitest), tsconfig, next.config (static export),
   postcss, components.json, .gitignore (references, .next, out, public/r).
2. **Engine** — `registry/isometric/lib/{iso,motion,stage,styles,figure}.ts(x)`
   with vitest tests for iso maths and motion.
3. **Figures** — 12 engines in `registry/isometric/figures/`, each exporting
   the React component made by `createFigure`.
4. **UI primitives** — 11 components in `registry/isometric/ui/`.
5. **Registry** — `registry/index.ts` metadata, `scripts/generate-registry.mts`
   → `registry.json`, `shadcn build` → `public/r`, registry test.
6. **Site** — layout + theme toggle, home (hero figure + grid), components
   index, component page (preview, intensity/props controls, install tabs,
   usage code, source, props table), installation docs, llms.txt.
7. **Hygiene** — README, CHANGELOG, LICENSE, CONTRIBUTING, CI workflow,
   `scripts/check-names.mjs`.
8. **Verify** — test, typecheck, build, browser pass in light + dark.
9. **Commit** as the repo owner; prepare shadcn directory entry + PR text.
