# Engine anatomy: a working twin-turbo V12

**Date:** 2026-10-16 · **Status:** draft

## Goal

An `/engine` page, linked as "Engine" in the nav bar, that shows a car engine
as a working isometric replica in the Isometric line style: every piston,
rod, cam, valve and turbo moving by real kinematics, an X-ray of the
internals, and an exploded view that takes the engine apart part by part and
puts it back together.

It starts inside Isometric and is built to move out into its own project
later, with more engines after the first.

## Decisions

- **One engine first:** a 6.0 L, 60° twin-turbo V12 with two cams per bank
  and four valves per cylinder (48 valves), one turbo per bank. It is
  modelled on a modern luxury twin-turbo V12 and named generically ("V12
  Twin-Turbo"): no manufacturer names or marks.
- **Groundwork first.** The renderer and World items from the TODO land
  before any engine code, since the engine depends on them.
- **Canvas for the live engine.** The scene gains a canvas back end that
  reads the same composed paths. SVG stays the default for every other
  component and is used to export stills.
- **Separate module.** Engine code lives in `anatomy/` and imports from
  `registry/isometric/lib/isometric`, never the reverse. ("Engine" already
  names the rendering library in this codebase, so the module is called
  `anatomy`.) It is not a registry item in v1.

## Reference spec (defaults, to verify in phase 3)

|                |                                                                                                       |
| -------------- | ----------------------------------------------------------------------------------------------------- |
| Layout         | V12, 60° bank angle, crank like an inline six (throws 120° apart, opposite cylinders sharing a throw) |
| Bore × stroke  | 89 × 80 mm (5,972 cc)                                                                                 |
| Rod length     | 144 mm (estimate; a parameter)                                                                        |
| Compression    | 10 : 1                                                                                                |
| Valvetrain     | two cams per bank, 4 valves per cylinder, chain drive 2 : 1                                           |
| Firing order   | 1-7-5-11-3-9-6-12-2-8-4-10, every 60°                                                                 |
| Induction      | one turbo per bank, mounted outboard, intercooled into one plenum                                     |
| Idle / redline | 650 / 6,500 rpm                                                                                       |

All geometry is built from these numbers, so a second engine is a new spec
plus any part shapes it adds.

## Maths (`anatomy/`)

Everything moving is a pure function of crank angle θ and a small state
(rpm, throttle, turbo speed). No DOM, unit-tested.

- **Slider-crank.** r = stroke / 2, l = rod length.
  Piston distance from the crank axis: `s(θ) = r cos θ + √(l² − r² sin² θ)`.
  Rod angle: `φ = asin(r sin θ / l)`. Velocity and acceleration are the
  derivatives, shown live.
- **Vee.** Bank A axes lean +30°, bank B −30°, about the crank axis. Each
  cylinder uses the angle between its crank pin and its own axis, so bank B
  runs 60° behind bank A.
- **Cycle.** Cylinder phase `(θ + offsetᵢ) mod 720°` gives intake,
  compression, power or exhaust. The chamber takes the stroke's tint; the
  spark flashes at top dead centre on compression.
- **Valvetrain.** Cams turn at θ / 2. Lift is a smooth lobe curve between
  each valve's opening and closing angles, with overlap at top dead centre.
- **Turbo.** `dω/dt = (ω_target − ω) / τ`, with ω_target rising with rpm and
  throttle, so lag is visible. Boost ∝ ω², capped by the wastegate. The
  blow-off valve vents when the throttle closes under boost.
- **Gas and torque** (phase 7). `V(θ) = V_c + A·x(θ)`; compression and
  expansion follow `pV^γ = const`, and combustion follows a Wiebe burn curve.
  Torque per cylinder is `T = p A r sin(θ + φ) / cos φ`, summed over twelve
  for the torque ripple.
- **Display speed.** 7,000 rpm is about 117 revolutions a second, faster
  than any screen. Simulated rpm and display speed are separate: the
  readouts are real, the animation runs at a chosen time scale (1×, 1/10,
  1/50), and a scrubber turns the crank by hand.

## Rendering

The scene's per-drawable painter's sort fails for parts nested inside each
other. Each mode avoids the problem:

- **Assembled:** the housing (block, heads, covers, sump) hides the
  internals, so they are not drawn. External moving parts (pulleys, belt,
  turbo inlets) are.
- **X-ray:** the housing is drawn as outlines only, in a layer on top. The
  internals are one group sorted face by face, with long faces split into
  tiles.
- **Exploded:** parts are pulled apart in space, so whole-part ordering
  holds.

Budget: about 4,000 faces in total and about 2,000 after hidden faces are
dropped. Static parts are built once and moved by a transform, so their
outlines stay cached; assembled, the internals are not drawn at all.
Measured on a 2020 laptop, build and compose take about 2 ms a frame
assembled, 6 ms in X-ray, 5.5 ms exploded and 0.4 ms for one cylinder;
`test/parts.test.ts` holds 120 frames of each view to a loose bound.

## Interaction

- **Modes:** Assembled, X-ray, Exploded, One cylinder.
- **Explode:** the parts form an assembly tree (block → heads → cam covers →
  cams → valves; crank → rods → pistons; turbos; manifolds; intake). Each
  part moves out along its removal direction, staggered by its depth in the
  tree with a slight overshoot. Dashed construction lines draw back to its
  home, and thin callouts label it. The engine can keep running while
  exploded.
- **Isolate:** click a part, or reach it from the keyboard. The rest fades
  to outlines, and a callout gives its name, job and key figures.
- **Controls:**
  - Start (cranks, then idles), throttle and rpm;
  - the time scale and the crank-angle scrubber;
  - a crank-angle dial, a firing-order ring, and gauges for boost and turbo
    speed;
  - drag to orbit; Q and E turn the camera a quarter at a time.
- **Keyboard:** Tab to the canvas. 1–4 choose the mode and X toggles X-ray;
  Space starts or stops; ← and → walk the parts, Enter isolates, Escape
  clears; ↑ and ↓ move the throttle by a tenth; Q and E turn a quarter;
  `[` and `]` choose the cylinder; R resets the view. A live caption reads
  what is happening.
- **Pointer:** drag to orbit and tilt, Shift-drag or right-drag to pan, the
  wheel zooms about the pointer, double-click resets; hover names a part,
  click isolates it.
- **Reduced motion:** the engine does not run by itself; the scrubber still
  works, and explode snaps to its end state.

## Testing

- Unit:
  - slider-crank: `s(0) = r + l`, `s(π) = l − r`;
  - even firing every 60°, and cam speed exactly θ / 2;
  - turbo spool settles to its target, and the wastegate caps boost;
  - per-face sort draws a piston inside its bore correctly;
  - new mesh builders keep outward-facing faces.
- Browser: the page renders without errors; Start runs; explode and
  reassemble; keyboard isolate; screenshots at rest, X-ray and exploded, in
  light and dark.
- Performance: 120 simulated frames under budget.

## Out of scope for v1

More engines, full combustion simulation or CFD, sound, an installable
registry item, and the move to a separate project.
