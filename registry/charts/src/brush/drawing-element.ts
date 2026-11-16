import { constant } from 'effect/Function'
import type { ChartRendererHost, ChartRendererHostOptions } from '@tanstack/charts'
import { mountChartRenderer } from '@tanstack/charts/renderer'
import type { DrawingElementBase } from '../cartesian/lifecycle'
import { CartesianMotionRenderer } from '../cartesian/motion-renderer'
import { nativeObservations } from '../cartesian/native-resource'
import { drawingStateChanged } from '../cartesian/state'
import type { BrushPlot } from './options'
import { BrushResource } from './resource'
import type { BrushInteraction } from './state'

interface BrushPresentation<Row> {
  readonly id: string
  readonly data: ReadonlyArray<Row>
  readonly inputs: BrushPlot<Row>
  readonly state: BrushInteraction
}

interface BrushDrawingElement<Row> extends HTMLElement {
  readonly presentation: BrushPresentation<Row> | undefined
  readonly acquire: (clock: () => number) => () => void
}

type BrushDrawingElementConstructor<Row> = new () => BrushDrawingElement<Row>

/** The strip owns brushX controls, rather than the main chart's hover/keyboard listeners. */
export function defineBrushDrawingElement<Row extends Readonly<Record<string, unknown>>>(
  Base: typeof DrawingElementBase,
): BrushDrawingElementConstructor<Row> | undefined {
  return Base === undefined
    ? undefined
    : class extends Base {
        #clock: () => number = constant(0)
        readonly #renderer = new CartesianMotionRenderer<Row>()
        #resource: BrushResource<Row> | undefined
        #presentation: BrushPresentation<Row> | undefined
        #drawing: BrushPresentation<Row> | undefined
        #host: ChartRendererHost<Row, Date, number> | undefined
        #container: HTMLDivElement | undefined
        #containerObserver: ((element: HTMLDivElement | null) => undefined) | undefined

        set presentation(value: BrushPresentation<Row> | undefined) {
          this.#presentation = value
          this.#apply()
        }

        get presentation(): BrushPresentation<Row> | undefined {
          return this.#presentation
        }

        #notifyContainer() {
          const observe = this.#presentation?.inputs.observeContainer

          if (this.#containerObserver !== observe) {
            this.#containerObserver?.(null)
          }

          this.#containerObserver = observe
          const root = this.closest('[data-bkm-native-chart]')
          const Div = this.ownerDocument.defaultView?.HTMLDivElement
          observe?.(Div !== undefined && root instanceof Div ? root : null)
        }

        #options(current: BrushPresentation<Row>): ChartRendererHostOptions<Row, Date, number> {
          const { inputs, state, data } = current

          const definition =
            inputs.resourceDefinition === undefined
              ? inputs.definition(data)
              : inputs.resourceDefinition(
                  data,
                  state,
                  (snapshot) => this.#resource?.draw(snapshot),
                  this.#clock,
                )

          const controls = this.#resource?.controls(state, data) ?? []

          let options: ChartRendererHostOptions<Row, Date, number> = {
            definition: {
              ...definition,
              controls: [...(definition.controls ?? []), ...controls],
              pointer: false,
              keyboard: false,
            },
            renderer: this.#renderer.get(inputs.motion, state.configuration.animationDuration),
            ariaLabel:
              state.configuration.status === 'loading' ? 'Loading chart' : inputs.ariaLabel,
            idPrefix: current.id,
          }

          if (inputs.ariaDescription !== undefined) {
            options = { ...options, ariaDescription: inputs.ariaDescription }
          }

          if (inputs.width !== undefined) {
            options = { ...options, width: inputs.width }
          }

          if (inputs.height !== undefined) {
            options = { ...options, height: inputs.height }
          } else if (inputs.fillHeight !== true) {
            options = { ...options, aspectRatio: inputs.aspectRatio ?? 2 }
          }

          return options
        }

        #apply() {
          const current = this.#presentation
          const host = this.#host
          const resource = this.#resource

          if (current === undefined || host === undefined || resource === undefined) {
            return
          }

          this.#notifyContainer()
          resource.configure(current.inputs.plot)
          resource.configureBrush(current.inputs.brush)
          resource.prepare(current.state, current.data)

          if (this.#container !== undefined) {
            this.#container.classList.toggle('h-full', current.inputs.fillHeight === true)
          }

          const previous = this.#drawing

          if (
            previous !== undefined &&
            this.#container !== undefined &&
            previous.state.configuration.revealSignature !==
              current.state.configuration.revealSignature
          ) {
            host.destroy()
            this.#host = mountChartRenderer(this.#container, this.#options(current))
            this.#drawing = current
          } else if (
            previous === undefined ||
            previous.data !== current.data ||
            previous.inputs !== current.inputs ||
            drawingStateChanged(previous.state, current.state) ||
            previous.state.control.accepted !== current.state.control.accepted ||
            previous.state.control.seed !== current.state.control.seed ||
            (current.inputs.rebuildOnClock === true &&
              previous.state.phaseClockReady !== current.state.phaseClockReady)
          ) {
            // Preview changes only live geometry. Reinstalling controlled brushX here would cancel its drag.
            host.update(this.#options(current))
            this.#drawing = current
          }

          resource.update(current.state, current.data, null)
        }

        override acquire(clock: () => number) {
          this.#clock = clock
          const current = this.#presentation

          if (current === undefined) {
            throw new TypeError('Brush Mount requires a checked presentation')
          }

          const container = document.createElement('div')
          container.className = 'ts-chart-host'
          this.#container = container

          if (current.inputs.fillHeight === true) {
            container.classList.add('h-full')
          }

          this.append(container)
          this.#notifyContainer()
          this.#resource = new BrushResource(
            this,
            nativeObservations(this),
            current.inputs.plot,
            current.id,
            clock,
            () => this.#presentation?.state,
            current.inputs.brush,
          )
          this.#resource.prepare(current.state, current.data)
          this.#host = mountChartRenderer(container, this.#options(current))
          this.#drawing = current
          this.#apply()

          return () => {
            this.#containerObserver?.(null)
            this.#containerObserver = undefined
            // Revoke raw observations before brushX releases document listeners and pending work.
            this.#resource?.destroy()
            this.#resource = undefined
            this.#host?.destroy()
            this.#host = undefined
            this.#drawing = undefined
            this.#container = undefined
            container.remove()
          }
        }
      }
}
