import { createMark } from '@tanstack/charts'
import type {
  ChartBounds,
  ChartLayoutOptions,
  ChartLinearGradient,
  ChartMark,
  ChartPoint,
  MarkRenderContext,
  MarkScene,
  SceneArea,
  SceneNode,
} from '@tanstack/charts'
import { LABEL_FONT, fontMetrics, labelItems, labelNodes } from './labels'
import type { FunnelDatum } from './focus'

const FALLBACK_FONT = 'ui-sans-serif, system-ui, sans-serif'

/** One colour stop of a stage gradient. */
interface FunnelGradientStopInput {
  /** Position of the stop along the gradient: a percentage string such as `"50%"`, or a fraction from 0 to 1. */
  readonly offset: string | number
  /** Colour of the stop. */
  readonly color: string
}

/** One stage of a funnel. */
interface FunnelStageInput {
  /** Name of the stage, shown with its segment. */
  readonly label: string
  /** Size of the stage. The first stage counts as 100% and each segment is sized relative to it. */
  readonly value: number
  /** Text to show instead of the formatted `value`, for example `"12.4k"`. */
  readonly displayValue?: string
  /** Colour of this stage, overriding the chart-level `color`. */
  readonly color?: string
  /**
   * Colour stops for a linear gradient on this stage, for example `[{ offset: "0%", color: "#8b5cf6" }, { offset: "100%", color: "#3b82f6" }]`. Takes precedence over `color` for the innermost ring; the outer halo rings use the first stop as a solid colour.
   */
  readonly gradient?: ReadonlyArray<FunnelGradientStopInput>
}

type FunnelMark = ChartMark<FunnelDatum, number, number>

type FunnelPoint = ChartPoint<FunnelDatum, number, number>

interface FunnelMarkConfig {
  readonly stages: ReadonlyArray<FunnelStageInput>
  readonly horizontal: boolean
  readonly color: string
  readonly layers: number
  readonly gapPx: number
  readonly curved: boolean
  readonly showLabels: boolean
  readonly showValues: boolean
  readonly showPercentage: boolean
  readonly formatValue: (value: number) => string
  readonly formatPercentage: (pct: number) => string
  readonly labelLayout: 'spread' | 'grouped'
  readonly labelOrientation?: 'vertical' | 'horizontal' | undefined
  readonly labelAlign: 'center' | 'start' | 'end'
  /** Resource-host id prefix: the innermost ring of stage i paints `url(#<prefix>-<i>)` (bklit renderPattern). */
  readonly patternPrefix?: string | undefined
  /** False while hydrating: labels use the server's fallback measurements so the first client render matches the server markup. */
  readonly measureText: boolean
  readonly grid: {
    readonly bands: boolean
    readonly bandColor: string
    readonly lines: boolean
    readonly lineColor: string
    readonly lineOpacity: number
    readonly lineWidth: number
  } | null
}

const BKLIT_CONTROL = 0.55

type Pt = readonly [number, number]

const edgeRun: (points: ReadonlyArray<Pt>, axis: 'x' | 'y', first: 'M' | 'L') => string = (
  points: ReadonlyArray<Pt>,
  axis: 'x' | 'y',
  first: 'M' | 'L',
) => {
  let d = ''

  for (let i = 0; i < points.length; i++) {
    const point = points[i]

    if (point === undefined) continue
    const [x, y] = point

    if (i === 0) {
      d = `${first}${x},${y}`
      continue
    }

    const previous = points[i - 1]

    if (previous === undefined) continue
    const [px, py] = previous
    const dx = (x - px) * BKLIT_CONTROL
    const dy = (y - py) * BKLIT_CONTROL
    d +=
      axis === 'x'
        ? `C${px + dx},${py},${x - dx},${y},${x},${y}`
        : `C${px},${py + dy},${x},${y - dy},${x},${y}`
  }

  return d
}

const edgeArea: (forward: ReadonlyArray<Pt>, back: ReadonlyArray<Pt>, axis: 'x' | 'y') => string = (
  forward: ReadonlyArray<Pt>,
  back: ReadonlyArray<Pt>,
  axis: 'x' | 'y',
) => `${edgeRun(forward, axis, 'M')}${edgeRun([...back].reverse(), axis, 'L')}Z`

const HALF_EXTENT = 0.44

const RING_SHRINK = 0.35

