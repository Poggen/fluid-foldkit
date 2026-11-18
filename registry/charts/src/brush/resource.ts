import { Option, Schema } from 'effect'
import { constVoid } from 'effect/Function'
import { scaleLinear } from 'd3-scale'
import type { ChartControl } from '@tanstack/charts'
import { brushX } from '@tanstack/charts/interaction/brush'
import type { CartesianResource, NativeObservation } from '../cartesian/native-resource'
import type { Interaction } from '../cartesian/state'
import type { CartesianSnapshot } from '../cartesian/definition'
import { mountTimeSeriesResource } from '../cartesian/time-series-resource'
import type { TimeSeriesProps } from '../cartesian/root-options'
import type { ChartBrushProps } from './options'
import type { BrushInteraction, BrushObservation, Range } from './state'
import { acceptedRange, shownRange, stripExtent } from './state'

export const brushControl: (
  range: Range,
  props: Readonly<ChartBrushProps>,
  observe: (range: Range, kind: BrushObservation['kind']) => void,
) => ChartControl<Date, number> = function brushControl(
  range: Range,
  props: Readonly<ChartBrushProps>,
  observe: (range: Range, kind: BrushObservation['kind']) => void,
) {
  const control = brushX<number>({
    range: {
      value: range,
      onChange: (value, context) => {
        observe(value, context.reason.type)
      },
    },
    keyboard: false,
    handleSize: 8,
    handleStyle: { fill: 'transparent', fillOpacity: 0 },
    selectionStyle: {
      fill: props.selectionPattern?.color ?? 'var(--chart-1)',
      fillOpacity: 0.12,
      stroke: 'var(--chart-brush-border)',
    },
  })

  return {
    id: control.id,
    resolve: (context) => {
      const { x } = context.scales
      const start = Number(x?.domain[0])
      const end = Number(x?.domain.at(-1))

      if (x === undefined || !Number.isFinite(start) || !Number.isFinite(end)) {
        throw new TypeError('Brush requires a finite time domain')
      }

      const scale = scaleLinear()
        .domain([start, end])
        .range([context.chart.x, context.chart.x + context.chart.width])

      return control.resolve({
        ...context,
        scales: {
          ...context.scales,
          x: {
            id: x.id,
            type: 'linear',
            domain: [start, end],
            map: (value) => {
              if (!Schema.is(Schema.Finite)(value)) {
                throw new TypeError('Brush local values must be numeric milliseconds')
              }

              return scale(value)
            },
            invert: (position) => scale.invert(position),
            ticks: [],
            bandwidth: 0,
          },
        },
      })
    },
  }
}

export const brushObservationEvent = 'bkm-brush-observed'

export class BrushResource<
  Row extends Readonly<Record<string, unknown>>,
