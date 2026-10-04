# Isometric 0.2: interactive objects, blocks and a world

**Date:** 2026-10-05 · **Status:** approved

## Goal

Grow Isometric from pointer-reactive figures into fully interactive objects:
things with parts you can hover, click and operate from the keyboard, and a
playground world that puts all of them in one place.

## Decisions

- **Names are generic.** No third-party trademarks or recognisable characters:
  the block-world kit is "Blocks", the ring-core heart is "Reactor".
- **Blocks kit** ships figures and block-styled UI.
- **World** ships as the `/playground` page and as an installable `world` item.
- **Phased release**, one usable step at a time, versioned 0.2.0 at the end.

## Architecture

### Meshes (`lib/isometric/mesh.ts`)

A mesh is vertices and faces: `{ v: Vec3[], f: number[][] }`, each face
counter-clockwise seen from outside. Builders: `box`, `extrude` (any simple
polygon between two heights), `pyramid`, `wedge` (a gabled roof), `cylinder`
(n-sided), plus `rotateX/Y/Z` about a pivot, `translate`, `scale`, `merge`.

### Scene (`lib/isometric/scene.ts`)

A scene takes a list of *drawables*, each a mesh with a part id, a class and
an optional depth bias, and renders them into one svg group:

1. project every vertex once;
2. cull back faces by the sign of their projected area;
3. sort the rest back to front by view depth (centroid, plus bias);
4. write them into a pool of `<path>` elements, reusing nodes in order, so
   nothing is created or removed on an ordinary frame.

`pick(x, y)` walks the visible faces front to back with a point-in-polygon
test and returns the part id under the pointer. Faces carry classes from the
existing stylesheet (`edge`, `hi`, `accent`, …) plus `tone-1…3` for material
tints, so meshes theme like every other figure.

### Entities (`lib/isometric/entity.ts`)

```ts
type Entity<S> = {
  name: string
  parts: Record<string, { label: string }>  // hover/focus/activate targets
  state: S
  draw(state, out: Drawable[], now): void   // meshes for this frame
  step(state, dt, now): boolean             // animate; true while moving
  activate?(state, part): string | void     // click / Enter; returns a caption
  hover?(state, part | null): void
}
```

`createEntityFigure(name, spec)` hosts one entity in a figure: it sets up the
camera, the scene, the shared loop, pointer hover and click via `pick`, and
keyboard control (the figure becomes a focusable group: arrow keys move
between parts, Enter or Space activates, Escape clears; a live region reads
the part and caption). It keeps the 0.1 options (`intensity`, `theme`,
`label`, `onRead`) and adds `onActivate(part)`.

### World (`world.tsx`)

The world hosts many entities at world offsets over block terrain. Terrain is
built as unit blocks with hidden faces between neighbours removed. Ordering
is per object: terrain first, then entities and placed blocks sorted by the
near corner of their footprint, which holds because objects stand on flat
plots. It adds pan (drag, arrow keys), zoom (wheel, pinch, + and -), a
build mode (place a block on the ground, mine one with the alt button or
Shift+click), and a list of every object as buttons, which is also the
accessible way through the scene.

## Items

| Item | Kind | Interaction |
| --- | --- | --- |
| `pc-case` | entity figure | side panel opens; RAM lifts; GPU slides; power spins fans and lights LEDs |
| `heart` | entity figure | beats; click toggles liked with a burst of cubes; `liked` prop |
| `reactor` | entity figure | coils charge as the pointer nears; click pulses |
| `pulley` | entity figure | drag the rope; load rises by `ratio` (2 or 4); wheels turn |
| `church` | entity figure | doors open; bell swings; windows light |
| `block` | entity figure | `type` prop (grass, stone, dirt, wood, ore, sand, glass); click to mine |
| `chest` | entity figure | lid opens; items rise |
| `torch` | entity figure | flame flickers; click to snuff and relight |
| `tree` | entity figure | leaves sway on hover; click to shake |
| `block-icon` | ui | a static isometric block glyph for slots |
| `hotbar` | ui | nine slots, number keys and arrows select |
| `inventory` | ui | a grid of slots with a selected one |
| `hearts-meter` | ui | health as hearts, halves supported |
| `xp-bar` | ui | segmented bar with a level |
| `world` | block | the playground world, installable |

Block colours are subtle material tints mixed into the plate colour
(`--iso-grass`, `--iso-dirt`, … with defaults), so the kit keeps the
fine-line look and follows light and dark.

## Testing

- Unit: back-face culling (a box shows three faces from the default camera),
  picking returns the front-most part, extrude/rotate keep face winding,
  entity activate toggles state.
- Browser: every new page renders without errors; clicking the PC side panel
  changes the caption; keyboard Enter activates a part; the playground loads,
  places a block and mines it.
- `check:names`, typecheck, build, `shadcn registry validate`.

## Out of scope

Physics, saving a world, multiplayer, textures as images.
