// Derived from Bklit migration 9bdabac665e6a77d0529dedac2db0267f649e806; MIT.
// Thin adapter over the native `sunburst` mark (no `states`, no labels in 1.0.0); focus emphasis is CSS off host attributes (push.ts).
// The scene keeps the native sectors for hit testing; the sector layer (sunburst-layer.ts) paints them from the geometry this adapter publishes.
import type { SectorPush } from './push'
import { Schema } from 'effect'
import { joinClasses } from './private/cn'
import { sunburst } from '@tanstack/charts/hierarchy/sunburst'
import type {
  SunburstNode as NativeNode,
  SunburstParentOptions,
} from '@tanstack/charts/hierarchy/sunburst'
import type { PolarMark, PolarLayoutContext } from '@tanstack/charts/polar'
import type { ChartPoint, SceneArea, SceneLabel, SceneNode } from '@tanstack/charts'
import { collapsedArc } from './geometry'
import type { ArcValues } from './geometry'
import { LABEL_BOX_CLASS } from './sunburst-layer'
import type { SectorFeed } from './sunburst-layer'
import type { EnterTransition } from '../kit/motion/phase'

export interface SunburstRowShape {
  readonly id: string
  readonly parentId: string | null
  readonly value: number
}

export type SunburstNativeNode = NativeNode<SunburstRowShape>

type Rank = readonly [number, number]

interface TrailEntry {
  readonly arcId?: string | undefined
  readonly area: SceneArea
  readonly rank: Rank
  readonly arc: ArcValues
  readonly ghost: boolean
  readonly label?: SceneLabel | undefined
}

export type SectorTrail = Map<string, TrailEntry>

interface SunburstLabelStyle {
  readonly fontSize: number
  readonly fill: string
  readonly fontWeight: number
  /** Halo color and width; painted behind the glyphs through `.bk-sunburst-label` (paint-order: stroke). */
  readonly stroke: string
  readonly strokeWidth: number
  readonly nameOf: (node: SunburstNativeNode) => string
  /** Extra class per label; the chart addresses labels by it from a scoped hover rule. */
  readonly classOf?: (node: SunburstNativeNode) => string
}

export interface SunburstDecorations {
  readonly segmentRoles: ReadonlyArray<{ readonly index: number; readonly fill: string }>
  /** Pop-out distance in px for the focused sector; 0 disables the overlay layer. */
  readonly popOut: number
  /** Receives point identity by node id on every render so a controlled hover can address a sector. */
  readonly registry?: Map<string, ChartPoint<SunburstNativeNode, number, number>>
  /** Receives each sector's exact base extent by node id for pointer containment and hover budgets. */
  readonly pushes?: Map<string, SectorPush>
  /** Arc index the fixed push rules address (`bk-sb-a<i>` on sectors, `bk-sb-p<i>` on their overlays). */
  readonly arcIndexOf?: (node: SunburstNativeNode) => number | undefined
  /** Ring depth from the data root (bklit's `arc.depth`). The native node's `ancestorIds` restart at `rootId`, so ranking by them
   * re-orders the sectors on every zoom; see the sort below. */
  readonly depthOf?: (node: SunburstNativeNode) => number | undefined
  /** Label style; omit to render no labels. */
  readonly labels?: SunburstLabelStyle | undefined
  /** Sectors of the previous render by key, so a zoom can collapse the ones that leave (owned by the chart, survives definition rebuilds). */
  readonly trail?: SectorTrail
  /** The chart's own geometry of a sector in the current layout: partition share, ring and radii (geometry.ts `sectorArc`). */
  readonly arcOf: (
    node: SunburstNativeNode,
    layout: Readonly<PolarLayoutContext>,
  ) => ArcValues | undefined
  /** Intro delay (ms) of a sector's enter sweep. */
  readonly delayOf: (node: SunburstNativeNode) => number
  /** What the sector layer paints and tweens (see SectorFeed). */
  readonly feed: SectorFeed
  /** Id of the view's root; a change makes the layer tween the geometry (a zoom). */
  readonly view: string
  readonly sweepMs: number
  readonly enterTransition: EnterTransition | undefined
  readonly labelsDelayMs: number
}

// A leaving sector retains its key while its geometry collapses. Keeps its arc classes (push and emphasis rules still reach it); only the pointer cursor goes.
const ghostOf = (area: Readonly<SceneArea>): SceneArea => {
  const kept = area.className
    ?.split(' ')
    .filter((name) => name !== 'bk-sunburst-branch')
    .join(' ')

  const { pointOwner: _pointOwner, className: _className, ...rest } = area

  return { ...rest, ...(kept === undefined || kept === '' ? {} : { className: kept }) }
}

