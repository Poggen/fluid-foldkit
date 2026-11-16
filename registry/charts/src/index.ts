export { GaugeBlock, GaugeLayer, GaugeKey } from './gauge/index'

export { GaugeConfiguration } from './gauge/model'

export type { GaugeViewInputs } from './gauge/model'

export { GaugeProps, GaugeOrientation, GaugeLabelAlign, GaugeLabelPlacement } from './gauge/props'

export {
  DEFAULT_ANIMATION_DURATION_MS,
  DEFAULT_ANIMATION_EASING,
  DEFAULT_CHART_ENTER_TRANSITION,
  DEFAULT_CHART_STATUS,
  DEFAULT_Y_DOMAIN_TWEEN_MS,
  isChartInteractionPhase,
  resolveRestingChartPhase,
  resolveYAxisTickCount,
  Y_AXIS_DEFAULT_TICK_COUNT,
  Y_AXIS_MAX_TICK_COUNT,
  Y_AXIS_MIN_TICK_COUNT,
} from './kit/motion/phase'

export type {
  ChartPhase,
  ChartStatus,
  EnterTransition,
  LineLoadingPulseMode,
  LoadingStyle,
  Transition,
  YAxisOrientation,
} from './kit/motion/phase'

export { computeSquareColumn, topSquareCenterY } from './bar/geometry'

export type { SquareColumnLayout } from './bar/geometry'

export {
  CHART_SCALE_VARS,
  chartScaleCssVars,
  pieCssVars,
  ringCssVars,
  sankeyCssVars,
  choroplethCssVars,
  defaultChoroplethColors,
} from './kit/css-vars'

export type { ChartScaleVars } from './kit/css-vars'

export {
  PATTERN_PRESET_IDS,
  isCirclePattern,
  isCirclesPattern,
  patternPresetTileSize,
} from './kit/pattern/pattern-preset-helpers'

export type { PatternPresetId, PatternPresetOptions } from './kit/pattern/pattern-preset-helpers'

export {
  HEATMAP_MONTHS_ONE_YEAR,
  HEATMAP_MONTHS_SIX,
  HEATMAP_WEEKS_ONE_YEAR,
  getHeatmapCalendarRangeStart,
  getHeatmapWeekCount,
  getHeatmapWeekStartAlignedToRange,
  getHeatmapWeekStartSunday,
  getHeatmapYearStartMonth,
  resolveHeatmapWeekRange,
} from './heatmap/calendar'

export type { HeatmapWeekRange } from './heatmap/calendar'

export {
  filterHeatmapColumns,
  getHeatmapColumnMonthAnchor,
  getHeatmapTimeExtent,
  inferHeatmapCalendarRangeStart,
} from './heatmap/columns'

export type { HeatmapColumn, HeatmapBin } from './heatmap/columns'

export {
  formatHeatmapYAxisLabel,
  getHeatmapDayLabels,
  shouldShowHeatmapYAxisTick,
  HEATMAP_DAY_LABELS,
} from './heatmap/day-labels'

export type {
  HeatmapWeekStartDay,
  HeatmapYAxisLabelFormat,
  HeatmapYAxisTickFilter,
} from './heatmap/day-labels'

export {
  formatHeatmapContributionLabel,
  formatHeatmapTooltipDate,
  formatHeatmapTooltipWeekday,
} from './heatmap/format'

export { buildHeatmapRowOpacity } from './heatmap/hover-style'

export { buildHeatmapLegendGradient } from './heatmap/legend-gradient'

export { getHeatmapSeparatorColumnIndices } from './heatmap/separators'

export {
  buildHeatmapColorScale,
  buildHeatmapColorScaleFromStyles,
  buildHeatmapFillScale,
  defaultHeatmapColorScale,
  defaultHeatmapFillScale,
  heatmapLevelPatternId,
  isHeatmapLevelPattern,
  levelStylesFromColors,
  resolveHeatmapLevelStyles,
  HEATMAP_DEFAULT_LEVEL_COLORS,
  HEATMAP_DEFAULT_LEVEL_STYLES,
} from './heatmap/colors'

export type {
  HeatmapLevelColors,
  HeatmapLevelStyle,
  HeatmapLevelStyles,
  HeatmapLevelFillMode,
} from './heatmap/colors'

export { defineCartesianBlock } from './cartesian/block'

export type { CartesianViewInputs } from './cartesian/block'

export { buildTimeSeriesDefinition } from './cartesian/definition'

export type { CartesianCompilationOptions } from './cartesian/definition'

