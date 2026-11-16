import type { SpringConfig } from './series-options'
import { CROSSHAIR_SPRING, HIGHLIGHT_SPRING, TOOLTIP_BOX_SPRING } from '../kit/motion/springs'

export interface ChartConfigValue {
  readonly tooltipSpring: SpringConfig
  readonly tooltipBoxSpring: SpringConfig
  readonly highlightSpring: SpringConfig
}

export const DEFAULT_CHART_CONFIG: ChartConfigValue = {
  tooltipSpring: CROSSHAIR_SPRING,
  tooltipBoxSpring: TOOLTIP_BOX_SPRING,
  highlightSpring: HIGHLIGHT_SPRING,
}

/** Lexical view capabilities are passed explicitly, never retained in a chart Model. */
export interface ChartEnvironment {
  readonly config: ChartConfigValue
  readonly staticPreview: boolean
}

export const defaultChartEnvironment: ChartEnvironment = {
  config: DEFAULT_CHART_CONFIG,
  staticPreview: false,
}

export interface ChartConfigProviderProps<Result> {
  readonly value?: Partial<ChartConfigValue>
  readonly environment?: ChartEnvironment
  readonly children: (environment: ChartEnvironment) => Result
}

export function ChartConfigProvider<Result>(props: ChartConfigProviderProps<Result>): Result {
  return props.children({
    config: { ...DEFAULT_CHART_CONFIG, ...props.value },
    staticPreview: props.environment?.staticPreview ?? false,
  })
}

export function StaticChartPreviewProvider<Result>(props: {
  readonly environment?: ChartEnvironment
  readonly children: (environment: ChartEnvironment) => Result
}): Result {
  return props.children({
    config: props.environment?.config ?? DEFAULT_CHART_CONFIG,
    staticPreview: true,
  })
}

export const useChartConfig = (environment?: ChartEnvironment): ChartConfigValue =>
  environment?.config ?? DEFAULT_CHART_CONFIG

export const useStaticChartPreview = (environment?: ChartEnvironment): boolean =>
  environment?.staticPreview ?? false
