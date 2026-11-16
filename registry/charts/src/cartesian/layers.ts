import type { ReferenceAreaProps } from './reference-area-options'
import type { PatternLayer } from '../kit/pattern/types'
import type { GradientLayer } from '../kit/gradients'
import type { TooltipDotProps, TooltipIndicatorProps } from './tooltip-carrier-options'
import type { AreaConfig, LineConfig, PatternAreaConfig, ScatterConfig } from './series-options'
import type { BackgroundConfig, GridProps, XAxisConfig, YAxisConfig } from './axis-options'
import type {
  ChartMarkersProps,
  LineSeriesTerminalMarkerProps,
  MarkerGroupProps,
  ProfitLossLineProps,
  ProjectionLineEndMarkerProps,
  ProjectionLineProps,
  SeriesMarkersProps,
} from './overlay-options'
import type { CandlestickProps } from '../candlestick/options'
import type { ChartTooltipProps } from './tooltip-options'
import type { SegmentBackgroundProps, SegmentLineProps } from './segment-options'

export interface ConfigurationLayer<Kind extends string, Props> {
  readonly kind: Kind
  readonly props: Props
}

function layer<Kind extends string, Props>(
  kind: Kind,
  props: Props,
): ConfigurationLayer<Kind, Props> {
  return { kind, props }
}

/** Native configuration carriers replace React child parsing with a checked discriminated union. */
export const Line = (props: Readonly<LineConfig>) => layer('line', props)

export const Area = (props: Readonly<AreaConfig>) => layer('area', props)

export const PatternArea = (props: Readonly<PatternAreaConfig>) => layer('patternArea', props)

export const Candlestick = (props: Readonly<CandlestickProps> = {}) => layer('candlestick', props)

export const Scatter = (props: Readonly<ScatterConfig>) => layer('scatter', props)

export const ReferenceArea = (props: Readonly<ReferenceAreaProps>) => layer('referenceArea', props)

export const Background = (props: Readonly<BackgroundConfig>) => layer('background', props)

/** Configuration only. The existing chart owner supplies selection and rendering. */
export const SegmentBackground = (props: Readonly<SegmentBackgroundProps> = {}) =>
  layer('segmentBackground', props)

export const SegmentLineFrom = (props: Readonly<SegmentLineProps> = {}) =>
  layer('segmentLineFrom', props)

export const SegmentLineTo = (props: Readonly<SegmentLineProps> = {}) =>
  layer('segmentLineTo', props)

export const Grid = (props: Readonly<GridProps> = {}) => layer('grid', props)

export const XAxis = (props: Readonly<XAxisConfig> = {}) => layer('xAxis', props)

export const YAxis = (props: Readonly<YAxisConfig> = {}) => layer('yAxis', props)

export const TooltipDot = (props: Readonly<TooltipDotProps> = {}) => layer('tooltipDot', props)

export const TooltipIndicator = (props: Readonly<TooltipIndicatorProps> = {}) =>
  layer('tooltipIndicator', props)

export const ChartTooltip = <Row = unknown>(
  props: Readonly<ChartTooltipProps<Row>> = {},
): ConfigurationLayer<'tooltip', Readonly<ChartTooltipProps<Row>>> => layer('tooltip', props)

export const ProfitLossLine = (props: Readonly<ProfitLossLineProps>) =>
  layer('profitLossLine', props)

export const SeriesMarkers = (props: Readonly<SeriesMarkersProps>) => layer('seriesMarkers', props)

export const ChartMarkers = (props: Readonly<ChartMarkersProps>) => layer('markers', props)

export const MarkerGroup = (props: Readonly<MarkerGroupProps>) => layer('markerGroup', props)

export const ProjectionLine = (props: Readonly<ProjectionLineProps>) => layer('projection', props)

export const ProjectionLineEndMarker = (props: Readonly<ProjectionLineEndMarkerProps>) =>
  layer('projectionMarker', props)

export const LineSeriesTerminalMarker = (props: Readonly<LineSeriesTerminalMarkerProps>) =>
  layer('terminalMarker', props)

export type CartesianLayer<Row = unknown> =
  | ConfigurationLayer<'tooltip', Readonly<ChartTooltipProps<Row>>>
  | PatternLayer
  | GradientLayer
  | ReturnType<
      | typeof Line
      | typeof Area
      | typeof PatternArea
      | typeof Scatter
      | typeof Candlestick
      | typeof ReferenceArea
      | typeof Background
      | typeof SegmentBackground
      | typeof SegmentLineFrom
      | typeof SegmentLineTo
      | typeof Grid
      | typeof XAxis
      | typeof YAxis
      | typeof TooltipDot
      | typeof TooltipIndicator
      | typeof ProfitLossLine
      | typeof SeriesMarkers
      | typeof ChartMarkers
      | typeof MarkerGroup
      | typeof ProjectionLine
      | typeof ProjectionLineEndMarker
      | typeof LineSeriesTerminalMarker
    >