const isArea = (node: SceneNode): node is SceneArea => node.kind === 'area'

const labelText = (
  area: Readonly<SceneArea>,
  node: SunburstNativeNode,
  style: SunburstLabelStyle,
): SceneLabel => ({
  anchor: 'middle',
  baseline: 'middle',
  fontSize: style.fontSize,
  fontWeight: style.fontWeight,
  key: `${area.key}:label`,
  kind: 'label',
  className: `bk-sunburst-label ${style.classOf?.(node) ?? ''}`.trim(),
  style: {
    fill: style.fill,
    ...(style.strokeWidth > 0 ? { stroke: style.stroke, strokeWidth: style.strokeWidth } : {}),
  },
  text: style.nameOf(node),
  x: 0,
  y: 0,
})

// The label's box: a group whose opacity the layer steps at bklit's fit rule; the text inside is posed by the layer from the same geometry.
const labelBox = (text: SceneLabel): SceneNode => ({
  ariaHidden: true,
  children: [text],
  className: LABEL_BOX_CLASS,
  key: `${text.key}-box`,
  kind: 'group',
})

// Every sector's point owner carries a SunburstNativeNode datum.
const rowSchema = Schema.Struct({
  id: Schema.String,
  parentId: Schema.NullOr(Schema.String),
  value: Schema.Finite,
})

const nativeNodeSchema = Schema.Struct({
  id: Schema.String,
  parentId: Schema.NullOr(Schema.String),
  ancestorIds: Schema.Array(Schema.String),
  branchId: Schema.NullOr(Schema.String),
  name: Schema.String,
  data: Schema.NullOr(rowSchema),
  depth: Schema.Finite,
  height: Schema.Finite,
  internal: Schema.Boolean,
  external: Schema.Boolean,
  value: Schema.Finite,
  source: Schema.Array(rowSchema),
  sourceIndexes: Schema.Array(Schema.Finite),
})

const nativeNodeOf = (area: Readonly<SceneArea>): SunburstNativeNode | undefined => {
  const datum = area.pointOwner?.datum

  return Schema.is(nativeNodeSchema)(datum) ? datum : undefined
}

const depthOf = (area: Readonly<SceneArea>): number => nativeNodeOf(area)?.ancestorIds.length ?? 0

// The overlay is the sector itself under its own key, hidden until its node is on the hovered path; the layer gives it the sector's geometry, so it morphs with the sector under it
// (bklit's popped segment is its morphing geometry grown, sunburst-segment.tsx:58-69). Grow and ancestor push are radial geometry updates in the owned layer.
const popFor = (
  sector: Readonly<SceneArea>,
  point: Readonly<ChartPoint<SunburstNativeNode, number, number>> | undefined,
  className: string | undefined,
): SceneArea => ({
  ...sector,
  ariaHidden: true,
  ...(className === undefined ? {} : { className }),
  key: `${sector.key}:pop`,
  ...(point === undefined ? {} : { pointOwner: point }),
  style: { ...sector.style, opacity: 0 },
})

type SunburstPoint = ChartPoint<SunburstNativeNode, number, number>

type SceneGroup = Extract<SceneNode, { readonly kind: 'group' }>

interface GroupBuild {
  readonly areas: Array<SceneArea>
  readonly pops: Array<SceneArea>
  readonly labels: Array<[rank: Rank, box: SceneNode]>
  readonly entries: Map<string, Omit<TrailEntry, 'ghost'>>
  /** Paint rank of each sector: bklit's `sortSunburstSegments` draws deeper rings first, later arcs first within a ring (inner rings last). */
  readonly rank: Map<SceneArea, Rank>
  readonly layout: Readonly<PolarLayoutContext>
}

const sectorClassName = (
  point: SunburstPoint,
  arcIndex: number | undefined,
  _decorations: Readonly<SunburstDecorations>,
): string | undefined => {
  const arcClass = arcIndex === undefined ? undefined : `bk-sb-a${arcIndex}`

  return joinClasses(point.datum.external ? undefined : 'bk-sunburst-branch', arcClass) || undefined
}

/** Publishes the geometry the layer paints for the sector under `keys` (its overlay, label and label box share it). */
const publish = (
  decorations: Readonly<SunburstDecorations>,
  keys: ReadonlyArray<string | undefined>,
  arc: ArcValues,
  delayMs: number,
  arcId?: string,
): void => {
  for (const key of keys) {
    if (key !== undefined) {
      decorations.feed.geometry.set(key, {
        arc,
        delayMs,
        arcId: arcId ?? decorations.feed.geometry.get(key)?.arcId,
      })
    }
  }
}

