import type { ChartTooltipExtension } from '@tanstack/charts/tooltip'
import type { DomChartDefinition } from '@tanstack/charts'
import { TimeSeriesDomainFrame } from './time-series-domain-frame'
import type { CartesianSnapshot } from './definition'
import type { Interaction } from './state'
import type { TimeSeriesProps } from './root-options'

export type TimeSeriesCompiler<Row, SceneDatum = Row> = (
  data: ReadonlyArray<Row>,
  state: Interaction,
  draw: (snapshot: CartesianSnapshot<Row>) => void,
  clock: () => number,
  domainFrame?: TimeSeriesDomainFrame<Row>,
  presentationProps?: TimeSeriesProps<Row>,
  tooltipExtension?: ChartTooltipExtension,
) => DomChartDefinition<SceneDatum, Date, number>

/** Physical domain frames redraw the same native host and report actual settling.
 * Checked phase generations reject completions invalidated by a later request.
 */
export function timeSeriesDomainResource<Row, SceneDatum>(options: {
  readonly clock: () => number
  readonly props: () => TimeSeriesProps<Row>
  readonly state: () => Interaction | undefined
  readonly completed: (generation: number) => void
  readonly compile: TimeSeriesCompiler<Row, SceneDatum>
}) {
  let animation = 0
  let redraw: (() => void) | undefined
  let completion: number | undefined
  let disposed = false

  const frame = new TimeSeriesDomainFrame(
    options.clock,
    options.props,
    options.state,
    () => matchMedia('(prefers-reduced-motion: reduce)').matches,
  )

  const complete = () => {
    const state = options.state()

    if (completion === undefined || frame.active || state?.generation !== completion) {
      return
    }

    const generation = completion
    completion = undefined
    queueMicrotask(() => {
      if (!disposed) {
        options.completed(generation)
      }
    })
  }

  return {
    definition: (
      data: ReadonlyArray<Row>,
      state: Interaction,
      draw: (snapshot: CartesianSnapshot<Row>) => void,
      clock: () => number,
      tooltipExtension?: ChartTooltipExtension,
    ) => options.compile(data, state, draw, clock, frame, options.props(), tooltipExtension),
    draw: () => {
      complete()

      if (frame.active && animation === 0) {
        animation = requestAnimationFrame(() => {
          animation = 0

          if (!disposed) {
            redraw?.()
          }
        })
      }
    },
    attach: (invalidate: (() => void) | undefined) => {
      redraw = invalidate
    },
    schedule: (state: Interaction) => {
      if (state.phase === 'swap') {
        const generation = state.generation
        queueMicrotask(() => {
          if (!disposed && options.state()?.generation === generation) {
            options.completed(generation)
          }
        })
        return true satisfies boolean
      }

      if (state.phase !== 'tween' && state.phase !== 'tweenLoading') {
        return false satisfies boolean
      }

      completion = state.generation
      complete()

      return true satisfies boolean
    },
    destroy: () => {
      disposed = true
      cancelAnimationFrame(animation)
    },
  }
}
