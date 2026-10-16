# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project
adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

An engine you can run and take apart, and the renderer it needed.

### Added

- The engine page (`/engine`, "Engine" in the header): a working twin-turbo
  60° V12 drawn on canvas. Start it, open the throttle and watch the pistons,
  valves, cams, timing chains and turbos move in time; see it in X-ray, take
  it apart into its 22 parts with labelled callouts and construction lines,
  or follow one cylinder through its four strokes. Live gauges for rpm,
  boost, turbo speed, torque and power, a firing-order ring, a pressure and
  volume loop, crank torque over two turns, an orbit camera, and SVG export.
  Every control has a keyboard shortcut.
- The engine's maths (`anatomy/`): slider-crank kinematics, the firing order
  and valve timing, a four-stroke cycle with Wiebe heat release, and a turbo
  with spool, a wastegate and a blow-off valve, all tested.
- A canvas back end for scenes, which resolves `--iso-*` and theme colours
  from the page, and SVG export for both back ends.
- Mesh builders: lathe, frustum, torus, hollow cylinder, tube, bladed wheel,
  gear teeth and mapped copies; text laid on faces with `label()`;
  `sequence()` timelines of staggered springs.
- World takes an `objects` prop of `{ kind, at, size, props }`, with the
  town as the default, and only recomposes the objects that moved.
- A `debug` overlay for scenes showing face normals, painting order and pick
  areas.
- ESLint and Prettier, both checked in CI.

### Changed

- Scenes order faces against each other within a group and across groups,
  so a piston draws correctly inside its bore, without per-object bias.
  Sorting skips pairs that cannot overlap, which keeps a 2,000-face scene to
  a few milliseconds a frame.

## [0.2.0] - 2026-10-05

Objects you can operate, a block kit, and a world to put them in.

### Added

- Meshes in the engine: boxes, extrusions, cylinders, pyramids, gables and
  panes, with transforms. A scene removes back faces, paints back to front
  into reused paths, shades faces and mixes material tints, draws curved
  solids with their true outlines and no seams, and picks the part under the
  pointer.
- Entities: objects with named parts that answer hover, click, drag and the
  keyboard (Tab, the arrow keys, Enter, Escape), with a live caption. Figures
  gain `onActivate`.
- Interactive objects: PC Case, Heart, Reactor, Pulley and Church.
- The Blocks kit: Block, Chest, Torch and Tree in nine materials with
  themeable tints (`--iso-grass`, `--iso-stone`, …), plus Block Icon, Hotbar,
  Inventory, Hearts Meter and XP Bar.
- World, and the playground page: a town of every object on block terrain,
  with pan, zoom, day and night, and a build mode.

### Fixed

- The figure stylesheet now sits in the `base` cascade layer, so Tailwind
  utilities on a figure (`absolute`, `aspect-square`, …) take effect.

## [0.1.0] - 2026-10-04

The first release.

### Added

- The isometric engine: orthographic projection, rounded prisms, sharp blocks
  and cylinders drawn in fine lines, springs and tweens, one shared animation
  loop that sleeps offscreen, and a React factory for figures.
- Twelve figures: Skyline, Stack, Keys, Rack, Laptop, Bars, Steps, Files,
  Cylinders, Parcel, Nodes and Cube.
- Eleven primitives: Iso Button, Iso Card, Iso Switch, Iso Tabs, Iso Slider,
  Iso Toggle Group, Iso Kbd, Iso Badge, Iso Progress, Iso Input and Iso Grid,
  standing on a shared depth (Iso Depth).
- Theming through shadcn's tokens, with `--iso-*` overrides.
- The documentation site, `llms.txt`, and Markdown for every component.

[Unreleased]: https://github.com/Abhishek-Mallick/Isometric/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/Abhishek-Mallick/Isometric/releases/tag/v0.2.0
[0.1.0]: https://github.com/Abhishek-Mallick/Isometric/releases/tag/v0.1.0