const addSector = (
  build: GroupBuild,
  child: Readonly<SceneArea>,
  point: SunburstPoint,
  decorations: Readonly<SunburstDecorations>,
): void => {
  const arc = decorations.arcOf(point.datum, build.layout)

  if (arc === undefined) {
    return
  }

  decorations.registry?.set(point.datum.id, point)
  const arcIndex = decorations.arcIndexOf?.(point.datum)

  const sector: SceneArea = {
    ...child,
    ...(sectorClassName(point, arcIndex, decorations) === undefined
      ? {}
      : { className: sectorClassName(point, arcIndex, decorations) ?? '' }),
  }

  const sectorRank: Rank = [
    decorations.depthOf?.(point.datum) ?? point.datum.ancestorIds.length,
    arcIndex ?? build.areas.length + 1,
  ]

  build.rank.set(sector, sectorRank)
  build.areas.push(sector)
  decorations.pushes?.set(point.datum.id, {
    thickness: arc[3] - arc[2],
    bisector: (arc[0] + arc[1]) / 2,
    halfSweep: (arc[1] - arc[0]) / 2,
    minR: arc[2],
    maxR: arc[3],
  })
  const delayMs = decorations.delayOf(point.datum)
  const popKey = decorations.popOut > 0 ? `${sector.key}:pop` : undefined

  if (popKey !== undefined) {
    // The overlay shares the sector geometry; the layer applies exact radial hover growth.
    build.pops.push(
      popFor(sector, point, arcIndex === undefined ? undefined : `bk-sb-p${arcIndex}`),
    )
  }

  publish(decorations, [sector.key, popKey], arc, delayMs, point.datum.id)

  const label =
    decorations.labels === undefined ? undefined : labelText(child, point.datum, decorations.labels)

  if (label !== undefined) {
    const box = labelBox(label)
    publish(decorations, [label.key, box.key], arc, 0, point.datum.id)
    build.labels.push([sectorRank, box])
  }

  build.entries.set(sector.key, {
    arc,
    arcId: point.datum.id,
    area: sector,
    label,
    rank: sectorRank,
  })
}

const addGhost = (
  build: GroupBuild,
  trail: SectorTrail,
  [key, previous]: readonly [string, TrailEntry],
  decorations: Readonly<SunburstDecorations>,
): void => {
  const ghost = ghostOf(previous.area)
  const arc = previous.ghost ? previous.arc : collapsedArc(previous.arc)
  build.rank.set(ghost, previous.rank)
  build.areas.push(ghost)
  // Its label rides the collapse too and hides where bklit's would (the fit rule on the shrinking arc).
  const box = previous.label === undefined ? undefined : labelBox(previous.label)
  // Its overlay collapses with it under the same key, so a zoom that brings the sector back grows the overlay from the
  // point too instead of entering it at its final shape.
  const arcIndex = /(?:^| )bk-sb-a(\d+)(?: |$)/u.exec(ghost.className ?? '')?.[1]
  const popKey = decorations.popOut > 0 && arcIndex !== undefined ? `${ghost.key}:pop` : undefined

  if (popKey !== undefined) {
    build.pops.push(popFor(ghost, undefined, `bk-sb-p${arcIndex}`))
  }

  publish(decorations, [ghost.key, popKey, previous.label?.key, box?.key], arc, 0, previous.arcId)
  trail.set(key, {
    arc,
    arcId: previous.arcId,
    area: ghost,
    ghost: true,
    label: previous.label,
    rank: previous.rank,
  })

  if (box !== undefined) {
    build.labels.push([previous.rank, box])
  }
}

// Sectors that left stay as collapsed, non-interactive areas (kept across renders, so the collapse is not cut short by the
// native exit fade); a later zoom that brings one back finds its element and grows it from the point.
const keepTrail = (
  build: GroupBuild,
  trail: SectorTrail,
  decorations: Readonly<SunburstDecorations>,
): void => {
  const live = new Set(build.areas.map((area) => area.key))
  const gone = [...trail].filter(([key]) => !live.has(key))
  trail.clear()

  for (const [key, entry] of build.entries) {
    trail.set(key, { ...entry, ghost: false })
  }

  for (const entry of gone) {
    addGhost(build, trail, entry, decorations)
  }
}

const paintOrder = ([depthA, indexA]: Rank, [depthB, indexB]: Rank): number =>
  depthA === depthB ? indexB - indexA : depthB - depthA

