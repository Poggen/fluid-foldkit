import type { TimeSeriesProps } from '../cartesian/root-options'

export type ScatterChartPhase = 'loading' | 'revealing' | 'ready'

export interface ScatterChartProps<Row> extends Omit<
  TimeSeriesProps<Row>,
  | 'x'
  | 'status'
  | 'loadingLabel'
  | 'onPhaseChange'
  | 'yDomainTween'
  | 'yDomain'
  | 'yDomainTweenDuration'
  | 'tweenYDomainOnXDomainChange'
  | 'enterTransition'
  | 'xDomain'
  | 'xDomainSlotCount'
> {
  readonly onPhaseChange?: (phase: ScatterChartPhase) => void
  readonly enterTransition?: { readonly duration?: number; readonly ease?: unknown }
}
