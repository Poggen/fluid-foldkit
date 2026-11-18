import type { TimeSeriesProps } from '../cartesian/root-options'
import type { CartesianLayer } from '../cartesian/layers'

export interface SeriesBarProps<Key extends string = string> {
  readonly dataKey: Key
  readonly fill?: string
  readonly stroke?: string
  readonly radius?: number
  readonly animate?: boolean
  readonly fadedOpacity?: number
}

export const SeriesBar: <const Key extends string>(
  props: SeriesBarProps<Key>,
) => { readonly kind: 'seriesBar'; readonly props: SeriesBarProps<Key> } = <
  const Key extends string,
>(
  props: SeriesBarProps<Key>,
) =>
  ({
    kind: 'seriesBar',
    props,
  }) satisfies { readonly kind: 'seriesBar'; readonly props: SeriesBarProps<Key> }

export interface ComposedChartProps<Row> extends Omit<TimeSeriesProps<Row>, 'children'> {
  readonly barSize?: number
  readonly maxBarSize?: number
  readonly barGap?: number
  readonly stacked?: boolean
  readonly stackGap?: number
  readonly children: ReadonlyArray<
    | CartesianLayer<Row>
    | { readonly kind: 'seriesBar'; readonly props: SeriesBarProps<keyof Row & string> }
  >
}
