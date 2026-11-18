import { DateTime } from 'effect'

import type { CurveFactory } from 'd3-shape'
import { curveLinear, curveMonotoneX, curveNatural } from 'd3-shape'
import { propsFor } from './table'
import type { CartesianLayer } from './layers'

import type { LineLoadingPulseMode, LoadingStyle } from '../kit/motion/phase'
import type { SeriesPointMarkerStyle } from './series-options'

const resolveMarker: (
  style: MarkerStyleInput | undefined,
  seriesStroke: string,
  animate?: boolean,
) => ResolvedMarker = function (
  style: MarkerStyleInput | undefined,
  seriesStroke: string,
  animate = true,
) {
  const fill = style?.fill ?? seriesStroke
  const stroke = style?.stroke ?? fill

  return {
    fill,
    stroke,
    strokeWidth: style?.strokeWidth ?? 2,
    ringGap: style?.ringGap ?? 2,
    outlineWidth: style?.outlineWidth ?? 0,
    outlineColor: style?.outlineColor ?? stroke,
    radius: style?.radius ?? 5,
    fadeOnHover: style?.fadeOnHover ?? true,
    inactiveOpacity: style?.inactiveOpacity ?? 0.5,
    inactiveBlur: style?.inactiveBlur ?? 2,
    enterBlur: style?.enterBlur ?? 2,
    showActiveHighlight: style?.showActiveHighlight ?? true,
    animate,
  } satisfies ResolvedMarker
}

