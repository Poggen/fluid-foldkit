import { Schema } from 'effect'
import type { Html } from 'foldkit/html'
import type { EnterTransition } from '../kit/motion/phase'
import type { CenterOptions } from '../pie/private/center'

export const RingData = Schema.Struct({
  label: Schema.String,
  value: Schema.Number,
  maxValue: Schema.Number,
  color: Schema.optionalKey(Schema.String),
})

export interface RingData extends Schema.Schema.Type<typeof RingData> {}

export type RingLineCap = 'round' | 'butt'

export type RingEnterTransition = EnterTransition

export interface RingProps {
  readonly index: number
  readonly color?: string
  readonly animate?: boolean
  readonly showGlow?: boolean
  readonly lineCap?: RingLineCap
}

export interface RingCenterRenderProps {
  readonly value: number
  readonly label: string
  readonly isHovered: boolean
  readonly data: RingData
}

export interface RingCenterProps extends CenterOptions {
  readonly children?: (props: RingCenterRenderProps) => Html
}

export type RingChild =
  | { readonly kind: 'ring'; readonly props: RingProps }
  | { readonly kind: 'center'; readonly props: RingCenterProps }

export const Ring: (props: RingProps) => RingChild = (props: RingProps) => ({ kind: 'ring', props })

export const RingCenter: (props?: RingCenterProps) => RingChild = (props: RingCenterProps = {}) =>
  ({ kind: 'center', props }) satisfies RingChild

export interface RingChartProps {
  readonly data: ReadonlyArray<RingData>
  readonly size?: number
  readonly strokeWidth?: number
  readonly ringGap?: number
  readonly baseInnerRadius?: number
  readonly animationDuration?: number
  readonly className?: string
  readonly style?: Readonly<Record<string, string | number>>
  readonly hoveredIndex?: number | null
  readonly onHoverChange?: (index: number | null) => void
  readonly startAngle?: number
  readonly endAngle?: number
  readonly enterTransition?: RingEnterTransition
  readonly enterStaggerScale?: number
  readonly geometryScrubbing?: boolean
  readonly children: ReadonlyArray<RingChild>
  readonly ariaLabel?: string
  readonly ariaDescription?: string
}

export const defaultRingColors = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
]
