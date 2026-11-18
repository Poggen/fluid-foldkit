import { constVoid } from 'effect/Function'

/** The caller supplies its registered parent's operation capability; this provider owns no state. */
export const ChartLegendHoverProvider: <Action, Result>(props: {
  readonly hoveredIndex: number | null
  readonly onHoverChange: (index: number | null) => Action
  readonly children: (context: ChartLegendHoverContextValue<Action>) => Result
}) => Result = function ChartLegendHoverProvider<Action, Result>(props: {
  readonly hoveredIndex: number | null
  readonly onHoverChange: (index: number | null) => Action
  readonly children: (context: ChartLegendHoverContextValue<Action>) => Result
}) {
  return props.children({
    hoveredIndex: props.hoveredIndex,
    setHoveredIndex: props.onHoverChange,
  }) satisfies Result
}

export const ProfitLossLegendHoverProvider: <Result>(props: {
  readonly hoveredIndex: number | null
  readonly children: (context: ProfitLossLegendHoverContextValue) => Result
}) => Result = function ProfitLossLegendHoverProvider<Result>(props: {
  readonly hoveredIndex: number | null
  readonly children: (context: ProfitLossLegendHoverContextValue) => Result
}) {
  return props.children({ hoveredIndex: props.hoveredIndex }) satisfies Result
}

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

export function useChartLegendHover(): ChartLegendHoverContextValue
export function useChartLegendHover<Action>(
  context: ChartLegendHoverContextValue<Action>,
): ChartLegendHoverContextValue<Action>
export function useChartLegendHover<Action>(context?: ChartLegendHoverContextValue<Action>) {
  return (context ?? noSeriesHover) satisfies
    | ChartLegendHoverContextValue<Action>
    | ChartLegendHoverContextValue
}

export const useProfitLossLegendHover: (
  context?: ProfitLossLegendHoverContextValue,
) => ProfitLossLegendHoverContextValue = (context?: ProfitLossLegendHoverContextValue) =>
  context ?? noProfitLossHover
