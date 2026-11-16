import type { RadarEnterTransition } from './transition'
import type { RadarChartProps } from './options'
import type { Html } from 'foldkit/html'
import { DEFAULT_RADAR_COLORS } from './area'
import type { RadarData, RadarMetric } from './rows'

export interface RadarContextValue {
  readonly data: Array<RadarData>
  readonly metrics: Array<RadarMetric>
  readonly size: number
  readonly radius: number
  readonly levels: number
  readonly animate: boolean
  readonly enterDurationMs: number
  readonly staggerScale: number
  readonly enterTransition?: RadarEnterTransition
  readonly motionReplayKey: string
  readonly getColor: (index: number) => string
  readonly getAngle: (index: number) => number
  readonly getPointPosition: (index: number, value: number) => { x: number; y: number }
  readonly yScale: (value: number) => number
  readonly hoveredIndex: number | null
  readonly setHoveredIndex: (index: number | null) => void
}

export const radarCssVars = {
  area1: 'var(--chart-1)',
  area2: 'var(--chart-2)',
  area3: 'var(--chart-3)',
  area4: 'var(--chart-4)',
  area5: 'var(--chart-5)',
  background: 'var(--chart-background)',
  border: 'var(--bkm-border)',
  foreground: 'var(--chart-foreground)',
  foregroundMuted: 'var(--chart-foreground-muted)',
  grid: 'var(--chart-grid)',
  label: 'var(--chart-label, oklch(0.65 0.01 260))',
}

export function radarContext(
  props: RadarChartProps,
  hoveredIndex: number | null,
  setHoveredIndex: (index: number | null) => void,
): RadarContextValue {
  const size = props.size ?? 0,
    radius = Math.max(0, (size - (props.margin ?? 60) * 2) / 2)

  const getAngle = (i: number) =>
    (i * Math.PI * 2) / Math.max(1, props.metrics.length) - Math.PI / 2

  const yScale = (value: number) => (value / 100) * radius

  return {
    data: [...props.data],
    metrics: [...props.metrics],
    size,
    radius,
    levels: props.levels ?? 5,
    animate: props.animate ?? true,
    enterDurationMs: props.enterDurationMs ?? 1100,
    staggerScale: props.staggerScale ?? 1,
    motionReplayKey: props.motionReplayKey ?? '',
    ...(props.enterTransition === undefined ? {} : { enterTransition: props.enterTransition }),
    hoveredIndex,
    setHoveredIndex,
    yScale,
    getAngle,
    getColor: (index: number) =>
      props.data.at(index)?.color ??
      DEFAULT_RADAR_COLORS.at(index % DEFAULT_RADAR_COLORS.length) ??
      'var(--chart-1)',
    getPointPosition: (index: number, value: number) => ({
      x: yScale(value) * Math.cos(getAngle(index)),
      y: yScale(value) * Math.sin(getAngle(index)),
    }),
  }
}

export type RadarProviderValue = Omit<RadarContextValue, 'hoveredIndex'>

export const RadarProvider = (
  value: RadarContextValue,
  render: (context: RadarContextValue) => Html,
): Html => render(value)

export const useRadar = (context: RadarContextValue): RadarContextValue => context

export const useRadarHover = ({ hoveredIndex, setHoveredIndex }: RadarContextValue) => ({
  hoveredIndex,
  setHoveredIndex,
})

export const useRadarStable = ({
  hoveredIndex: _hovered,
  ...stable
}: RadarContextValue): RadarProviderValue => stable
