"use client"

import * as React from "react"

import { IsoBadge } from "@/registry/isometric/ui/isometric/iso-badge"
import { IsoButton } from "@/registry/isometric/ui/isometric/iso-button"
import { IsoCard, IsoCardContent, IsoCardDescription, IsoCardFooter, IsoCardHeader, IsoCardTitle } from "@/registry/isometric/ui/isometric/iso-card"
import { IsoDepth, isoDepth, isoFace, isoSink } from "@/registry/isometric/ui/isometric/iso-depth"
import { IsoGrid } from "@/registry/isometric/ui/isometric/iso-grid"
import { IsoInput } from "@/registry/isometric/ui/isometric/iso-input"
import { IsoKbd } from "@/registry/isometric/ui/isometric/iso-kbd"
import { IsoProgress } from "@/registry/isometric/ui/isometric/iso-progress"
import { IsoSlider } from "@/registry/isometric/ui/isometric/iso-slider"
import { IsoSwitch } from "@/registry/isometric/ui/isometric/iso-switch"
import { IsoTabs, IsoTabsContent, IsoTabsList, IsoTabsTrigger } from "@/registry/isometric/ui/isometric/iso-tabs"
import { IsoToggleGroup, IsoToggleGroupItem } from "@/registry/isometric/ui/isometric/iso-toggle-group"
import { Bars } from "@/registry/isometric/ui/isometric/bars"
import { BLOCK_TYPES } from "@/registry/isometric/lib/isometric/blocks"
import { BlockIcon, BlockSlot } from "@/registry/isometric/ui/isometric/block-icon"
import { HeartsMeter } from "@/registry/isometric/ui/isometric/hearts-meter"
import { Hotbar } from "@/registry/isometric/ui/isometric/hotbar"
import { Inventory } from "@/registry/isometric/ui/isometric/inventory"
import { XpBar } from "@/registry/isometric/ui/isometric/xp-bar"
import { Steps } from "@/registry/isometric/ui/isometric/steps"

function ProgressDemo() {
  const [v, setV] = React.useState(42)
  return (
    <div className="grid w-full max-w-md gap-5">
      <IsoProgress value={v} />
      <IsoSlider value={[v]} onValueChange={([n]) => setV(n)} aria-label="Progress" />
    </div>
  )
}

function HealthDemo() {
  const [hp, setHp] = React.useState(8.5)
  return (
    <div className="grid justify-items-center gap-5">
      <HeartsMeter value={hp} />
      <div className="flex gap-3">
        <IsoButton size="sm" variant="outline" depth={3} onClick={() => setHp((h) => Math.max(0, h - 1.5))}>Take a hit</IsoButton>
        <IsoButton size="sm" depth={3} onClick={() => setHp((h) => Math.min(10, h + 1))}>Heal</IsoButton>
      </div>
    </div>
  )
}

function XpDemo() {
  const [xp, setXp] = React.useState({ level: 7, value: 0.45 })
  return (
    <div className="grid w-full max-w-md justify-items-center gap-5">
      <XpBar level={xp.level} value={xp.value} className="w-full" />
      <IsoButton size="sm" depth={3} onClick={() => setXp(({ level, value }) => (value + 0.2 >= 1 ? { level: level + 1, value: value + 0.2 - 1 } : { level, value: value + 0.2 }))}>Gain experience</IsoButton>
    </div>
  )
}

const bar = [{ type: "grass", count: 64 }, { type: "stone", count: 24 }, { type: "planks", count: 31 }, { type: "log", count: 8 }, { type: "ore", count: 3 }, null, { type: "glass", count: 12 }, { type: "sand", count: 40 }, { type: "leaves", count: 5 }] as const

