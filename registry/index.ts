// Registry manifest: the single source of truth for every Isometric item.
// `scripts/generate-registry.mts` turns it into registry.json, llms.txt and
// per-component markdown; the site reads it for its pages.

export type Category = "foundation" | "figure" | "object" | "blocks" | "ui" | "world"

export type Prop = { name: string; type: string; default?: string; description: string }

export type Item = {
  name: string
  title: string
  description: string
  category: Category
  type: "registry:ui" | "registry:lib"
  files: { path: string; type: string }[]
  dependencies?: string[]
  /** Other Isometric items by name, resolved to absolute URLs at build time. */
  internal?: string[]
  /** Items from shadcn's own registry. */
  shadcn?: string[]
  /** Usage snippet shown on the docs page and in llms.txt. */
  usage?: string
  /** Props beyond the shared ones. */
  props?: Prop[]
  /** For figures: what `intensity` changes, and the caption it reads out. */
  intensity?: string
  /** Figures with parts you can click and reach from the keyboard. */
  interactive?: boolean
}

/** Figures render as live drawings on the site: every item that documents an intensity. */
export const isFigure = (i: Item) => !!i.intensity

/** The order categories appear in on the site. */
export const categoryOrder: Category[] = ["object", "blocks", "figure", "world", "ui", "foundation"]

export const categoryLabels: Record<Category, string> = {
  foundation: "Foundations",
  figure: "Figures",
  object: "Interactive objects",
  blocks: "Blocks",
  ui: "Primitives",
  world: "World",
}

const ui = (name: string) => ({ path: `registry/isometric/ui/isometric/${name}.tsx`, type: "registry:ui" })
const lib = (name: string) => ({ path: `registry/isometric/lib/isometric/${name}`, type: "registry:lib" })

/** The options every figure takes. */
export const figureProps: Prop[] = [
  { name: "intensity", type: "number", default: "0.5", description: "How strongly the figure answers the pointer, from 0 (subtle) to 1 (strong). Out-of-range values are clamped." },
  { name: "theme", type: `"auto" | "light" | "dark"`, default: `"auto"`, description: "`auto` follows your shadcn tokens and `.dark`; the others pin a neutral palette." },
  { name: "label", type: "string", description: "The accessible name. Each figure has a default description in English." },
  { name: "onRead", type: "(text: string) => void", description: "Called with the figure's caption each time it changes, e.g. `\"step 3 of 5\"`." },
  { name: "...props", type: `React.ComponentProps<"div">`, description: "Any div attribute. The figure fills its parent's width at a 5:4 aspect ratio." },
]

/** The extra option interactive figures take. */
export const interactiveProps: Prop[] = [
  { name: "onActivate", type: "(part: string) => void", description: "Called with a part's id when it is clicked, or chosen with Enter. Tab focuses the figure; the arrow keys move between parts." },
]

/** An interactive object: a figure whose parts can be clicked and reached from the keyboard. */
const object = (name: string, title: string, description: string, intensity: string, extra: Partial<Item> = {}): Item => ({
  ...figure(name, title, description, intensity, extra),
  category: "object",
  interactive: true,
})

function figure(name: string, title: string, description: string, intensity: string, extra: Partial<Item> = {}): Item {
  const component = title.replace(/\s/g, "")
  return {
    name,
    title,
    description,
    category: "figure",
    type: "registry:ui",
    files: [ui(name)],
    internal: ["isometric-engine"],
    intensity,
    usage: `import { ${component} } from "@/components/ui/isometric/${name}"

<${component} intensity={0.6} className="w-full max-w-md" />`,
    ...extra,
  }
}

const primitive = (name: string, title: string, description: string, usage: string, extra: Partial<Item> = {}): Item => ({
  name,
  title,
  description,
  category: "ui",
  type: "registry:ui",
  files: [ui(name)],
  internal: ["iso-depth"],
  shadcn: ["utils"],
  usage,
  ...extra,
})

const depthProp: Prop = { name: "depth", type: "number", description: "How far it stands off the page, in px." }

