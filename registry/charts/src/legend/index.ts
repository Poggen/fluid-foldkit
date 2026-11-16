export { ChartLegend, Legend } from './root'

export {
  LegendItemComponent,
  LegendLabel,
  LegendMarker,
  LegendProgress,
  LegendValue,
  legendCssVars,
} from './parts'

export { useLegend, useLegendItem } from './contexts'

export type { LegendContextValue, LegendItemContextValue, LegendItemData } from './contexts'

export type {
  ChartLegendProps,
  LegendItem,
  LegendItemProps,
  LegendLabelProps,
  LegendMarkerProps,
  LegendProgressProps,
  LegendProps,
  LegendValueProps,
} from './options'

export {
  ChartLegendHoverProvider,
  useChartLegendHover,
  ProfitLossLegendHoverProvider,
  useProfitLossLegendHover,
} from './hover-contexts'

export { ProfitLossLegend } from './profit-loss'

export type { ProfitLossLegendProps, ProfitLossSegment } from './profit-loss'

export {
  PROFIT_LOSS_POSITIVE_COLOR,
  PROFIT_LOSS_NEGATIVE_COLOR,
  PROFIT_LOSS_TOOLTIP_LABEL_FALLBACK,
  PROFIT_LOSS_LEGEND_ITEMS,
  profitLossColor,
  resolveProfitLossTooltipLabel,
} from './profit-loss'

export { splitProfitLossSegments } from './profit-loss-segments'

export type { SplitProfitLossSegment, SplitProfitLossSegmentsOptions } from './profit-loss-segments'