const HOVER_POP = 0.12

const BAND_INSET = 0.75

const funnelGradientId: (stage: number) => string = (stage: number) => `funnel-stage-${stage}`

const ringOpacity: (layer: number, layers: number) => number = (layer: number, layers: number) =>
  0.18 + (layer / (layers - 1 || 1)) * 0.65

const ringScale: (layer: number, layers: number) => number = (layer: number, layers: number) =>
  1 - (layer / layers) * RING_SHRINK

const popExtra: (layer: number, layers: number) => number = (layer: number, layers: number) =>
  (layer / Math.max(layers - 1, 1)) * HOVER_POP

const stageColor: (stage: FunnelStageInput, fallback: string) => string = (
  stage: FunnelStageInput,
  fallback: string,
) => stage.gradient?.[0]?.color ?? stage.color ?? fallback

const buildFunnelGradients: (
  stages: ReadonlyArray<FunnelStageInput>,
  horizontal: boolean,
) => ReadonlyArray<ChartLinearGradient> = (
  stages: ReadonlyArray<FunnelStageInput>,
  horizontal: boolean,
) =>
  stages.flatMap((stage, index) => {
    const stops = stage.gradient

    if (!stops || stops.length === 0) {
      return []
    }

    return [
      {
        id: funnelGradientId(index),
        stops: stops.map((stop) => ({
          color: stop.color,
          // oxlint-disable-next-line unicorn/prefer-number-coercion -- offsets like "50%" need parseFloat; Number("50%") is NaN.
          offset:
            typeof stop.offset === 'string' ? Number.parseFloat(stop.offset) / 100 : stop.offset,
        })),
        x1: 0,
        x2: horizontal ? 1 : 0,
        y1: 0,
        y2: horizontal ? 0 : 1,
      },
    ]
  })

interface RingFillInput {
  readonly base: string
  readonly gradientId: string | undefined
  readonly index: number
  readonly innermost: boolean
  readonly patternPrefix: string | undefined
}

const ringFill: (argument0: Readonly<RingFillInput>) => string = ({
  base,
  gradientId,
  index,
  innermost,
  patternPrefix,
}: Readonly<RingFillInput>) => {
  if (innermost && patternPrefix !== undefined) {
    return `url(#${patternPrefix}-${index})` satisfies string
  }

  if (innermost && gradientId !== undefined) {
    return `url(#${gradientId})` satisfies string
  }

  return base satisfies string
}

interface FunnelGeometry {
  readonly W: number
  readonly H: number
  readonly count: number
  readonly norms: ReadonlyArray<number>
  /** Stage cell length and the gap after it, along the stage axis. */
  readonly cellPx: number
  readonly gapPx: number
  readonly cellStart: (index: number) => number
  readonly stageStart: (index: number) => number
}

const funnelGeometry: (
  config: FunnelMarkConfig,
  width: number,
  height: number,
) => FunnelGeometry = (config: FunnelMarkConfig, width: number, height: number) => {
  const { stages, horizontal } = config
  const W = Math.max(1, width)
  const H = Math.max(1, height)
  const count = stages.length
  const first = stages[0]?.value ?? 1

  const norms = stages.map((stage) => {
    const norm = stage.value / first

    return Number.isFinite(norm) && norm > 0 ? norm : 0
  })

  const unitPx = (horizontal ? W : H) / count
  const gapData = Math.min(0.5, config.gapPx / unitPx)
  const cellPx = (1 - (gapData * (count - 1)) / count) * unitPx
  const gapPx = gapData * unitPx
  const cellStart: (index: number) => number = (index: number) => index * (cellPx + gapPx)

  return {
    H,
    W,
    cellPx,
    cellStart,
    count,
    gapPx,
    norms,
    stageStart: (index) => Math.round(cellStart(index)),
  }
}

interface Frame {
  readonly x: number
  readonly y: number
}

const group: (key: string, className: string, children: ReadonlyArray<SceneNode>) => SceneNode = (
  key: string,
  className: string,
  children: ReadonlyArray<SceneNode>,
) => ({
  children,
  className,
  key,
  kind: 'group',
})

interface RingInput {
  readonly config: FunnelMarkConfig
  readonly geo: FunnelGeometry
  readonly frame: Frame
  readonly index: number
  readonly layer: number
}

