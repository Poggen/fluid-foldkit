import type { ChartContextRenderer } from './chart-context'
import type { ChartEnvironment } from './chart-config'
import type { ChartStyle } from './content-types'
import type { CartesianLayer } from './layers'
import type { ChartPhase, ChartStatus, EnterTransition } from '../kit/motion/phase'
import type { Margin } from './context-types'

export interface TimeSeriesProps<Row> {
  readonly environment?: ChartEnvironment
  readonly renderContext?: ChartContextRenderer<Row>
  readonly xDataKey?: keyof Row & string
  readonly x?: (row: Row) => Date
  readonly status?: ChartStatus
  readonly animationDuration?: number
  readonly margin?: Partial<Margin>
  readonly aspectRatio?: string
  readonly className?: string
  readonly onPhaseChange?: (phase: ChartPhase) => void
  readonly children: ReadonlyArray<CartesianLayer<Row>>
  readonly loadingLabel?: string
  readonly style?: ChartStyle
  readonly animationEasing?: string
  readonly yDomainTween?: boolean
  readonly yDomainTweenDuration?: number
  readonly xDomain?: readonly [Date, Date]
  /** Fixed primary y-axis bounds. Finite, strictly increasing; no padding or rounding. */
  readonly yDomain?: readonly [number, number]
  readonly xDomainSlotCount?: number
  readonly tweenYDomainOnXDomainChange?: boolean
  readonly enterTransition?: EnterTransition
  readonly revealSignature?: string
  readonly ariaLabel?: string
  readonly ariaDescription?: string
  readonly width?: number
  readonly height?: number
}

export type LineChartProps<Row> = TimeSeriesProps<Row>

export type AreaChartProps<Row> = TimeSeriesProps<Row>
