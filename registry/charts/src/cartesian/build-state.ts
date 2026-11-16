import type { ChartGradient, ChartMark } from '@tanstack/charts'
import { decorative } from '@tanstack/charts/mark/decorative'
import type { HoverDimRule, HoverHighlight, ProfitLossRule } from './hover-css'
import type { ResolvedSeries } from './series'
import { axisId, DEFAULT_Y_AXIS_ID } from './series'

export type YScaleId = 'y' | `y:${string}`

export type SeriesMark<Row> = ChartMark<Row, Date, number, Date, number, 'x', YScaleId>

export interface BuildState<Row> {
  readonly marks: Array<SeriesMark<Row>>
  readonly gradients: Array<ChartGradient>
  readonly hoverDim: Array<HoverDimRule>
  readonly hoverHighlights: Array<HoverHighlight>
  readonly plRules: Array<ProfitLossRule>
}

export const pushDecorative = <Row>(marks: Array<SeriesMark<Row>>, mark: SeriesMark<Row>): void => {
  marks.push(decorative(mark))
}

export const keyAttr = (value: string): string => value.replaceAll(/["\\\n]/g, String.raw`\$&`)

export const yScaleForAxis = (
  value: string | number | undefined,
): { readonly yScale: YScaleId } => {
  const id = axisId(value)

  return { yScale: id === DEFAULT_Y_AXIS_ID ? 'y' : `y:${id}` }
}

export const yScaleOf = (series: ResolvedSeries): { readonly yScale: YScaleId } =>
  yScaleForAxis(series.yAxisId)
