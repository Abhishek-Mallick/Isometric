# Engine anatomy: implementation plan

Spec: `docs/superpowers/specs/2026-10-16-engine-anatomy-design.md`

Each phase ends with: tests green, `pnpm build`, a visual check, scoped
conventional commits, one pull request.

0. **Groundwork**:
   - ESLint (Next config) and Prettier (no semicolons, double quotes), both
     in CI;
   - a `debug` overlay showing face normals, painting order and pick
     polygons.
1. **Renderer**, in `scene.ts`, `motion.ts` and `mesh.ts`:
   - per-face sort for a group of drawables, and an opt-in `split` into
     tiles; remove the bias workarounds;
   - a cached static layer;
   - a canvas back end that resolves `--iso-*` through `getComputedStyle`,
     plus SVG export;
   - `sequence()` timelines;
   - `label(text, face, u, v)` for text on faces;
   - mesh builders: lathe, tube, bladed wheel, frustum, torus.
2. **World**:
   - `PLACES` becomes an `objects` prop (`kind`, `at`, `size`, `props`),
     with today's town as the default;
   - recompose only the objects that moved; idle at 0% CPU.
3. **Maths core**: `anatomy/spec.ts`, `kinematics.ts`, `cycle.ts`,
   `turbo.ts`, with unit tests; verify the reference numbers.
4. **Parts**: meshes for block, heads, cam covers, crank, rods, pistons,
   cams, valves, chain, turbos, manifolds, plenum, flywheel and sump, built
   from the spec.
5. **Page**:
   - `/engine` and "Engine" in the header nav;
   - Assembled and X-ray modes, Start, throttle, time scale and scrubber;
   - gauges, the firing ring, the orbit camera and quarter turns.
6. **Exploded view**: the assembly tree, staggered explode and reassemble,
   construction lines, callouts, isolate, and SVG export.
7. **Thermodynamics**: the One cylinder mode, the live P–V loop, and the
   torque-ripple graph.
8. **Quality**:
   - e2e tests: start, explode, and isolate from the keyboard;
   - screenshot comparisons in light and dark;
   - the performance budget test;
   - README and CHANGELOG.
