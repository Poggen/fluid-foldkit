import { createSvgChartRenderer } from '@tanstack/charts/svg/renderer'
import type { PolarHost } from '../pie/private/block'
import { mountPolar } from '../pie/private/host'
import type { PolarFrame, ConfigurablePolarHost } from '../pie/private/host'
import { ringGeometry } from './geometry'
import { buildRingDefinition } from './definition'
import { createRingLayer } from './layer'
import type { RingChartProps, RingData } from './options'
import type { RingArcRow } from './arc'

const ringRenderer = createSvgChartRenderer<RingArcRow, number, number>()

export class RingHost implements PolarHost<RingData> {
  readonly #host: ConfigurablePolarHost<RingData, RingArcRow>
  readonly #layer = createRingLayer(true)
  readonly #clock: () => number
  readonly #start: { current: number | null }
  readonly #claim: Parameters<typeof buildRingDefinition>[2]['claim'] = { current: null }
  readonly #containerRef: { current: HTMLDivElement | null }
  readonly #id: string
  #props: RingChartProps
  #focused: number | null = null
  constructor(
    element: HTMLElement,
    props: RingChartProps,
    id: string,
    data: ReadonlyArray<RingData>,
    focused: number | null,
    observe: (index: number | null) => void,
    clock: () => number,
    observeSize: (size: number) => void,
    containerRef: { current: HTMLDivElement | null },
  ) {
    this.#containerRef = containerRef
    this.#props = props
    this.#clock = clock
    this.#start = { current: clock() }
    this.#id = id
    this.#focused = focused
    this.#host = mountPolar(element, data, focused, observe, clock, this.#frame(), observeSize)
  }
  #frame(): PolarFrame<RingData, RingArcRow> {
    const props = this.#props

    let frame: PolarFrame<RingData, RingArcRow> = {
      family: 'ring',
      scrubbing: props.geometryScrubbing ?? false,
      indexOf: (r) => r.ringIndex,
      definition: (data, size) => {
        this.#layer.hover(this.#focused)
        this.#layer.configure({ ...props, data }, size)
        this.#layer.start()

        const definition = {
          renderer: ringRenderer,
          definition: buildRingDefinition({ ...props, data }, size, {
            layer: this.#layer,
            clock: this.#clock,
            renderStart: this.#start,
            claim: this.#claim,
            hovered: () => this.#focused,
            scaleOf: (index) => this.#layer.scale(index),
          }),
          ariaLabel: props.ariaLabel ?? 'Ring chart',
          idPrefix: this.#id,
        }

        return props.ariaDescription === undefined
          ? definition
          : { ...definition, ariaDescription: props.ariaDescription }
      },
      geometry: (root) => {
        if (root instanceof HTMLDivElement) {
          this.#containerRef.current = root
        }
      },
      hover: (_root, _previous, next) => {
        this.#layer.hover(next)
      },
      centers: (data, size, index) =>
        props.children.flatMap((child) => {
          if (child.kind !== 'center') {
            return []
          }

          const datum = index === null ? undefined : data[index]
          const g = ringGeometry({ ...props, data }, size)

          return [
            {
              options: child.props,
              radius: g.baseInnerRadius,
              value: datum?.value ?? g.totalValue,
              label: datum?.label ?? child.props.defaultLabel ?? 'Total',
              custom: datum !== undefined && child.props.children !== undefined,
            },
          ]
        }),
      cleanup: () => {
        this.#containerRef.current = null
        this.#layer.destroy()
      },
    }

    if (props.size !== undefined) {
      frame = { ...frame, size: props.size }
    }

    if (props.className !== undefined) {
      frame = { ...frame, className: props.className }
    }

    if (props.style !== undefined) {
      frame = { ...frame, style: props.style }
    }

    if (props.onHoverChange !== undefined) {
      frame = { ...frame, onHoverChange: props.onHoverChange }
    }

    return frame
  }

  configure(props: RingChartProps) {
    if (props === this.#props) {
      return
    }

    this.#props = props
    this.#host.configure(this.#frame())
  }
  update(data: ReadonlyArray<RingData>, focused: number | null) {
    this.#focused = focused
    this.#host.update(data, focused)
  }
  destroy() {
    this.#host.destroy()
  }
}
