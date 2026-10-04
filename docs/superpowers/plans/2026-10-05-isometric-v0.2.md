# Isometric 0.2: implementation plan

Spec: `docs/superpowers/specs/2026-10-05-isometric-v0.2-design.md`

Each phase ends with: tests green, `pnpm build`, a visual check, a scoped
commit, push, and a deploy.

1. **Engine**: `mesh.ts`, `scene.ts`, `entity.ts` (`createEntityFigure`),
   stylesheet tones; unit tests for culling, picking and winding.
2. **PC Case**: entity, registry entry, demo page, e2e click test.
3. **Heart, Reactor**.
4. **Pulley**.
5. **Church**.
6. **Blocks kit**: `block`, `chest`, `torch`, `tree`; `block-icon`, `hotbar`,
   `inventory`, `hearts-meter`, `xp-bar`.
7. **World**: `world` item and `/playground` page; e2e for place and mine.
8. **Release**: site categories and home, README, CHANGELOG 0.2.0, tag.
