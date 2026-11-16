import type { CurveFactory } from 'd3-shape'

export interface LineLoadingSweepProps {
  readonly curve: CurveFactory
  readonly withArea?: boolean
  readonly mode?: 'loop' | 'exit' | 'enter'
  readonly stroke?: string
  readonly strokeOpacity?: number
  readonly strokeWidth?: number
  readonly pointCount?: number
  readonly durationSeconds?: number
  readonly innerWidth?: number
  readonly innerHeight?: number
}

export interface BarLoadingSkeletonProps {
  readonly innerWidth: number
  readonly innerHeight: number
  readonly barCount?: number
  readonly fill?: string
  readonly fillOpacity?: number
  readonly baseline?: 'bottom' | 'center'
  readonly barFraction?: number
  readonly durationSeconds?: number
}