/** Loading hides the base stroke/fill. Original Line retains its point markers; Area hides them. */
export const resolveSeries: <Row>(
  table: ReadonlyArray<CartesianLayer<Row>>,
  chartLoading?: boolean,
) => Array<ResolvedSeries> = function <Row>(
  table: ReadonlyArray<CartesianLayer<Row>>,
  chartLoading = false,
) {
  const out: Array<ResolvedSeries> = []

  const counts = { line: 0, area: 0, pattern: 0 }

  const base: (
    kind: SeriesBase['kind'],
    props: {
      readonly dataKey: string
      readonly stroke?: string | undefined
      readonly fill?: string | undefined
      readonly strokeWidth?: number | undefined
      readonly curve?: CurveFactory | undefined
      readonly yAxisId?: string | number | undefined
      readonly fadeEdges?: FadeEdges | undefined
      readonly dashFromIndex?: number | undefined
      readonly dashArray?: string | undefined
      readonly showMarkers?: boolean | undefined
      readonly markers?: MarkerStyleInput | undefined
      readonly animate?: boolean | undefined
      readonly showHighlight?: boolean | undefined
      readonly loading?: boolean | undefined
      readonly loadingPulseMode?: LineLoadingPulseMode | undefined
      readonly loadingStyle?: LoadingStyle | undefined
      readonly loadingStroke?: string | undefined
      readonly loadingStrokeOpacity?: number | undefined
      readonly onLoadingPulseCycleComplete?: (() => void) | undefined
    },
    fallbackCurve: CurveFactory,
  ) => SeriesBase = (
    kind: SeriesBase['kind'],
    props: {
      readonly dataKey: string
      readonly stroke?: string | undefined
      readonly fill?: string | undefined
      readonly strokeWidth?: number | undefined
      readonly curve?: CurveFactory | undefined
      readonly yAxisId?: string | number | undefined
      readonly fadeEdges?: FadeEdges | undefined
      readonly dashFromIndex?: number | undefined
      readonly dashArray?: string | undefined
      readonly showMarkers?: boolean | undefined
      readonly markers?: MarkerStyleInput | undefined
      readonly animate?: boolean | undefined
      readonly showHighlight?: boolean | undefined
      readonly loading?: boolean | undefined
      readonly loadingPulseMode?: LineLoadingPulseMode | undefined
      readonly loadingStyle?: LoadingStyle | undefined
      readonly loadingStroke?: string | undefined
      readonly loadingStrokeOpacity?: number | undefined
      readonly onLoadingPulseCycleComplete?: (() => void) | undefined
    },
    fallbackCurve: CurveFactory,
  ) => {
    const color = props.stroke ?? props.fill ?? DEFAULT_LINE_STROKE
    const stroke = chartLoading ? 'transparent' : color

    const index = counts[kind]
    counts[kind] = index + 1

    return {
      kind,
      id: `${kind}:${props.dataKey}`,
      dataKey: props.dataKey,
      stroke,
      strokeWidth: props.strokeWidth ?? (kind === 'line' ? 2.5 : 2),
      curve: props.curve ?? fallbackCurve,
      yAxisId: axisId(props.yAxisId),
      fadeEdges: props.fadeEdges ?? kind === 'line',
      dashFromIndex: props.dashFromIndex,
      dashArray: props.dashArray ?? '6,4',
      showMarkers: (kind === 'line' || !chartLoading) && (props.showMarkers ?? false),
      marker: resolveMarker(props.markers, color, props.animate),
      showHighlight: !chartLoading && (props.showHighlight ?? true),
      index,
      loading: loadingOf(props, chartLoading),
    }
  }

  for (const p of propsFor(table, 'patternArea')) {
    const preset = p.patternPreset ?? 'diagonal'
    out.push({
      ...base(
        'pattern',
        { dataKey: p.dataKey, stroke: p.patternColor ?? p.fill, curve: p.curve },
        curveMonotoneX,
      ),
      id: `pattern-${preset}:${p.dataKey}`,
      fill: p.fill ?? p.patternColor ?? DEFAULT_LINE_STROKE,
      fillOpacity: 1,
      showLine: false,
      pattern: {
        preset: p.patternPreset ?? 'diagonal',
        color: p.patternColor ?? p.fill ?? DEFAULT_LINE_STROKE,
      },
    })
  }

  for (const a of propsFor(table, 'area')) {
    const stroke = a.stroke ?? a.fill ?? DEFAULT_LINE_STROKE
    out.push({
      ...base('area', a, curveMonotoneX),
      fill: chartLoading ? 'transparent' : (a.fill ?? stroke),
      fillOpacity: chartLoading ? 0 : (a.fillOpacity ?? 0.4),
      gradientToOpacity: a.gradientToOpacity ?? 0,
      gradientSpan: a.gradientSpan ?? 1,
      showLine: a.showLine ?? true,
    })
  }

  for (const l of propsFor(table, 'line')) {
    out.push(base('line', l, curveNatural))
  }

  for (const p of propsFor(table, 'profitLossLine')) {
    const positive = p.positiveColor ?? 'var(--color-emerald-500, oklch(69.6% 0.17 162.48))'
    const negative = p.negativeColor ?? 'var(--color-red-500, oklch(63.7% 0.237 25.331))'
    out.push({
      ...base(
        'line',
        {
          dataKey: p.dataKey,
          stroke: positive,
          strokeWidth: p.strokeWidth,
          curve: p.curve,
          fadeEdges: false,
          showHighlight: false,
        },
        curveLinear,
      ),
      profitLoss: { positive, negative },
    })
  }

  for (const m of propsFor(table, 'seriesMarkers')) {
    const at = out.findIndex((s) => s.dataKey === m.dataKey && s.kind !== 'pattern')
    const target = at === -1 ? undefined : out[at]

    if (target) {
      out[at] = { ...target, showMarkers: true, marker: resolveMarker(m, target.stroke, m.animate) }
    }
  }

  return out satisfies Array<ResolvedSeries>
}

/** A row's x value as a Date: the chart data contract is a Date, an ISO string or epoch milliseconds (bklit `new Date(row[xKey])`). */
export const toDate: (value: unknown) => Date = function toDate(value: unknown) {
  return value instanceof Date
    ? value
    : DateTime.toDateUtc(
        DateTime.makeUnsafe(
          typeof value === 'string' || typeof value === 'number' ? value : Number.NaN,
        ),
      )
}

const DEFAULT_LINE_STROKE = 'var(--chart-line-primary)'