export {
  Line,
  Area,
  Grid,
  XAxis,
  YAxis,
  Background,
  SegmentBackground,
  SegmentLineFrom,
  SegmentLineTo,
} from './cartesian/layers'

export type {
  SegmentBackgroundProps,
  SegmentLineProps,
  SegmentLineVariant,
} from './cartesian/segment-options'

export { ChartLoadingLabel } from './kit/loading/label-view'

export type { ChartLoadingLabelProps } from './kit/loading/label-view'

export { LineLoadingPulseStrokeBlock, LineLoadingPulseStrokeLayer } from './kit/loading/pulse-view'

export {
  LineLoadingSweepBlock,
  LineLoadingSweepLayer,
  lineLoadingSweepConfiguration,
  lineLoadingSweepInputs,
  initialLineLoadingSweepPreference,
} from './kit/loading/line-sweep'

export type { LineSweepViewInputs } from './kit/loading/line-sweep'

export type { LineLoadingSweepProps } from './kit/loading/sweep-options'

export type { LineLoadingPulseStrokeProps } from './kit/loading/pulse-view'

export { ChartRevealClip } from './kit/loading/reveal-view'

export type { ChartRevealClipProps } from './kit/loading/reveal-view'

export { BarChartLoading } from './bar/loading-root'

export type { BarChartLoadingProps } from './bar/loading-root'

export { getSkeletonHeights } from './kit/loading/skeleton-heights'

export type { CartesianLayer } from './cartesian/layers'

export type {
  LineConfig as LineProps,
  AreaConfig as AreaProps,
  PatternAreaConfig as PatternAreaProps,
  ScatterConfig as ScatterProps,
  SeriesPointMarkerStyle,
  SpringConfig,
} from './cartesian/series-options'

export type {
  BackgroundConfig as BackgroundProps,
  GridProps,
  XAxisConfig as XAxisProps,
  YAxisConfig as YAxisProps,
} from './cartesian/axis-options'

export type {
  ProjectionPoint,
  ProjectionStrokeStyle,
  ProjectionLineProps,
  ProjectionLineConfig,
  ProjectionLineEndMarkerProps,
  LineSeriesTerminalMarkerProps,
  ProfitLossLineProps,
  ChartMarker,
  ChartMarkersProps,
  SeriesMarkersProps,
  MarkerGroupProps,
} from './cartesian/overlay-options'

export type {
  ChartTooltipProps,
  ChartSelection,
  IndicatorWidth,
  IndicatorFadeEdges,
} from './cartesian/tooltip-options'

export type {
  RegisteredLineConfig as LineConfig,
  Margin,
  ReferenceAreaConfig,
} from './cartesian/context-types'

export { LineChart, AreaChart, timeSeriesConfiguration } from './cartesian/root'

export type { LineChartProps, AreaChartProps, TimeSeriesProps } from './cartesian/root-options'

export {
  PatternArea,
  ChartTooltip,
  ProfitLossLine,
  SeriesMarkers,
  ReferenceArea,
  ChartMarkers,
  MarkerGroup,
  ProjectionLine,
  ProjectionLineEndMarker,
  LineSeriesTerminalMarker,
} from './cartesian/layers'

export { LineChartLoading, AreaChartLoading } from './cartesian/loading-root'

export type {
  LineChartLoadingProps,
  AreaChartLoadingProps,
  CartesianLoadingProps,
} from './cartesian/loading-options'

export { generateChartSkeletonData, generateChartSkeletonFromTarget } from './cartesian/skeleton'

export type { GenerateChartSkeletonDataOptions } from './cartesian/skeleton'

export { TooltipDot, TooltipIndicator } from './cartesian/layers'

export type { TooltipDotProps, TooltipIndicatorProps } from './cartesian/tooltip-carrier-options'

export { TooltipContent } from './cartesian/tooltip-view'

export type { TooltipContentProps, TooltipRow } from './cartesian/tooltip-view'

export { TooltipPanel, DateTicker, MarkerTooltipContent } from './cartesian/tooltip-primitives'

export type {
  TooltipPanelProps,
  DateTickerProps,
  MarkerTooltipItem,
  MarkerTooltipContentProps,
} from './cartesian/tooltip-primitives'

export { CandlestickChart } from './candlestick/root'

export { Candlestick } from './cartesian/layers'

export type { CandlestickChartProps, CandlestickProps, OHLCDataPoint } from './candlestick/options'

export { ScatterChart } from './scatter/root'

export { Scatter } from './cartesian/layers'

export type { ScatterChartProps } from './scatter/options'

export { BarChart } from './bar/root'

