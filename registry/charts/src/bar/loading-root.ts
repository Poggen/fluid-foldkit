import { Schema } from 'effect'
import { BarChart } from './root'
import type { BarChartProps } from './options'

export interface BarChartLoadingProps {
  readonly margin?: BarChartProps<never>['margin']
  readonly aspectRatio?: string
  readonly className?: string
}

const EmptyRow = Schema.Struct({})

const EMPTY_DATA: ReadonlyArray<typeof EmptyRow.Type> = []

/** Bind the returned real BarChart Block. Its existing loading lifecycle owns skeleton rendering. */
export function BarChartLoading(name: string, props: BarChartLoadingProps = {}) {
  const root = BarChart({ name, Row: EmptyRow })

  const baseProps = {
    children: [],
    status: 'loading',
    aspectRatio: props.aspectRatio ?? '2 / 1',
    className: props.className ?? '',
  } satisfies Parameters<typeof root.inputs>[1]

  const chartProps = props.margin === undefined ? baseProps : { ...baseProps, margin: props.margin }

  return {
    ...root,
    data: EMPTY_DATA,
    configuration: root.configuration(chartProps),
    inputs: (id: string) => root.inputs(id, chartProps),
  }
}