type MarkerStyleInput = Readonly<SeriesPointMarkerStyle>

type FadeEdges = boolean | 'left' | 'right'

export type Row = Record<string, unknown>

/** bklit SeriesPointMarkerStyle with SeriesMarkers' defaults (series-markers.tsx:55-72); `fill` / `stroke` default to the series stroke. */
interface ResolvedMarker {
  readonly fill: string
  readonly stroke: string
  readonly strokeWidth: number
  readonly ringGap: number
  readonly outlineWidth: number
  readonly outlineColor: string
  readonly radius: number
  readonly fadeOnHover: boolean
  readonly inactiveOpacity: number
  readonly inactiveBlur: number
  readonly enterBlur: number
  readonly showActiveHighlight: boolean
  readonly animate: boolean
}

interface SeriesBase {
  readonly kind: 'line' | 'area' | 'pattern'
  /** Mark id, also the lookup key for tooltip rows (`markId.split(":")[0]`). */
  readonly id: string
  readonly dataKey: string
  readonly stroke: string
  readonly strokeWidth: number
  readonly curve: CurveFactory
  readonly yAxisId: string
  readonly fadeEdges: FadeEdges
  readonly dashFromIndex: number | undefined
  readonly dashArray: string
  readonly showMarkers: boolean
  readonly marker: ResolvedMarker
  readonly showHighlight: boolean
  readonly index: number
  /** Loading pulse overlay (bklit `loading` / `loadingPulseMode`); absent when the series does not pulse. */
  readonly loading: SeriesLoading | undefined
  /** ProfitLossLine: one path, two colours split at zero. */
  readonly profitLoss?: { readonly positive: string; readonly negative: string }
}

interface SeriesLoading {
  readonly followsPhase: boolean
  readonly onCycleComplete: (() => void) | undefined
  readonly mode: LineLoadingPulseMode
  readonly style: LoadingStyle
  readonly stroke: string
  readonly strokeOpacity: number
}

export interface AreaSeries extends SeriesBase {
  readonly fill: string
  readonly fillOpacity: number
  readonly gradientToOpacity: number
  readonly gradientSpan: number
  readonly showLine: boolean
  readonly pattern?: { readonly preset: string; readonly color: string }
}

export type ResolvedSeries = SeriesBase & Partial<Omit<AreaSeries, keyof SeriesBase>>

export const DEFAULT_Y_AXIS_ID = 'left'

const loadingOf: (
  props: {
    readonly loading?: boolean | undefined
    readonly loadingPulseMode?: LineLoadingPulseMode | undefined
    readonly loadingStyle?: LoadingStyle | undefined
    readonly loadingStroke?: string | undefined
    readonly loadingStrokeOpacity?: number | undefined
    readonly onLoadingPulseCycleComplete?: (() => void) | undefined
  },
  chartLoading: boolean,
) => SeriesLoading | undefined = (
  props: {
    readonly loading?: boolean | undefined
    readonly loadingPulseMode?: LineLoadingPulseMode | undefined
    readonly loadingStyle?: LoadingStyle | undefined
    readonly loadingStroke?: string | undefined
    readonly loadingStrokeOpacity?: number | undefined
    readonly onLoadingPulseCycleComplete?: (() => void) | undefined
  },
  chartLoading: boolean,
) => {
  if (
    props.loading === false ||
    (props.loading !== true && props.loadingPulseMode === undefined && !chartLoading)
  ) {
    return undefined
  }

  return {
    followsPhase: props.loadingPulseMode === undefined && props.loading !== true,
    onCycleComplete: props.onLoadingPulseCycleComplete,
    mode: props.loadingPulseMode ?? 'loop',
    style: props.loadingStyle ?? 'pulse',
    stroke: props.loadingStroke ?? 'var(--chart-foreground)',
    strokeOpacity: props.loadingStrokeOpacity ?? 0.5,
  }
}

export const axisId: (value: string | number | undefined) => string = (
  value: string | number | undefined,
) => (value === undefined ? DEFAULT_Y_AXIS_ID : String(value))
