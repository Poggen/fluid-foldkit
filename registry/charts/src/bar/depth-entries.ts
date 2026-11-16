import { Predicate } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'
import type { ChartViewContext } from '../cartesian/chart-context'
import { useChartStable } from '../cartesian/chart-context'
import { depthEntry } from './geometry'
import type { DepthEntry } from './geometry'
import type { BarDepthProviderProps, BarChartProps } from './options'

export interface BarDepthEntry<Row> extends Omit<DepthEntry, 'index'> {
  readonly dataIndex: number
  readonly datum: Row
  readonly isActive: boolean
}

export type BarDepthConfig<Row> = Pick<
  BarDepthProviderProps<Row>,
  'segmentsAccessor' | 'minBarHeight'
> &
  Pick<BarChartProps<Row>, 'missingValues'>

export interface BarViewContext<Row, Action = void> extends ChartViewContext<Row, Action> {
  readonly depthConfig: BarDepthConfig<Row>
}

export type BarContextRenderer<Row> = <Message, Mounts>(
  context: BarViewContext<Row, Message>,
  h: HtmlBuilder<Message, Mounts>,
) => Html

/** Project custom-layer geometry from the existing Bar owner and its first depth provider. */
export function useBarDepthEntries<Row extends Readonly<Record<string, unknown>>, Action>(
  context: BarViewContext<Row, Action>,
  dataKey: string,
  activeIndex?: number,
): Array<BarDepthEntry<Row>> {
  const { data, barScale, bandWidth, yScale, innerHeight, innerWidth, barXAccessor } =
    useChartStable(context)

  const { segmentsAccessor, minBarHeight = 0 } = context.depthConfig

  if (
    barScale === undefined ||
    bandWidth === undefined ||
    bandWidth === 0 ||
    barXAccessor === undefined
  ) {
    return []
  }

  const zeroY = yScale(0)
  const step = barScale.step()

  return data.flatMap((datum, dataIndex): Array<BarDepthEntry<Row>> => {
    const segments = segmentsAccessor?.(datum)?.filter((segment) => segment.value > 0) ?? []
    const segmentTotal = segments.reduce((sum, segment) => sum + segment.value, 0)
    const raw = datum[dataKey]
    let value = segmentTotal

    if (segments.length === 0) {
      if (context.depthConfig.missingValues === 'gap' && (raw === null || raw === undefined))
        return []

      value = Predicate.isNumber(raw) ? raw : 0
    }

    const label = barXAccessor(datum)
    const top = segments.at(-1)
    const hasTop = top !== undefined && segmentTotal > 0

    const input = {
      index: dataIndex,
      label,
      value,
      bandX: barScale(label) ?? 0,
      bandWidth,
      step,
      innerWidth,
      plotLeft: 0,
      baselineY: zeroY,
      valueY: Number.isNaN(value) ? innerHeight : yScale(value),
      minBarHeight,
    }

    const entry = depthEntry(
      hasTop ? { ...input, topSegmentFraction: top.value / segmentTotal } : input,
    )

    if (entry === undefined) {
      return []
    }

    const { index, ...geometry } = entry

    return [
      {
        ...geometry,
        dataIndex: index,
        datum,
        isActive: activeIndex !== undefined && dataIndex === activeIndex,
      },
    ]
  })
}
