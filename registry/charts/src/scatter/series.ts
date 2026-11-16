import type { ScatterConfig as ScatterProps } from '../cartesian/series-options'
import type { CartesianLayer } from '../cartesian/layers'
import { propsFor } from '../cartesian/table'
import { niced } from '../cartesian/domains'

const CHART_PALETTE = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
]

export interface ScatterSeries {
  readonly yPaint:
    | { readonly kind: 'solid' }
    | {
        readonly kind: 'gradient'
        readonly from: string
        readonly to: string
        readonly stroke: boolean
        readonly outline: boolean
      }
  readonly dataKey: string
  readonly yAxisId: string
  readonly fill: string
  readonly stroke: string
  readonly radius: number
  readonly ringWidth: number
  readonly ringGap: number
  readonly outlineWidth: number
  readonly outlineColor: string
  readonly animate: boolean
  readonly dim: boolean
  readonly inactiveOpacity: number
  readonly inactiveBlur: number
  readonly enterBlur: number
  readonly activeScale: number
  /** bklit's series colour for tooltip dots and rows: `fill || stroke || palette` (ignores yGradient). */
  readonly tooltipColor: string
}

const GRADIENT_TO = 'var(--color-emerald-500, oklch(69.6% 0.17 162.48))'

const GRADIENT_FROM = 'var(--color-red-500, oklch(63.7% 0.237 25.331))'
// bklit series-markers `enterDuration` (0.5s per dot).

const DEFAULT_Y_AXIS = 'left'

// Kept apart from kit toNumber: a string or null y cell is NaN here (a gap), but 5 / 0 there.
const axisId = (value: string | number | undefined): string =>
  value === undefined ? DEFAULT_Y_AXIS : String(value)

const gradientEnd = (gradient: ScatterProps['yGradient']): string | null => {
  if (gradient === undefined || gradient === false) {
    return null
  }

  return gradient === true ? GRADIENT_TO : (gradient.to ?? GRADIENT_TO)
}

// bklit's `a || b` on colour strings: an empty string falls through.
const firstNonEmpty = (...values: ReadonlyArray<string | undefined>): string | undefined =>
  values.find((v) => v !== undefined && v !== '')

const seriesPaint = (props: ScatterProps): ScatterSeries['yPaint'] => {
  const gradient = props.yGradient

  if (gradient === undefined || gradient === false) {
    return { kind: 'solid' }
  }

  return {
    kind: 'gradient',
    from: gradient === true ? GRADIENT_FROM : (gradient.from ?? GRADIENT_FROM),
    to: gradient === true ? GRADIENT_TO : (gradient.to ?? GRADIENT_TO),
    stroke: props.stroke === undefined,
    outline: props.outlineColor === undefined && props.stroke === undefined,
  }
}

export function resolveScatterSeries<Row>(
  table: ReadonlyArray<CartesianLayer<Row>>,
): Array<ScatterSeries> {
  return propsFor(table, 'scatter').map((p, index) => {
    const gradientTo = gradientEnd(p.yGradient)
    const palette = CHART_PALETTE[index % CHART_PALETTE.length] ?? 'var(--chart-1)'
    const tooltipColor = firstNonEmpty(p.fill, p.stroke) ?? palette
    const fill = gradientTo ?? p.fill ?? p.stroke ?? palette
    const stroke = p.stroke ?? fill
    const ringWidth = p.strokeWidth ?? 2

    return {
      yPaint: seriesPaint(p),
      dataKey: p.dataKey,
      yAxisId: axisId(p.yAxisId),
      fill,
      stroke,
      radius: p.radius ?? 5,
      ringWidth,
      ringGap: p.ringGap ?? 2,
      outlineWidth: p.outlineWidth ?? 0,
      outlineColor: p.outlineColor ?? stroke,
      animate: p.animate ?? true,
      dim: p.fadeOnHover ?? true,
      inactiveOpacity: p.inactiveOpacity ?? 0.5,
      inactiveBlur: p.inactiveBlur ?? 2,
      enterBlur: p.enterBlur ?? 2,
      activeScale: (p.showActiveHighlight ?? true) ? 1.35 : 1,
      tooltipColor,
    }
  })
}

/** bklit's scatter y domain: [0, max * 1.1] (100 when there is no positive value), visx-nice'd. */
export function scatterYDomain(values: ReadonlyArray<number>): [number, number] {
  let max = 0

  for (const v of values) {
    if (Number.isFinite(v) && v > max) {
      max = v
    }
  }

  return niced([0, max <= 0 ? 100 : max * 1.1])
}
