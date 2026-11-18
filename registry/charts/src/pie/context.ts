import type { Html } from 'foldkit/html'
import { pieGeometry } from './definition'
import type { PieChartProps, PieArcData, PieData } from './options'

export const pieContext: (
  props: PieChartProps,
  size: number,
  id: string,
  hover: PieHoverValue,
  lifecycle: { readonly isLoaded: boolean; readonly containerRef: PieStableValue['containerRef'] },
) => PieContextValue = function pieContext(
  props: PieChartProps,
  size: number,
  id: string,
  hover: PieHoverValue,
  lifecycle: { readonly isLoaded: boolean; readonly containerRef: PieStableValue['containerRef'] },
) {
  const g = pieGeometry(props, size, id)

  return {
    data: props.data,
    arcs: g.arcs,
    size,
    center: size / 2,
    outerRadius: g.outerRadius,
    innerRadius: g.innerRadius,
    padAngle: props.padAngle ?? 0,
    cornerRadius: g.cornerRadius,
    hoverOffset: g.hoverOffset,
    animationKey: 0,
    ...(props.enterTransition === undefined ? {} : { enterTransition: props.enterTransition }),
    enterStaggerScale: props.enterStaggerScale ?? 1,
    containerRef: lifecycle.containerRef,
    totalValue: g.totalValue,
    getColor: g.color,
    getFill: g.fill,
    geometryScrubbing: props.geometryScrubbing ?? false,
    scrubSlicePaths: null,
    isLoaded: lifecycle.isLoaded,
    ...hover,
  }
}

export interface PieStableValue {
  readonly data: ReadonlyArray<PieData>
  readonly arcs: ReadonlyArray<PieArcData>
  readonly size: number
  readonly center: number
  readonly outerRadius: number
  readonly innerRadius: number
  readonly padAngle: number
  readonly cornerRadius: number
  readonly hoverOffset: number
  readonly animationKey: number
  readonly enterTransition?: NonNullable<PieChartProps['enterTransition']>
  readonly enterStaggerScale: number
  readonly containerRef: { readonly current: HTMLDivElement | null }
  readonly totalValue: number
  readonly getColor: (index: number) => string
  readonly getFill: (index: number) => string
  readonly geometryScrubbing: boolean
  readonly scrubSlicePaths: null
  readonly isLoaded: boolean
}

export interface PieHoverValue {
  readonly hoveredIndex: number | null
  readonly setHoveredIndex: (index: number | null) => void
}

export interface PieContextValue extends PieStableValue, PieHoverValue {}

export const usePieStable: (context: PieContextValue) => PieStableValue = (
  context: PieContextValue,
) => context

export const usePieHover: (context: PieContextValue) => PieHoverValue = (
  context: PieContextValue,
) => ({
  hoveredIndex: context.hoveredIndex,
  setHoveredIndex: context.setHoveredIndex,
})

export const usePieHoverCoordinator = usePieHover

export const usePie: (context: PieContextValue) => PieContextValue = (context: PieContextValue) =>
  context

export const PieProvider: (
  value: PieContextValue,
  render: (context: PieContextValue) => Html,
) => Html = (value: PieContextValue, render: (context: PieContextValue) => Html) => render(value)
