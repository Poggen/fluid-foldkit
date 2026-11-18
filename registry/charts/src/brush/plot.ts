import { Option } from 'effect'
import { inertHtml as h } from 'foldkit/html'
import type { TimeSeriesProps } from '../cartesian/root-options'
import { cartesianInputs } from '../cartesian/root'
import type { BrushPlot, ChartBrushProps } from './options'
import { shownRange, stripExtent } from './state'
import {
  ChartBrushHandleOverlay,
  ChartBrushSelectionOverlay,
  ChartBrushTrackOverlay,
} from './overlays'

/** Build once per declaration, so a preview cannot reset the controlled native gesture. */
export const brushPlot: <Row extends Readonly<Record<string, unknown>>>(
  id: string,
  plot: TimeSeriesProps<Row>,
  brush?: ChartBrushProps,
) => BrushPlot<Row> = function brushPlot<Row extends Readonly<Record<string, unknown>>>(
  id: string,
  plot: TimeSeriesProps<Row>,
  brush: ChartBrushProps = {},
) {
  const inputs = cartesianInputs('area', id, plot, undefined, 'drawing')

  return {
    ...inputs,
    plot,
    brush,
    renderBrush: (state, data) => {
      if (Option.isNone(state.viewport)) {
        return h.empty
      }

      const viewport = state.viewport.value
      const [start, end] = viewport.xDomain

      const range = shownRange(
        state.control,
        Option.some(stripExtent(data, plot.xDataKey ?? 'date')),
      )

      const width = viewport.width - viewport.margin.left - viewport.margin.right
      const height = viewport.height - viewport.margin.top - viewport.margin.bottom

      if (Option.isNone(range) || end <= start) {
        return h.empty
      }

      const props = {
        innerWidth: width,
        innerHeight: height,
        selectionX0: ((range.value.start - start) / (end - start)) * width - 2,
        selectionX1: ((range.value.end - start) / (end - start)) * width + 2,
      }

      const context = { mounted: true, margin: viewport.margin }

      return h.div(
        [h.Class('contents')],
        [
          ChartBrushTrackOverlay({ ...props, ...brush }, context),
          ChartBrushSelectionOverlay(
            id,
            {
              ...props,
              pattern: brush.selectionPattern ?? { preset: 'diagonal', color: 'var(--chart-1)' },
            },
            context,
          ),
          ChartBrushHandleOverlay(props, context),
        ],
      )
    },
  } satisfies BrushPlot<Row>
}