export const items: Item[] = [
  {
    name: "isometric-engine",
    title: "Isometric Engine",
    description:
      "The engine behind every figure: orthographic projection, meshes with hidden faces removed, picking, springs, one shared animation loop that sleeps offscreen, and the React factory.",
    category: "foundation",
    type: "registry:lib",
    files: [lib("iso.ts"), lib("motion.ts"), lib("stage.ts"), lib("styles.ts"), lib("figure.tsx"), lib("mesh.ts"), lib("scene.ts"), lib("entity.ts")],
  },
  {
    name: "iso-depth",
    title: "Iso Depth",
    description: "The line-drawn depth every primitive stands on: an offset outline and three diagonals that fade as the face sinks.",
    category: "foundation",
    type: "registry:ui",
    files: [ui("iso-depth")],
    shadcn: ["utils"],
    usage: `import { IsoDepth, isoDepth, isoFace, isoSink } from "@/components/ui/isometric/iso-depth"

<button className="group/iso relative" style={isoDepth(4)}>
  <IsoDepth />
  <span className={\`\${isoFace} \${isoSink.active} block bg-background px-4 py-2\`}>Press</span>
</button>`,
  },

  figure("skyline", "Skyline", "A city block of towers on a plinth. Towers near the pointer rise, the nearer the higher.", "Widens the district that rises. Reads `block 3·4`."),
  figure("stack", "Stack", "An app window taken apart into four layers. Moving across opens the gap; moving down picks a layer.", "Opens the layers further. Reads `cards · gap 24`."),
  figure("keys", "Keys", "A forty-key keyboard. The key under the pointer sinks and its neighbours follow; a click presses it home.", "Widens how far the press reaches. Reads `key G`."),
  figure("rack", "Rack", "An open server rack of eight units. The pointer's height pulls the nearest units out and wakes their lights.", "Pulls out more units. Reads `unit 05`."),
  figure("laptop", "Laptop", "A thin laptop. The pointer's height sets how far the lid stands open; the screen lights as it opens.", "Lets the lid open wider. Reads `lid 112°`."),
  figure("bars", "Bars", "An isometric bar chart drawn from your data. The bar under the pointer lifts and reads its value.", "Spreads the lift over more bars. Reads `Mar · 9`.", {
    props: [
      { name: "data", type: "number[]", default: "[4, 7, 5, 9, 6, 11, 8, 12]", description: "The values, left to right. Up to 16 are drawn; bars grow on springs when it changes." },
      { name: "labels", type: "string[]", description: "One label per value, used in the caption." },
    ],
    usage: `import { Bars } from "@/components/ui/isometric/bars"

<Bars
  data={[12, 18, 9, 24, 16, 30]}
  labels={["Jan", "Feb", "Mar", "Apr", "May", "Jun"]}
  onRead={(text) => console.log(text)}
/>`,
  }),
  figure("steps", "Steps", "A staircase that reads as progress. A token rests on the current step and hops as the pointer walks it.", "Makes the hop quicker. Reads `step 3 of 5`.", {
    props: [
      { name: "steps", type: "number", default: "5", description: "How many steps, from 2 to 9." },
      { name: "current", type: "number", default: "2", description: "The step the token rests on, counted from 1." },
    ],
    usage: `import { Steps } from "@/components/ui/isometric/steps"

<Steps steps={4} current={2} />`,
  }),
  figure("files", "Files", "An upright folder of five sheets. As the pointer comes near the sheets rise; the nearest rises highest.", "Lifts the sheets further. Reads `file 2 of 5`."),
  figure("cylinders", "Cylinders", "A database drawn as three stacked disks. The pointer's height parts the stack above the disk it picks.", "Opens the gap wider. Reads `shard 2 of 3`."),
  figure("parcel", "Parcel", "A sealed box. Its flaps fold open as the pointer comes near, and a cube rises out.", "Swings the flaps further. Reads `open 140°`."),
  figure("nodes", "Nodes", "A network of a hub and eight nodes. A pulse runs the shortest route to the node nearest the pointer.", "Makes the pulse travel faster. Reads `hub → e`."),
  figure("cube", "Cube", "A three by three cube. The pointer's height picks a layer and moving across twists it; it settles on a quarter turn.", "Twists further across one sweep. Reads `top · 90°`."),

  object("pc-case", "PC Case", "A tower you can take apart: slide the glass panel off, lift the memory out, pull the graphics card, and press power to spin every fan.", "Sets how far parts come out and how fast the fans spin. Reads `Graphics card out`.", {
    props: [
      { name: "open", type: "boolean", default: "false", description: "Start with the side panel off." },
      { name: "on", type: "boolean", default: "false", description: "Start powered on." },
    ],
    usage: `import { PcCase } from "@/components/ui/isometric/pc-case"

<PcCase open onActivate={(part) => console.log(part)} />`,
  }),

  object("heart", "Heart", "A heart cut from a slab, beating. Point at it to quicken the pulse; click to like it, and it fills and throws off a burst of cubes.", "Sets the resting pulse. Reads `Liked · 96 bpm`.", {
    props: [{ name: "liked", type: "boolean", description: "Whether it is liked. Clicking toggles it; pass it to control it." }],
    usage: `import { Heart } from "@/components/ui/isometric/heart"

const [liked, setLiked] = useState(false)

<Heart liked={liked} onActivate={() => setLiked(!liked)} />`,
  }),
  object("pulley", "Pulley", "A block and tackle on a frame. Drag the rope's handle down and the load rises by the pull divided by the ratio, with the wheels turning as the rope runs.", "Sets how much rope a drag pulls. Reads `pull 24 · lift 6 · 4:1`.", {
    props: [
      { name: "ratio", type: "2 | 4", default: "2", description: "Mechanical advantage: how many lines of rope hold the load." },
      { name: "load", type: "number", default: "40", description: "The load in kilograms, used in the caption." },
    ],
    usage: `import { Pulley } from "@/components/ui/isometric/pulley"

<Pulley ratio={4} load={120} />`,
  }),
  object("reactor", "Reactor", "A ring-core reactor: a glowing core inside ten coils. The coils charge as the pointer comes near and the ring turns; click to fire a pulse.", "Sets how fast it charges. Reads `charge 80%`."),

  primitive(
    "iso-button",
    "Iso Button",
    "A button that stands on its own depth and sinks into it when pressed.",
    `import { IsoButton } from "@/components/ui/isometric/iso-button"

<IsoButton>Default</IsoButton>
<IsoButton variant="solid">Deploy</IsoButton>
<IsoButton variant="outline" size="sm" depth={3}>Cancel</IsoButton>`,
    {
      dependencies: ["class-variance-authority"],
      props: [
        { name: "variant", type: `"default" | "solid" | "outline"`, default: `"default"`, description: "`solid` fills the face with your primary colour; `outline` leaves the sides unfilled." },
        { name: "size", type: `"sm" | "default" | "lg" | "icon"`, default: `"default"`, description: "The face's height and padding." },
        { ...depthProp, default: "4" },
        { name: "asChild", type: "boolean", default: "false", description: "Render the child element (a link, say) as the button." },
      ],
    },
  ),
  primitive(
    "iso-card",
    "Iso Card",
    "A slab: a card standing on its own depth, composed like shadcn's Card.",
    `import { IsoCard, IsoCardContent, IsoCardDescription, IsoCardFooter, IsoCardHeader, IsoCardTitle } from "@/components/ui/isometric/iso-card"

<IsoCard className="max-w-sm">
  <IsoCardHeader>
    <IsoCardTitle>Deploy</IsoCardTitle>
    <IsoCardDescription>Ship the build to production.</IsoCardDescription>
  </IsoCardHeader>
  <IsoCardContent>…</IsoCardContent>
  <IsoCardFooter>…</IsoCardFooter>
</IsoCard>`,
    { props: [{ ...depthProp, default: "8" }] },
  ),
  primitive(
    "iso-switch",
    "Iso Switch",
    "A block that slides along a recessed groove. Built on Radix Switch.",
    `import { IsoSwitch } from "@/components/ui/isometric/iso-switch"

<IsoSwitch defaultChecked aria-label="Notifications" />`,
    { dependencies: ["radix-ui"] },
  ),
  primitive(
    "iso-tabs",
    "Iso Tabs",
    "A row of tiles: the chosen tile stands up and the rest are pressed flat. Built on Radix Tabs.",
    `import { IsoTabs, IsoTabsContent, IsoTabsList, IsoTabsTrigger } from "@/components/ui/isometric/iso-tabs"

<IsoTabs defaultValue="overview">
  <IsoTabsList>
    <IsoTabsTrigger value="overview">Overview</IsoTabsTrigger>
    <IsoTabsTrigger value="usage">Usage</IsoTabsTrigger>
  </IsoTabsList>
  <IsoTabsContent value="overview">…</IsoTabsContent>
  <IsoTabsContent value="usage">…</IsoTabsContent>
</IsoTabs>`,
    { dependencies: ["radix-ui"] },
  ),
  primitive(
    "iso-slider",
    "Iso Slider",
    "A rail with a cube riding it, with optional ticks. Built on Radix Slider.",
    `import { IsoSlider } from "@/components/ui/isometric/iso-slider"

<IsoSlider defaultValue={[40]} step={10} ticks />`,
    {
      dependencies: ["radix-ui"],
      props: [{ name: "ticks", type: "boolean", default: "false", description: "Draw a tick under each step, up to 40 of them." }],
    },
  ),
  primitive(
    "iso-toggle-group",
    "Iso Toggle Group",
    "A row of keys; a key that is on stays pressed down. Built on Radix Toggle Group.",
    `import { IsoToggleGroup, IsoToggleGroupItem } from "@/components/ui/isometric/iso-toggle-group"

<IsoToggleGroup type="multiple" defaultValue={["bold"]}>
  <IsoToggleGroupItem value="bold" aria-label="Bold">B</IsoToggleGroupItem>
  <IsoToggleGroupItem value="italic" aria-label="Italic">I</IsoToggleGroupItem>
</IsoToggleGroup>`,
    { dependencies: ["radix-ui"] },
  ),
  primitive(
    "iso-kbd",
    "Iso Kbd",
    "A keycap for shortcuts, which can be shown held down.",
    `import { IsoKbd } from "@/components/ui/isometric/iso-kbd"

<IsoKbd>⌘</IsoKbd> <IsoKbd pressed>K</IsoKbd>`,
    {
      props: [
        { name: "pressed", type: "boolean", default: "false", description: "Hold the key down." },
        { ...depthProp, default: "3" },
      ],
    },
  ),
  primitive(
    "iso-badge",
    "Iso Badge",
    "A small slab for status and counts.",
    `import { IsoBadge } from "@/components/ui/isometric/iso-badge"

<IsoBadge>New</IsoBadge>
<IsoBadge variant="solid">v0.1</IsoBadge>`,
    {
      dependencies: ["class-variance-authority"],
      props: [
        { name: "variant", type: `"default" | "solid" | "muted"`, default: `"default"`, description: "The face's fill." },
        { ...depthProp, default: "2" },
      ],
    },
  ),
  primitive(
    "iso-progress",
    "Iso Progress",
    "Progress as a row of blocks: filled blocks stand up, empty ones lie flat.",
    `import { IsoProgress } from "@/components/ui/isometric/iso-progress"

<IsoProgress value={58} segments={12} />`,
    {
      props: [
        { name: "value", type: "number", default: "0", description: "From 0 to 100." },
        { name: "segments", type: "number", default: "12", description: "How many blocks the bar is made of." },
      ],
    },
  ),
  primitive(
    "iso-input",
    "Iso Input",
    "A recessed well: an input whose inner walls read as depth going into the page.",
    `import { IsoInput } from "@/components/ui/isometric/iso-input"

<IsoInput placeholder="Project name" />`,
    { internal: [] },
  ),
  primitive(
    "iso-grid",
    "Iso Grid",
    "An isometric lattice of fine lines to put behind content, fading toward its edges.",
    `import { IsoGrid } from "@/components/ui/isometric/iso-grid"

<section className="relative">
  <IsoGrid className="absolute inset-0 -z-10" cell={28} />
  …
</section>`,
    {
      internal: [],
      props: [
        { name: "cell", type: "number", default: "28", description: "The side of one lattice cell, in px." },
        { name: "fade", type: "boolean", default: "true", description: "Fade the lattice out toward the edges." },
      ],
    },
  ),
]

export const itemsByName: Record<string, Item> = Object.fromEntries(items.map((i) => [i.name, i]))

/** Items with a page on the site. */
export const docItems = items.filter((i) => i.name !== "isometric-engine")

/** The React component a registry item exports, for figures. */
export const componentName = (item: Item) => item.title.replace(/\s/g, "")