const layers = (node: SceneGroup, { areas, pops, labels, rank }: GroupBuild): Array<SceneNode> => {
  pops.sort((a, b) => depthOf(a) - depthOf(b))
  // The order must not depend on the zoom: the layer keeps one element per key, and a node detached and re-attached
  // in one task starts no CSS transition, so a re-ordered dimmed sector would snap to full opacity. Absolute depth + bklit arc index (ghosts keep their last rank) is the same in every view.
  areas.sort((a, b) => paintOrder(rank.get(a) ?? [0, 0], rank.get(b) ?? [0, 0]))
  const out: Array<SceneNode> = [{ ...node, children: areas }]
  // Labels paint above the pop-out overlay (bklit draws labels last); unrelated labels hide through the host's CSS rules.
  // Same zoom-independent order as the sectors (see above), so no label box is re-inserted mid-zoom.
  labels.sort(([rankA], [rankB]) => paintOrder(rankA, rankB))

  if (pops.length > 0) {
    out.push({
      ariaHidden: true,
      children: pops,
      className: 'bk-sb-pops',
      key: `${node.key}:pop`,
      kind: 'group',
      ...(node.renderer === undefined ? {} : { renderer: node.renderer }),
    })
  }

  if (labels.length > 0) {
    out.push({
      ariaHidden: true,
      children: labels.map(([, box]) => box),
      key: `${node.key}:labels`,
      kind: 'group',
      ...(node.renderer === undefined ? {} : { renderer: node.renderer }),
    })
  }

  return out
}

const decorateGroup = (
  node: SceneGroup,
  pointByKey: ReadonlyMap<string, SunburstPoint>,
  layout: Readonly<PolarLayoutContext>,
  decorations: Readonly<SunburstDecorations>,
): Array<SceneNode> => {
  const build: GroupBuild = {
    areas: [],
    entries: new Map(),
    labels: [],
    layout,
    pops: [],
    rank: new Map(),
  }

  for (const child of node.children) {
    const point = isArea(child) ? pointByKey.get(child.key) : undefined

    if (point !== undefined && isArea(child)) {
      addSector(build, child, point, decorations)
    }
  }

  // Each data arc has one role; optional Segment configs only change its fill.
  const baseAreas = [...build.areas]
  build.areas.length = 0
  build.pops.length = 0
  build.entries.clear()
  for (const [roleIndex, role] of decorations.segmentRoles.entries()) {
    const base = baseAreas.find(
      (area) => area.className?.split(' ').includes(`bk-sb-a${role.index}`) === true,
    )
    if (base === undefined) continue
    const entry = decorations.feed.geometry.get(base.key)
    if (entry === undefined) continue
    const key = `${base.key}:role:${roleIndex}`
    const area = { ...base, key, style: { ...base.style, fill: role.fill } }
    const rank = build.rank.get(base) ?? [0, 0]
    build.rank.set(area, rank)
    build.areas.push(area)
    decorations.feed.geometry.set(key, entry)
    build.entries.set(key, { arc: entry.arc, arcId: entry.arcId, area, rank })
    if (decorations.popOut > 0) {
      const pop = popFor(area, pointByKey.get(base.key), `bk-sb-p${role.index}`)
      build.pops.push(pop)
      decorations.feed.geometry.set(pop.key, entry)
    }
  }
  if (decorations.trail !== undefined) {
    // Removed data roles unmount immediately; zoom ghosts only belong to roles that still exist.
    for (const [key] of decorations.trail) {
      const role = Number(key.split(':role:').at(-1))
      if (role >= decorations.segmentRoles.length) decorations.trail.delete(key)
    }
    keepTrail(build, decorations.trail, decorations)
  }

  return layers(node, build)
}

export const nativeSunburst = (
  rows: ReadonlyArray<SunburstRowShape>,
  options: SunburstParentOptions<SunburstRowShape>,
  decorations: Readonly<SunburstDecorations>,
  renderer: Parameters<typeof sunburst>[1]['renderer'],
): PolarMark<SunburstNativeNode, number, number, never, never> => {
  const base = sunburst(rows, { ...options, ...(renderer === undefined ? {} : { renderer }) })

  return {
    ...base,
    initialize: (context) => {
      const initialized = base.initialize(context)

      return {
        ...initialized,
        render: (renderContext) => {
          const scene = initialized.render(renderContext)
          decorations.pushes?.clear()
          decorations.feed.geometry.clear()
          decorations.feed.view = decorations.view
          decorations.feed.sweepMs = decorations.sweepMs
          decorations.feed.enterTransition = decorations.enterTransition
          decorations.feed.labelsDelayMs = decorations.labelsDelayMs
          const pointByKey = new Map((scene.points ?? []).map((point) => [point.key, point]))

          const nodes = scene.nodes.flatMap((node): Array<SceneNode> =>
            node.kind === 'group'
              ? decorateGroup(node, pointByKey, renderContext.layout, decorations)
              : [node],
          )

          return { ...scene, nodes }
        },
      }
    },
  }
}