const ringArea: (argument0: Readonly<RingInput>) => SceneArea = ({
  config,
  geo,
  frame,
  index,
  layer,
}: Readonly<RingInput>) => {
  const { horizontal, layers, curved } = config
  const stage = config.stages[index]

  if (stage === undefined) throw new RangeError('Funnel stage outside data')
  const startNorm = geo.norms[index] ?? 0
  const endNorm = index < geo.count - 1 ? (geo.norms[index + 1] ?? startNorm) : startNorm

  const gradientId =
    stage.gradient && stage.gradient.length > 0 ? funnelGradientId(index) : undefined

  const scale = ringScale(layer, layers) * HALF_EXTENT * (horizontal ? geo.H : geo.W)
  const mid = (horizontal ? geo.H : geo.W) / 2
  const pos0 = geo.stageStart(index)
  const pos1 = pos0 + geo.cellPx
  const half0 = startNorm * scale
  const half1 = endNorm * scale

  const at: (pos: number, cross: number) => Pt = (pos: number, cross: number) =>
    horizontal ? [frame.x + pos, frame.y + cross] : [frame.x + cross, frame.y + pos]

  const first: Array<Pt> = [at(pos0, mid - half0), at(pos1, mid - half1)]
  const second: Array<Pt> = [at(pos0, mid + half0), at(pos1, mid + half1)]

  return {
    className: `bkm-ring bkm-l${layer}`,
    key: `funnel-s${index}-l${layer}`,
    kind: 'area',
    ...(curved ? { path: edgeArea(first, second, horizontal ? 'x' : 'y') } : {}),
    points: [...first, ...[...second].reverse()],
    style: {
      fill: ringFill({
        base: stageColor(stage, config.color),
        gradientId,
        index,
        innermost: layer === layers - 1,
        patternPrefix: config.patternPrefix,
      }),
      fillOpacity: ringOpacity(layer, layers),
    },
  } satisfies SceneArea
}

const stagePoints: (
  config: FunnelMarkConfig,
  geo: FunnelGeometry,
  frame: Frame,
  id: string,
  index: number,
) => Array<FunnelPoint> = (
  config: FunnelMarkConfig,
  geo: FunnelGeometry,
  frame: Frame,
  id: string,
  index: number,
) => {
  const stage = config.stages[index]

  if (stage === undefined) throw new RangeError('Funnel stage outside data')
  const mid = (config.horizontal ? geo.H : geo.W) / 2
  const pos0 = geo.stageStart(index)

  return [pos0, pos0 + geo.cellPx].map((pos, end) => ({
    color: stageColor(stage, config.color),
    datum: { layer: 0, stage: index },
    datumIndex: index * 2 + end,
    group: null,
    groupLabel: stage.label,
    key: `${id}:${index}:${end}`,
    markId: id,
    x: config.horizontal ? frame.x + pos : frame.x + mid,
    xValue: pos,
    y: config.horizontal ? frame.y + mid : frame.y + pos,
    yValue: mid,
  }))
}

const gridNodes: (
  config: FunnelMarkConfig,
  geo: FunnelGeometry,
  frame: Frame,
) => { readonly bands: Array<SceneNode>; readonly lines: Array<SceneNode> } = (
  config: FunnelMarkConfig,
  geo: FunnelGeometry,
  frame: Frame,
) => {
  const { grid, horizontal } = config
  const bands: Array<SceneNode> = []
  const lines: Array<SceneNode> = []

  if (grid?.bands === true) {
    for (let index = 0; index < geo.count; index += 2) {
      const start = geo.cellStart(index)
      bands.push(
        horizontal
          ? {
              height: geo.H - BAND_INSET * 2,
              key: `funnel-band-${index}`,
              kind: 'rect',
              style: { fill: grid.bandColor },
              width: geo.cellPx - BAND_INSET * 2,
              x: frame.x + start + BAND_INSET,
              y: frame.y + BAND_INSET,
            }
          : {
              height: geo.cellPx - BAND_INSET * 2,
              key: `funnel-band-${index}`,
              kind: 'rect',
              style: { fill: grid.bandColor },
              width: geo.W - BAND_INSET * 2,
              x: frame.x + BAND_INSET,
              y: frame.y + start + BAND_INSET,
            },
      )
    }
  }

  if (grid?.lines === true) {
    for (let index = 0; index < geo.count - 1; index += 1) {
      const centre = geo.cellStart(index) + geo.cellPx + geo.gapPx / 2

      const style = {
        stroke: grid.lineColor,
        strokeOpacity: grid.lineOpacity,
        strokeWidth: grid.lineWidth,
      }

      lines.push(
        horizontal
          ? {
              key: `funnel-line-${index}`,
              kind: 'rule',
              style,
              x1: frame.x + centre,
              x2: frame.x + centre,
              y1: frame.y,
              y2: frame.y + geo.H,
            }
          : {
              key: `funnel-line-${index}`,
              kind: 'rule',
              style,
              x1: frame.x,
              x2: frame.x + geo.W,
              y1: frame.y + centre,
              y2: frame.y + centre,
            },
      )
    }
  }

  return { bands, lines }
}