export {
  Bar,
  BarSquares,
  BarColumnTrack,
  BarXAxis,
  BarYAxis,
  BarDepthProvider,
  BarDepthBack,
  BarDepthFront,
  BarPulse,
} from './bar/carriers'

export type {
  BarChartProps,
  BarOrientation,
  BarProps,
  BarAnimationType,
  BarLineCap,
  BarSquaresProps,
  BarColumnTrackProps,
  BarXAxisProps,
  BarYAxisProps,
  BarDepthProviderProps,
  BarDepthBackProps,
  BarDepthFrontProps,
  BarDepthSegment,
  BarPulseProps,
} from './bar/options'

export { ComposedChart } from './composed/root'

export { SeriesBar } from './composed/options'

export type { SeriesBarProps, ComposedChartProps } from './composed/options'

export { PieChart } from './pie/root'

export { DEFAULT_HOVER_OFFSET } from './pie/definition'

export { PieSlice, PieCenter, defaultPieColors } from './pie/options'

export { PieCenterShell } from './pie/shell'

export { usePieStable, PieProvider, usePie, usePieHover } from './pie/context'

export type {
  PieChartProps,
  PieSliceHoverEffect,
  PieSliceProps,
  PieData,
  PieArcData,
  PieCenterProps,
  PieCenterShellProps,
} from './pie/options'

export type { PieContextValue } from './pie/context'

export { RingChart } from './ring/root'

export { Ring, RingCenter, defaultRingColors } from './ring/options'

export { useRingStable, useRing, useRingHover, RingProvider } from './ring/context'

export type {
  RingChartProps,
  RingProps,
  RingData,
  RingLineCap,
  RingCenterProps,
} from './ring/options'

export type { RingContextValue } from './ring/context'

export {
  RadarChart,
  RadarGrid,
  RadarAxis,
  RadarLabels,
  RadarArea,
  defaultRadarColors,
  RadarProvider,
  radarCssVars,
  useRadar,
  useRadarHover,
  useRadarStable,
} from './radar/index'

export type {
  RadarChartProps,
  RadarGridProps,
  RadarAxisProps,
  RadarLabelsProps,
  RadarAreaProps,
  RadarData,
  RadarMetric,
  RadarContextValue,
} from './radar/index'

export { FunnelChart } from './funnel/index'

export type { FunnelChartProps, FunnelStage, FunnelGradientStop } from './funnel/index'

export {
  HeatmapChart,
  HeatmapChartLoading,
  useHeatmap,
  HeatmapInteractionProvider,
  HeatmapInteractionBoundary,
  HeatmapCells,
  HeatmapXAxis,
  HeatmapYAxis,
  HeatmapTooltip,
  HeatmapSeparator,
  HeatmapLegend,
  HEATMAP_LEGEND_LEVELS,
  HeatmapProvider,
  heatmapCssVars,
  levelColorsFromStyles,
} from './heatmap/index'

export type {
  HeatmapChartProps,
  HeatmapChartLoadingProps,
  HeatmapContextValue,
  HeatmapLayout,
  HeatmapCellsProps,
  HeatmapXAxisProps,
  HeatmapYAxisProps,
  HeatmapTooltipProps,
  HeatmapSeparatorProps,
  HeatmapLegendVariant,
  HeatmapLegendProps,
} from './heatmap/index'

export { LiveLineChart, detectMomentum, LiveLine, LiveXAxis, LiveYAxis } from './live-line/index'

export type {
  LiveLineChartProps,
  LiveLinePoint,
  LiveLineTooltipDatum,
  Momentum,
  LiveLineProps,
  LiveXAxisProps,
  LiveYAxisProps,
  MomentumColors,
} from './live-line/index'

export {
  SunburstChart,
  SunburstSegment,
  SunburstCenter,
  SunburstLabels,
  SunburstHint,
  SunburstBreadcrumb,
  sumValues,
  buildArcs,
  ringOptions,
  clockwiseFraction,
  defaultSunburstGrowPadding,
  useSunburstBreadcrumbItems,
  sunburstCssVars,
  defaultSunburstColors,
  opacityForRelativeDepth,
  useSunburstHover,
  useSunburstStable,
} from './sunburst/index'

export type {
  SunburstChartProps,
  SunburstSegmentProps,
  SunburstCenterProps,
  SunburstLabelsProps,
  SunburstHintContext,
  SunburstHintProps,
  SunburstBreadcrumbItem,
  SunburstBreadcrumbProps,
  SunburstEnterTransition,
  SunburstNode,
  ArcDatum,
  Focus,
} from './sunburst/index'

