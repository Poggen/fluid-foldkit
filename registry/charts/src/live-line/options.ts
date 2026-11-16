import { Schema } from 'effect'
import type { ChartStyle } from '../cartesian/content-types'
import type { CartesianLayer } from '../cartesian/layers'
import type { ChartMargin } from './types'
import type { LiveLine, LiveXAxis, LiveYAxis } from './carriers'

export const LiveLinePoint = Schema.Struct({ time: Schema.Number, value: Schema.Number })

export interface LiveLinePoint extends Schema.Schema.Type<typeof LiveLinePoint> {}

/** Synthesized hover values, not a transported source row. A `date` alias overwrites Date. */
export interface LiveLineTooltipDatum {
  readonly date: Date | number
  readonly time: number
  readonly value: number
  readonly [key: string]: Date | number | undefined
}

export type LiveChild =
  | ReturnType<typeof LiveLine | typeof LiveXAxis | typeof LiveYAxis>
  | CartesianLayer<LiveLineTooltipDatum>

export interface LiveLineChartProps {
  readonly data: ReadonlyArray<LiveLinePoint & Readonly<Record<string, unknown>>>
  readonly value: number
  readonly dataKey?: string
  readonly window?: number
  readonly numXTicks?: number
  readonly nowOffsetUnits?: number
  readonly exaggerate?: boolean
  readonly lerpSpeed?: number
  readonly margin?: Partial<ChartMargin>
  readonly paused?: boolean
  readonly children: ReadonlyArray<LiveChild>
  readonly className?: string
  readonly style?: ChartStyle
  readonly ariaLabel?: string
  readonly ariaDescription?: string
}

export interface LiveCursor {
  readonly key: string
  readonly t: number
  readonly v: number
  readonly x: number
  readonly y: number
  readonly index: number
}
