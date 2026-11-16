import { Option } from 'effect'
import { constUndefined } from 'effect/Function'
import type { ChartRowSchema } from '../cartesian/data-boundary'
import { timeSeriesConfiguration } from '../cartesian/root'
import type { TimeSeriesProps } from '../cartesian/root-options'
import { defineChartBrushBlock } from './block'
import { brushPlot } from './plot'
import type { BrushPlot, BrushViewInputs, ChartBrushLayoutProps, ChartBrushProps } from './options'
import type { OwnerConfiguration } from './state'

export { ChartBrushSelectionOverlay, ChartBrushTrackOverlay } from './overlays'

export type {
  BrushPlot,
  BrushViewInputs,
  ChartBrushSelection,
  ChartBrushPatternPreset,
  ChartBrushSelectionPattern,
  ChartBrushTrackOverlayStyle,
  ChartBrushProps,
  ChartBrushTrackOverlayProps,
  ChartBrushSelectionOverlayProps,
  ChartBrushLayoutState,
  ChartBrushLayoutProps,
} from './options'

/** Layout presentation shares its Brush Block's one selection owner. */
export function ChartBrushLayout<Row extends Readonly<Record<string, unknown>>>(
  props: ChartBrushLayoutProps<Row>,
): BrushViewInputs<Row> {
  const inputs = {
    height: props.height,
    fitMainContent: props.fitMainContent ?? false,
    renderMain: props.children,
    renderStrip: props.brushStrip ?? constUndefined,
  }

  return props.className === undefined ? inputs : { ...inputs, className: props.className }
}

/** Checked Brush owner; gesture reports leave through its typed OutMessage contract. */
export function ChartBrush<
  RowSchema extends ChartRowSchema & { readonly Type: Readonly<Record<string, unknown>> },
>(options: { readonly name: string; readonly Row: RowSchema }) {
  type Row = RowSchema['Type']

  const recipe = defineChartBrushBlock(options)

  return {
    ...recipe,
    plot: (id: string, plot: TimeSeriesProps<Row>, brush?: ChartBrushProps) =>
      brushPlot(id, plot, brush),
    inputs: (plot: BrushPlot<Row>, height = 80): BrushViewInputs<Row> => ({
      height,
      fitMainContent: false,
      renderStrip: () => plot,
    }),
    configuration: (
      layout: Pick<ChartBrushLayoutProps<Row>, 'xDataKey' | 'xExtentMax' | 'enabled'>,
      plot: TimeSeriesProps<Row>,
      brush: ChartBrushProps = {},
    ): OwnerConfiguration => ({
      plot: timeSeriesConfiguration(plot),
      xDataKey: layout.xDataKey ?? plot.xDataKey ?? 'date',
      xExtentMax:
        layout.xExtentMax === undefined || !Number.isFinite(layout.xExtentMax.getTime())
          ? Option.none()
          : Option.some(layout.xExtentMax),
      enabled: layout.enabled,
      seed:
        brush.initialSelection === undefined || brush.initialSelection === null
          ? Option.none()
          : Option.some({
              start: brush.initialSelection.start.getTime(),
              end: brush.initialSelection.end.getTime(),
            }),
    }),
  }
}
