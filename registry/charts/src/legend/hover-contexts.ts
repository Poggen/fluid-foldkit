import { constVoid } from 'effect/Function'

export interface ChartLegendHoverContextValue<Action = void> {
  readonly hoveredIndex: number | null
  readonly setHoveredIndex: (index: number | null) => Action
}

export interface ProfitLossLegendHoverContextValue {
  readonly hoveredIndex: number | null
}

const noSeriesHover: ChartLegendHoverContextValue = {
  hoveredIndex: null,
  setHoveredIndex: constVoid,
}

const noProfitLossHover: ProfitLossLegendHoverContextValue = { hoveredIndex: null }

/** The caller supplies its registered parent's operation capability; this provider owns no state. */
export function ChartLegendHoverProvider<Action, Result>(props: {
  readonly hoveredIndex: number | null
  readonly onHoverChange: (index: number | null) => Action
  readonly children: (context: ChartLegendHoverContextValue<Action>) => Result
}): Result {
  return props.children({ hoveredIndex: props.hoveredIndex, setHoveredIndex: props.onHoverChange })
}

export function useChartLegendHover(): ChartLegendHoverContextValue
export function useChartLegendHover<Action>(
  context: ChartLegendHoverContextValue<Action>,
): ChartLegendHoverContextValue<Action>
export function useChartLegendHover<Action>(
  context?: ChartLegendHoverContextValue<Action>,
): ChartLegendHoverContextValue<Action> | ChartLegendHoverContextValue {
  return context ?? noSeriesHover
}

export function ProfitLossLegendHoverProvider<Result>(props: {
  readonly hoveredIndex: number | null
  readonly children: (context: ProfitLossLegendHoverContextValue) => Result
}): Result {
  return props.children({ hoveredIndex: props.hoveredIndex })
}

export const useProfitLossLegendHover = (
  context?: ProfitLossLegendHoverContextValue,
): ProfitLossLegendHoverContextValue => context ?? noProfitLossHover