/** A live preview for every primitive, by registry name. */
export const demos: Record<string, () => React.ReactNode> = {
  "iso-depth": () => (
    <button className="group/iso relative cursor-pointer rounded-[3px]" style={isoDepth(6)}>
      <IsoDepth />
      <span className={`${isoFace} ${isoSink.active} block bg-background px-6 py-3 text-sm font-medium`}>Press and hold</span>
    </button>
  ),
  "iso-button": () => (
    <div className="flex flex-wrap items-center gap-4">
      <IsoButton>Default</IsoButton>
      <IsoButton variant="solid">Deploy</IsoButton>
      <IsoButton variant="outline">Outline</IsoButton>
      <IsoButton size="sm" depth={3}>Small</IsoButton>
      <IsoButton size="lg" depth={6}>Large</IsoButton>
    </div>
  ),
  "iso-card": () => (
    <IsoCard className="w-full max-w-sm">
      <IsoCardHeader>
        <IsoCardTitle>New project</IsoCardTitle>
        <IsoCardDescription>Deploy a fresh copy in one step.</IsoCardDescription>
      </IsoCardHeader>
      <IsoCardContent className="grid gap-3">
        <IsoInput placeholder="Project name" aria-label="Project name" />
      </IsoCardContent>
      <IsoCardFooter className="justify-end">
        <IsoButton size="sm" variant="outline" depth={3}>Cancel</IsoButton>
        <IsoButton size="sm" variant="solid" depth={3}>Create</IsoButton>
      </IsoCardFooter>
    </IsoCard>
  ),
  "iso-switch": () => (
    <div className="grid gap-4 text-sm">
      <label className="flex items-center gap-3"><IsoSwitch defaultChecked /> Email notifications</label>
      <label className="flex items-center gap-3"><IsoSwitch /> Weekly digest</label>
    </div>
  ),
  "iso-tabs": () => (
    <IsoTabs defaultValue="overview" className="w-full max-w-md">
      <IsoTabsList>
        <IsoTabsTrigger value="overview">Overview</IsoTabsTrigger>
        <IsoTabsTrigger value="usage">Usage</IsoTabsTrigger>
        <IsoTabsTrigger value="billing">Billing</IsoTabsTrigger>
      </IsoTabsList>
      <IsoTabsContent value="overview" className="text-sm text-muted-foreground">Three projects, two deploys today.</IsoTabsContent>
      <IsoTabsContent value="usage" className="text-sm text-muted-foreground">42% of this month’s build minutes used.</IsoTabsContent>
      <IsoTabsContent value="billing" className="text-sm text-muted-foreground">Next invoice on the 1st.</IsoTabsContent>
    </IsoTabs>
  ),
  "iso-slider": () => <IsoSlider defaultValue={[40]} step={10} ticks className="w-full max-w-sm" aria-label="Volume" />,
  "iso-toggle-group": () => (
    <IsoToggleGroup type="multiple" defaultValue={["bold"]}>
      <IsoToggleGroupItem value="bold" aria-label="Bold"><b>B</b></IsoToggleGroupItem>
      <IsoToggleGroupItem value="italic" aria-label="Italic"><i>I</i></IsoToggleGroupItem>
      <IsoToggleGroupItem value="underline" aria-label="Underline"><u>U</u></IsoToggleGroupItem>
    </IsoToggleGroup>
  ),
  "iso-kbd": () => (
    <p className="text-sm text-muted-foreground">
      Open the command menu with <IsoKbd>⌘</IsoKbd> <IsoKbd pressed>K</IsoKbd>
    </p>
  ),
  "iso-badge": () => (
    <div className="flex items-center gap-3">
      <IsoBadge>New</IsoBadge>
      <IsoBadge variant="solid">v0.1</IsoBadge>
      <IsoBadge variant="muted">Beta</IsoBadge>
    </div>
  ),
  "iso-progress": () => <ProgressDemo />,
  "iso-input": () => <IsoInput placeholder="name@example.com" type="email" className="max-w-sm" aria-label="Email" />,
  "block-icon": () => (
    <div className="grid justify-items-center gap-6">
      <div className="flex flex-wrap justify-center gap-3">{BLOCK_TYPES.map((t) => <BlockIcon key={t} type={t} className="size-10" />)}</div>
      <div className="flex gap-2"><BlockSlot item={{ type: "ore", count: 3 }} /><BlockSlot item={{ type: "planks", count: 32 }} selected /><BlockSlot item={null} /></div>
    </div>
  ),
  hotbar: () => (
    <div className="grid justify-items-center gap-3">
      <Hotbar items={[...bar]} hotkeys={false} />
      <p className="text-xs text-muted-foreground">Focus it and use the arrow keys, or scroll over it.</p>
    </div>
  ),
  inventory: () => <Inventory columns={6} size={18} items={[...bar, { type: "dirt", count: 18 }, { type: "stone", count: 64 }]} />,
  "hearts-meter": () => <HealthDemo />,
  "xp-bar": () => <XpDemo />,
  "iso-grid": () => (
    <div className="relative grid h-56 w-full place-items-center overflow-hidden rounded-md">
      <IsoGrid className="absolute inset-0" />
      <IsoButton variant="solid" className="relative">On the grid</IsoButton>
    </div>
  ),
}

/** The home page's working panel: primitives and two figures, used together. */
export function Panel() {
  const [step, setStep] = React.useState(2)
  const [data, setData] = React.useState([5, 8, 6, 11, 7, 12, 9])
  return (
    <IsoCard depth={10} className="w-full">
      <IsoCardHeader>
        <IsoCardTitle>Release checklist</IsoCardTitle>
        <IsoCardDescription>Every control here is an Isometric component.</IsoCardDescription>
      </IsoCardHeader>
      <IsoCardContent className="grid gap-6 md:grid-cols-2">
        <div className="grid content-start gap-4">
          <IsoTabs defaultValue="build">
            <IsoTabsList>
              <IsoTabsTrigger value="build">Build</IsoTabsTrigger>
              <IsoTabsTrigger value="deploy">Deploy</IsoTabsTrigger>
            </IsoTabsList>
          </IsoTabs>
          <label className="flex items-center justify-between text-sm">Run tests first <IsoSwitch defaultChecked /></label>
          <label className="flex items-center justify-between text-sm">Notify the team <IsoSwitch /></label>
          <IsoProgress value={(step / 4) * 100} segments={8} />
          <div className="flex items-center gap-3">
            <IsoButton size="sm" variant="outline" depth={3} onClick={() => setStep((s) => Math.max(1, s - 1))}>Back</IsoButton>
            <IsoButton size="sm" variant="solid" depth={3} onClick={() => setStep((s) => Math.min(4, s + 1))}>Next step</IsoButton>
            <span className="ml-auto text-xs text-muted-foreground">Step <IsoKbd>{step}</IsoKbd> of 4</span>
          </div>
        </div>
        <div className="grid content-start gap-3">
          <div className="grid grid-cols-2 gap-2 rounded-md border border-dashed p-2">
            <Steps steps={4} current={step} />
            <Bars data={data} labels={["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]} />
          </div>
          <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>The figures follow the controls.</span>
            <IsoButton size="sm" depth={3} onClick={() => setData((d) => d.map(() => 3 + Math.round(Math.random() * 11)))}>
              Shuffle data
            </IsoButton>
          </div>
        </div>
      </IsoCardContent>
    </IsoCard>
  )
}

/** A primitive's live preview, looked up by name on the client. */
export function Demo({ name }: { name: string }) {
  const render = demos[name]
  return render ? <>{render()}</> : null
}