export {
  SankeyChart,
  SankeyLink,
  SankeyNode,
  SankeyTooltip,
  SankeyProvider,
  useSankey,
} from './sankey/index'

export type {
  SankeyChartProps,
  SankeyData,
  SankeyLabelOrientation,
  SankeyLinkProps,
  SankeyNodeProps,
  SankeyTooltipProps,
  SankeyContextValue,
  SankeyTooltipData,
  SankeyTooltipRequest,
  SankeyLinkDatum,
  SankeyNodeDatum,
  SankeySvgResource,
} from './sankey/index'

export {
  ChoroplethChart,
  ChoroplethFeatureComponent,
  ChoroplethTooltip,
  ChoroplethGraticule,
  useChoroplethZoom,
  useChoropleth,
  ChoroplethProvider,
} from './choropleth/index'

export type {
  ChoroplethChartProps,
  ChoroplethFeatureProps,
  ChoroplethTooltipProps,
  ChoroplethGraticuleProps,
  ChoroplethContextValue,
  ChoroplethFeature,
  ChoroplethFeatureProperties,
  ChoroplethTooltipData,
  TransformMatrix,
  ChoroplethSvgResource,
} from './choropleth/index'

export {
  ChartConfigProvider,
  StaticChartPreviewProvider,
  DEFAULT_CHART_CONFIG,
  defaultChartEnvironment,
  useChartConfig,
  useStaticChartPreview,
} from './cartesian/chart-config'

export type {
  ChartConfigValue,
  ChartConfigProviderProps,
  ChartEnvironment,
} from './cartesian/chart-config'

export {
  computeYDomainsByAxis,
  getPrimaryYScale,
  isLoadingChromePhase,
  isYDomainTweenPhase,
  mergeYDomainRecords,
  niceYDomain,
  shouldTweenYDomain,
} from './cartesian/y-domain-utils'

export type { YDomain } from './cartesian/y-domain-utils'

export { DEFAULT_Y_AXIS_ID } from './cartesian/series'

export {
  LinearGradient,
  RadialGradient,
  GradientDarkgreenGreen,
  GradientLightgreenGreen,
  GradientOrangeRed,
  GradientPinkBlue,
  GradientPinkRed,
  GradientPurpleOrange,
  GradientPurpleTeal,
  GradientSteelPurple,
  GradientTealBlue,
} from './kit/gradients'

export type {
  GradientStop,
  GradientChildStop,
  LinearGradientProps,
  RadialGradientProps,
} from './kit/gradients'

export { ChartLegend, Legend } from './legend/root'

export {
  LegendItemComponent,
  LegendLabel,
  LegendMarker,
  LegendProgress,
  LegendValue,
  legendCssVars,
} from './legend/parts'

export { useLegend, useLegendItem } from './legend/contexts'

export type { LegendContextValue, LegendItemContextValue, LegendItemData } from './legend/contexts'

export type {
  ChartLegendProps,
  LegendItem,
  LegendItemProps,
  LegendLabelProps,
  LegendMarkerProps,
  LegendProgressProps,
  LegendProps,
  LegendValueProps,
} from './legend/options'

export {
  ChartLegendHoverProvider,
  useChartLegendHover,
  ProfitLossLegendHoverProvider,
  useProfitLossLegendHover,
} from './legend/hover-contexts'

export { ProfitLossLegend } from './legend/profit-loss'

export type { ProfitLossLegendProps, ProfitLossSegment } from './legend/profit-loss'

export {
  PROFIT_LOSS_POSITIVE_COLOR,
  PROFIT_LOSS_NEGATIVE_COLOR,
  PROFIT_LOSS_TOOLTIP_LABEL_FALLBACK,
  PROFIT_LOSS_LEGEND_ITEMS,
  profitLossColor,
  resolveProfitLossTooltipLabel,
} from './legend/profit-loss'

export {
  PatternCircles,
  PatternHexagons,
  PatternLines,
  PatternWaves,
} from './kit/pattern/primitives'

export type {
  PatternCirclesProps,
  PatternHexagonsProps,
  PatternLinesProps,
  PatternWavesProps,
  PatternOrientationType,
} from './kit/pattern/types'

export { renderPatternPreset } from './kit/pattern/presets'

export {
  ChartProvider,
  chartCssVars,
  defaultScatterColors,
  useChart,
  useChartHover,
  useChartStable,
  useYScale,
} from './cartesian/chart-context'

