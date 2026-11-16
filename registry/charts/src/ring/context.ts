import type { Html } from 'foldkit/html'
import { ringGeometry } from './geometry'
import type { RingChartProps, RingData } from './options'
import type { PieHoverValue } from '../pie/context'

export interface RingStableValue {
  readonly data: ReadonlyArray<RingData>
  readonly size: number
  readonly center: number
  readonly strokeWidth: number
  readonly ringGap: number
  readonly baseInnerRadius: number
  readonly animationKey: number
  readonly isLoaded: boolean
  readonly containerRef: { readonly current: HTMLDivElement | null }
  readonly enterTransition?: NonNullable<RingChartProps['enterTransition']>
  readonly enterStaggerScale: number
  readonly totalValue: number
  readonly getColor: (index: number) => string
  readonly getRingRadii: (index: number) => {
    readonly innerRadius: number
    readonly outerRadius: number
  }
  readonly startAngle: number
  readonly endAngle: number
  readonly geometryScrubbing: boolean
  readonly scrubRingLayers?: ReadonlyArray<{
    readonly bgPath: string
    readonly progressPath: string
    readonly color: string
  }> | null
}

export interface RingContextValue extends RingStableValue, PieHoverValue {}

export function ringContext(
  props: RingChartProps,
  size: number,
  hover: PieHoverValue,
  containerRef: RingStableValue['containerRef'] = { current: null },
): RingContextValue {
  const g = ringGeometry(props, size)

  return {
    data: props.data,
    size,
    center: size / 2,
    strokeWidth: g.strokeWidth,
    ringGap: g.ringGap,
    baseInnerRadius: g.baseInnerRadius,
    animationKey: 0,
    isLoaded: true,
    containerRef,
    ...(props.enterTransition === undefined ? {} : { enterTransition: props.enterTransition }),
    enterStaggerScale: props.enterStaggerScale ?? 1,
    totalValue: g.totalValue,
    getColor: g.color,
    getRingRadii: g.getRingRadii,
    startAngle: g.startAngle,
    endAngle: g.endAngle,
    geometryScrubbing: props.geometryScrubbing ?? false,
    scrubRingLayers: null,
    ...hover,
  }
}

export const useRingStable = (context: RingContextValue): RingStableValue => context

export const useRingHover = (context: RingContextValue): PieHoverValue => ({
  hoveredIndex: context.hoveredIndex,
  setHoveredIndex: context.setHoveredIndex,
})

export const useRingHoverCoordinator = useRingHover

export const useRing = (context: RingContextValue): RingContextValue => context

export const RingProvider = (
  value: RingContextValue,
  render: (context: RingContextValue) => Html,
): Html => render(value)
