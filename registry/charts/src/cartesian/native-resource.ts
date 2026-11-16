import type { ChartTooltipExtension } from '@tanstack/charts/tooltip'
import type { ChartViewport } from './viewport'
import type { ChartRendererHost, DomChartDefinition, ChartValue } from '@tanstack/charts'
import type { CartesianSnapshot } from './definition'
import type { SweepObservation } from './observations'
import type { Interaction } from './state'
import type { TimeSeriesProps } from './root-options'

export interface NativeObservation {
  readonly sweep: (event: SweepObservation) => void
  readonly drag: (kind: 'start' | 'move' | 'end', x: number, index: number) => void
  readonly domains: (
    current: Interaction['domains'],
    target: Interaction['domains'],
    viewport?: ChartViewport,
  ) => void
  readonly timing: (generation: number, elapsed: number | null, at: number) => void
  readonly deadline: (generation: number) => void
  readonly revealed: (generation: number) => void
  readonly candidates: (indices: ReadonlyArray<number>) => void
}

export interface CartesianResource<
  Row,
  SceneDatum = Row,
  XValue extends ChartValue = Date,
  YValue extends ChartValue = number,
  Snapshot = CartesianSnapshot<Row>,
  ResourceOptions = TimeSeriesProps<Row>,
> {
  readonly definition?: (
    data: ReadonlyArray<Row>,
    state: Interaction,
    draw: (snapshot: Snapshot) => void,
    clock: () => number,
    tooltipExtension?: ChartTooltipExtension,
  ) => DomChartDefinition<SceneDatum, XValue, YValue>
  /** True when current font-dependent geometry changed or cannot be proven complete. */
  readonly fontMetricsChanged?: (() => boolean) | undefined
  readonly prepare?: (state: Interaction, data: ReadonlyArray<Row>) => void
  readonly configure?: (props: ResourceOptions) => void
  readonly update: (
    state: Interaction,
    data: ReadonlyArray<Row>,
    focusedIndex: number | null,
  ) => void
  readonly draw: (snapshot: Snapshot) => void
  readonly attach: (
    host: ChartRendererHost<SceneDatum, XValue, YValue>,
    redraw?: () => void,
  ) => void
  readonly destroy: () => void
}

export interface CartesianResourceInputs<
  Row,
  SceneDatum = Row,
  XValue extends ChartValue = Date,
  YValue extends ChartValue = number,
  Snapshot = CartesianSnapshot<Row>,
  ResourceOptions = TimeSeriesProps<Row>,
> {
  readonly create: (
    element: HTMLElement,
    observe: NativeObservation,
    clock: () => number,
  ) => CartesianResource<Row, SceneDatum, XValue, YValue, Snapshot, ResourceOptions>
  readonly definition: (
    data: ReadonlyArray<Row>,
    state: Interaction,
    draw: (snapshot: Snapshot) => void,
    clock: () => number,
    tooltipExtension?: ChartTooltipExtension,
  ) => DomChartDefinition<SceneDatum, XValue, YValue>
}

export function nativeObservations(element: HTMLElement): NativeObservation {
  return {
    sweep: (event) => {
      element.dispatchEvent(new CustomEvent('sweep-observed', { detail: event }))
    },
    drag: (kind, x, index) => {
      element.dispatchEvent(new CustomEvent('drag-observed', { detail: { kind, x, index } }))
    },
    domains: (current, target, viewport) => {
      element.dispatchEvent(
        new CustomEvent('domains-observed', {
          detail: viewport === undefined ? { current, target } : { current, target, viewport },
        }),
      )
    },
    timing: (generation, elapsed, at) => {
      element.dispatchEvent(
        new CustomEvent('phase-timing', { detail: { generation, elapsed, at } }),
      )
    },
    deadline: (generation) => {
      element.dispatchEvent(new CustomEvent('phase-deadline', { detail: { generation } }))
    },
    revealed: (generation) => {
      element.dispatchEvent(new CustomEvent('reveal-completed', { detail: { generation } }))
    },
    candidates: (indices) => {
      element.dispatchEvent(new CustomEvent('candidates-observed', { detail: { indices } }))
    },
  }
}
