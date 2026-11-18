import type { ChartViewContext } from './chart-context'
import { useChartHover } from './chart-context'
import type { ChartMarker } from './overlay-options'
import { sourceDate } from './source-date'

/** Markers on the existing focus owner's local calendar date, in their input order. */
export const useActiveMarkers: <
  Row extends Readonly<Record<string, unknown>>,
  Action,
  Marker extends Pick<ChartMarker, 'date'>,
>(
  context: ChartViewContext<Row, Action>,
  items: ReadonlyArray<Marker>,
) => Array<Marker> = function useActiveMarkers<
  Row extends Readonly<Record<string, unknown>>,
  Action,
  Marker extends Pick<ChartMarker, 'date'>,
>(context: ChartViewContext<Row, Action>, items: ReadonlyArray<Marker>) {
  const { tooltipData } = useChartHover(context)

  if (tooltipData === null) {
    return [] satisfies Array<Marker>
  }

  const date = sourceDate(tooltipData.point.date)
  const key = date.toDateString()

  return items.filter((marker) => marker.date.toDateString() === key) satisfies Array<Marker>
}