> implements CartesianResource<Row, Row, Date, number, CartesianSnapshot<Row>> {
  readonly base: CartesianResource<Row>
  readonly element: HTMLElement
  readonly current: () => BrushInteraction | undefined
  #active = true
  #controlGeneration = 0
  #props: ChartBrushProps
  #plot: TimeSeriesProps<Row>
  #data: ReadonlyArray<Row> = []
  #snapshot: CartesianSnapshot<Row> | undefined

  constructor(
    element: HTMLElement,
    observe: NativeObservation,
    plot: TimeSeriesProps<Row>,
    id: string,
    clock: () => number,
    current: () => BrushInteraction | undefined,
    props: ChartBrushProps,
  ) {
    this.element = element
    this.current = current
    this.#props = props
    this.#plot = plot
    this.base = mountTimeSeriesResource<Row>(
      { drawingHost: element, visualRoot: undefined },
      observe,
      plot,
      id,
      clock,
      {
        modelViewport: 'Always',
      },
    )
    element.addEventListener('mousedown', this.#previewPress, true)
    element.addEventListener('touchstart', this.#previewPress, true)
  }

  readonly #previewPress = (event: Event) => {
    const realm = this.element.ownerDocument.defaultView
    const Element = realm?.Element
    const Mouse = realm?.MouseEvent

    if (
      Element === undefined ||
      !(event.target instanceof Element) ||
      event.target.closest('[data-chart-brush-handle], [data-chart-brush-selection]') === null ||
      (Mouse !== undefined && event instanceof Mouse && (event.button !== 0 || event.ctrlKey))
    ) {
      return
    }

    const state = this.current()

    if (!this.#active || state === undefined) {
      return
    }

    const range = acceptedRange(
      state.control,
      Option.some(stripExtent(this.#data, this.#plot.xDataKey ?? 'date')),
    )

    if (Option.isSome(range)) {
      this.observe(range.value, 'preview')
    }
  }

  configure = (props: TimeSeriesProps<Row>) => {
    this.#plot = props
    this.base.configure?.(props)
  }
  configureBrush = (props: ChartBrushProps) => {
    this.#props = props
  }
  prepare = (state: Interaction, data: ReadonlyArray<Row>) => {
    this.#data = data
    this.base.prepare?.(state, data)
  }
  readonly attach = constVoid
  controls = (state: BrushInteraction, data: ReadonlyArray<Row>) => {
    const extent = Option.some(stripExtent(data, this.#plot.xDataKey ?? 'date'))
    const range = acceptedRange(state.control, extent)
    this.#controlGeneration += 1

    const generation = this.#controlGeneration

    return Option.isNone(range)
      ? []
      : [
          brushControl(range.value, this.#props, (value, kind) => {
            if (generation === this.#controlGeneration) {
              this.observe(value, kind)
            }
          }),
        ]
  }

  draw = (snapshot: CartesianSnapshot<Row>) => {
    this.#snapshot = snapshot
    this.base.draw(snapshot)
    this.#paint(this.current())
  }

  update = (state: Interaction, data: ReadonlyArray<Row>, focusedIndex: number | null) => {
    this.base.update(state, data, focusedIndex)
    this.#paint(this.current())
  }

  #paint(state: BrushInteraction | undefined) {
    const plot = this.#snapshot

    if (plot === undefined || state === undefined) {
      return
    }

    const [start, end] = plot.domains.x
    const extent = Option.some(stripExtent(this.#data, this.#plot.xDataKey ?? 'date'))
    const shown = shownRange(state.control, extent)
    const live = Option.orElse(state.control.live, () => acceptedRange(state.control, extent))
    this.element.toggleAttribute(
      'data-bkm-brushreset',
      Option.isSome(live) && live.value.end - live.value.start <= 0,
    )
    const span = end.getTime() - start.getTime()

    if (span <= 0 || Option.isNone(shown)) {
      return
    }

    const values = {
      ml: plot.margin.left,
      mt: plot.margin.top,
      w: plot.innerWidth,
      h: plot.innerHeight,
      x0: Math.max(
        0,
        Math.min(
          plot.innerWidth,
          ((shown.value.start - start.getTime()) / span) * plot.innerWidth - 2,
        ),
      ),
      x1: Math.max(
        0,
        Math.min(
          plot.innerWidth,
          ((shown.value.end - start.getTime()) / span) * plot.innerWidth + 2,
        ),
      ),
      blur: Math.min(5, Math.max(0, this.#props.blurPx ?? 1.5)),
    }

    for (const [key, value] of Object.entries(values)) {
      this.element.style.setProperty(`--bkm-brush-${key}`, `${value}px`)
    }
  }

  observe = (range: Range, kind: BrushObservation['kind']) => {
    const state = this.current()

    if (!this.#active || state === undefined) {
      return
    }

    const plot = this.#snapshot

    const event: BrushObservation = {
      kind,
      range,
      spanMs: plot === undefined ? 0 : plot.domains.x[1].getTime() - plot.domains.x[0].getTime(),
      innerWidth: plot?.innerWidth ?? 0,
    }

    this.element.dispatchEvent(new CustomEvent(brushObservationEvent, { detail: event }))
  }

  destroy = () => {
    this.#active = false
    this.element.removeEventListener('mousedown', this.#previewPress, true)
    this.element.removeEventListener('touchstart', this.#previewPress, true)
    this.base.destroy()
  }
}