const funnelScene: (
  config: FunnelMarkConfig,
  id: string,
  chart: ChartBounds,
  layout: ChartLayoutOptions,
) => MarkScene<FunnelDatum, number, number> = (
  config: FunnelMarkConfig,
  id: string,
  chart: ChartBounds,
  layout: ChartLayoutOptions,
) => {
  const geo = funnelGeometry(config, chart.width, chart.height)
  const frame: Frame = { x: chart.x, y: chart.y }

  const fontFamily = layout.typography?.fontFamily ?? FALLBACK_FONT

  const fonts = {
    name: fontMetrics(LABEL_FONT.name.size, LABEL_FONT.name.weight, fontFamily, config.measureText),
    pct: fontMetrics(LABEL_FONT.pct.size, LABEL_FONT.pct.weight, fontFamily, config.measureText),
    value: fontMetrics(
      LABEL_FONT.value.size,
      LABEL_FONT.value.weight,
      fontFamily,
      config.measureText,
    ),
  }

  const points: Array<FunnelPoint> = []

  const stages: Array<SceneNode> = config.stages.map((_stage, index) => {
    const rings: Array<SceneNode> = []

    for (let layer = 0; layer < config.layers; layer += 1) {
      rings.push(ringArea({ config, frame, geo, index, layer }))
    }

    points.push(...stagePoints(config, geo, frame, id, index))
    const stage = _stage

    const labels = labelNodes(
      config,
      geo,
      frame,
      fonts,
      index,
      labelItems(config, fontFamily, stage, (geo.norms[index] ?? 0) * 100),
    )

    return group(
      `funnel-s${index}`,
      'bkm-fs',
      labels.length === 0
        ? [
            group(
              `funnel-s${index}:rings`,
              "bkm-fr [[data-bkm-chart='funnel'][data-hover]_&]:[opacity:var(--bkm-funnel-opacity,0.4)]",
              rings,
            ),
          ]
        : [
            group(
              `funnel-s${index}:rings`,
              "bkm-fr [[data-bkm-chart='funnel'][data-hover]_&]:[opacity:var(--bkm-funnel-opacity,0.4)]",
              rings,
            ),
            group(
              `funnel-s${index}:labels`,
              "bkm-fl [[data-bkm-chart='funnel'][data-hover]_&]:[opacity:var(--bkm-funnel-opacity,0.4)]",
              labels,
            ),
          ],
    )
  })

  const { bands, lines } = gridNodes(config, geo, frame)

  return {
    nodes: [
      {
        ariaHidden: true,
        children: [...bands, group(`${id}:stages`, 'bkm-stages', stages), ...lines],
        className: 'bkm-funnel',
        key: id,
        kind: 'group',
      },
    ],
    points,
  }
}

/** The funnel as one mark: its scene is built in `resolveLayout` from the final plot bounds, with no entrance or update motion of its own (funnel.css). */
const createFunnelMark: (config: FunnelMarkConfig) => FunnelMark = (config: FunnelMarkConfig) => {
  const id = 'funnel'

  return createMark<FunnelDatum, number, number>(
    () => ({
      channels: {},
      id,
      resolveLayout: ({ chart, layout }) => ({
        render: (_context: MarkRenderContext) => funnelScene(config, id, chart, layout),
      }),
    }),
    false,
  )
}

export { buildFunnelGradients, createFunnelMark, popExtra, stageColor }

export type { FunnelGradientStopInput, FunnelMarkConfig, FunnelStageInput, FunnelGeometry, Frame }
