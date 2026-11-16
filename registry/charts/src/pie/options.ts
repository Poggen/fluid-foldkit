import { Schema } from 'effect'
import type { Html } from 'foldkit/html'
import type { EnterTransition } from '../kit/motion/phase'
import type { CenterOptions } from './private/center'

export const PieData = Schema.Struct({
  label: Schema.String,
  value: Schema.Number,
  color: Schema.optionalKey(Schema.String),
  fill: Schema.optionalKey(Schema.String),
})

export interface PieData extends Schema.Schema.Type<typeof PieData> {}

export type PieSliceHoverEffect = 'translate' | 'grow' | 'none'

export type PieEnterTransition = EnterTransition

export interface PieSliceProps {
  readonly index: number
  readonly color?: string
  readonly fill?: string
  readonly animate?: boolean
  readonly showGlow?: boolean
  readonly hoverEffect?: PieSliceHoverEffect
  readonly hoverOffset?: number
  readonly className?: string
}

export interface PieCenterRenderProps {
  readonly value: number
  readonly label: string
  readonly isHovered: boolean
  readonly data: PieData
}

export interface PieCenterProps extends CenterOptions {
  readonly children?: (props: PieCenterRenderProps) => Html
}

export interface PieCenterShellProps extends CenterOptions {
  readonly centerValue: number
  readonly contextSize: number
  readonly innerRadiusPx: number
  readonly animateEntrance?: boolean
}

export type PieChild =
  | { readonly kind: 'slice'; readonly props: PieSliceProps }
  | { readonly kind: 'center'; readonly props: PieCenterProps }
  | { readonly kind: 'resource'; readonly render: (idPrefix: string) => SVGElement }

export const PieSlice = (props: PieSliceProps): PieChild => ({ kind: 'slice', props })

export const PieCenter = (props: PieCenterProps = {}): PieChild => ({ kind: 'center', props })

export const PieResource = (render: (idPrefix: string) => SVGElement): PieChild => ({
  kind: 'resource',
  render,
})

export interface PieChartProps {
  readonly data: ReadonlyArray<PieData>
  readonly size?: number
  readonly innerRadius?: number
  readonly padAngle?: number
  readonly cornerRadius?: number
  readonly startAngle?: number
  readonly endAngle?: number
  readonly className?: string
  readonly style?: Readonly<Record<string, string | number>>
  readonly hoveredIndex?: number | null
  readonly onHoverChange?: (index: number | null) => void
  readonly hoverOffset?: number
  readonly children: ReadonlyArray<PieChild>
  readonly enterTransition?: PieEnterTransition
  readonly enterStaggerScale?: number
  readonly geometryScrubbing?: boolean
  readonly ariaLabel?: string
  readonly ariaDescription?: string
}

export interface PieArcData {
  readonly data: PieData
  readonly index: number
  readonly startAngle: number
  readonly endAngle: number
  readonly padAngle: number
  readonly value: number
}

export const defaultPieColors = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
]