export type {
  ChartContextCapabilities,
  ChartContextRenderer,
  ChartContextValue,
  ChartHoverContextValue,
  ChartStableContextValue,
  ChartViewContext,
  TooltipData,
  TooltipUpdate,
} from './cartesian/chart-context'

export type {
  ReferenceAreaProps,
  ReferenceAreaIfOverflow,
  ReferenceAreaStrokeStyle,
  ReferenceAreaRect,
} from './cartesian/reference-area-options'

export {
  buildProjectionPath,
  computeProjectionAnchorTangentSlope,
  buildHorizontalTangentBezierPath,
  projectionValueExtents,
  projectionDateExtents,
} from './kit/projection-utils'

export type {
  ProjectionMode,
  ProjectionAutoMethod,
  ProjectionCurveKind,
  ProjectionPathDensity,
  BuildProjectionPathOptions,
} from './kit/projection-utils'

export {
  ChartStatFlowBlock,
  ChartStatFlowLayer,
  ChartStatFlowKey,
  ChartStatFlowFormat,
  ChartStatFlowProps,
  defaultChartStatFlowFormat,
  chartCenterContainerClassName,
  chartCenterValueClassName,
  chartCenterLabelClassName,
} from './stat-flow/index'

export type { ChartStatFlowViewInputs } from './stat-flow/index'

export {
  geometryFor,
  lerpGeometry,
  transitionGeometry,
  arcPath,
  centroidAngle,
  geomCentroidAngle,
  geomCentroidRadius,
} from './sunburst/public-geometry'

export type { ArcGeometry } from './sunburst/public-geometry'

export {
  localProgress,
  buildSunburstEnterTiming,
  buildRevealSchedule,
  segmentRevealFromRingSweep,
  buildRevealDelays,
} from './sunburst/public-timing'

export type {
  SunburstEnterTiming,
  SunburstRevealSchedule,
  SunburstSegmentEnterDelays,
} from './sunburst/public-timing'

export {
  DEFAULT_CHART_LIFECYCLE,
  resolveTooltipBoxMotion,
  resolveVerticalFadeSides,
  indicatorFadeGradientStops,
  resolveLineLoadingPulseMode,
  getSeriesMarkerVisualExtent,
} from './kit/public-paint'

export type { VerticalFadeSides, IndicatorFadeGradientStop } from './kit/public-paint'

export {
  mergeProjectionYDomain,
  mergeProjectionXDomainMax,
  computeReferenceAreaRect,
} from './kit/public-geometry'

export type { ComputeReferenceAreaRectOptions } from './kit/public-geometry'

export {
  ChartBrush,
  ChartBrushLayout,
  ChartBrushTrackOverlay,
  ChartBrushSelectionOverlay,
} from './brush'

export type {
  ChartBrushSelection,
  ChartBrushPatternPreset,
  ChartBrushSelectionPattern,
  ChartBrushTrackOverlayStyle,
  ChartBrushProps,
  ChartBrushTrackOverlayProps,
  ChartBrushSelectionOverlayProps,
  ChartBrushLayoutState,
  ChartBrushLayoutProps,
} from './brush'

export { useBarDepthEntries } from './bar/depth-entries'

export type {
  BarDepthEntry,
  BarDepthConfig,
  BarViewContext,
  BarContextRenderer,
} from './bar/depth-entries'

export { useActiveMarkers } from './cartesian/active-markers'

export {
  SeriesPointMarkerBlock,
  SeriesPointMarkerLayer,
  SeriesPointMarkerKey,
} from './series-point-marker/index'

export type { SeriesPointMarkerProps } from './series-point-marker/props'

export {
  BarLoadingSkeletonBlock,
  BarLoadingSkeletonLayer,
  barLoadingSkeletonConfiguration,
  initialBarLoadingSkeletonPreference,
} from './kit/loading/bar-skeleton'

export type { BarLoadingSkeletonProps } from './kit/loading/sweep-options'

export { splitProfitLossSegments } from './legend/profit-loss-segments'

export type {
  SplitProfitLossSegment,
  SplitProfitLossSegmentsOptions,
} from './legend/profit-loss-segments'

export { TooltipBoxBlock, TooltipBoxLayer, TooltipBoxKey } from './cartesian/tooltip-box-index'

export {
  TooltipBoxMotionPolicy,
  createTooltipBoxMotionLayer,
} from './cartesian/tooltip-box-context'

export type { TooltipBoxPositionSources } from './cartesian/tooltip-box-context'

export { TooltipBoxConfiguration } from './cartesian/tooltip-box-model'

export type { TooltipBoxProps, TooltipBoxInputs } from './cartesian/tooltip-box-model'
