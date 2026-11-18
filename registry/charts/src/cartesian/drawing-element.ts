import { sameRendererOptions } from './renderer-options'
import { createChartFrame } from '../kit/chart-frame'
import { nativeTooltip } from './native-tooltip'
import { acquireTooltipAttachment } from './tooltip-attachment'
import type { TimeSeriesProps } from './root-options'
import { synchronizeLegendHover } from './legend-attributes'
import type {
  ChartPoint,
  ChartRendererHost,
  ChartRendererHostOptions,
  ChartValue,
} from '@tanstack/charts'
import { mountCartesianRenderer } from './font-renderer'
import type { DrawingElementBase } from './lifecycle'
import { CartesianMotionRenderer } from './motion-renderer'
import { nativeObservations } from './native-resource'
import type { CartesianResource } from './native-resource'
import type { CartesianViewInputs } from './block'
import { drawingStateChanged } from './state'
import type { Interaction } from './state'
import type { CartesianSnapshot } from './definition'

export const defineDrawingElement: <
  Row,
  SceneDatum = Row,
  XValue extends ChartValue = Date,
  YValue extends ChartValue = number,
  Snapshot = CartesianSnapshot<Row>,
  ResourceOptions = TimeSeriesProps<Row>,
>(
  Base: typeof DrawingElementBase,
  pointerScheduling?: 'direct' | 'host-frame',
) =>
  | DrawingElementConstructor<Row, SceneDatum, XValue, YValue, Snapshot, ResourceOptions>
  | undefined = function defineDrawingElement<
  Row,
  SceneDatum = Row,
  XValue extends ChartValue = Date,
  YValue extends ChartValue = number,
  Snapshot = CartesianSnapshot<Row>,
  ResourceOptions = TimeSeriesProps<Row>,
>(Base: typeof DrawingElementBase, pointerScheduling: 'direct' | 'host-frame' = 'direct') {
  return (
    Base === undefined
      ? undefined
      : class extends Base {
          #clock: () => number = clockBeforeAcquire
          readonly #renderer = new CartesianMotionRenderer<SceneDatum, XValue, YValue>()
          #resource:
            | CartesianResource<Row, SceneDatum, XValue, YValue, Snapshot, ResourceOptions>
            | undefined
          #resourceInputs:
            | CartesianViewInputs<Row, SceneDatum, XValue, YValue, Snapshot, ResourceOptions>
            | undefined
          #presentation:
            | DrawingPresentation<Row, SceneDatum, XValue, YValue, Snapshot, ResourceOptions>
            | undefined
          #host: ChartRendererHost<SceneDatum, XValue, YValue> | undefined
          #definition:
            | ChartRendererHostOptions<SceneDatum, XValue, YValue>['definition']
            | undefined
          #appliedOptions: ChartRendererHostOptions<SceneDatum, XValue, YValue> | undefined
          readonly #onRender = () => this.#tooltipAttachment?.attach()
          #container: HTMLDivElement | undefined
          #frame: ReturnType<typeof createChartFrame> | undefined
          #tooltipAttachment: ReturnType<typeof acquireTooltipAttachment> | undefined
          #tooltipExtension: ReturnType<typeof nativeTooltip> | undefined
          #containerObserver: ((element: HTMLDivElement | null) => undefined) | undefined
          #drawing:
            | DrawingPresentation<Row, SceneDatum, XValue, YValue, Snapshot, ResourceOptions>
            | undefined
          set presentation(
            value:
              | DrawingPresentation<Row, SceneDatum, XValue, YValue, Snapshot, ResourceOptions>
              | undefined,
          ) {
            this.#presentation = value
            this.#apply()
          }
          get presentation() {
            return this.#presentation satisfies
              | DrawingPresentation<Row, SceneDatum, XValue, YValue, Snapshot, ResourceOptions>
              | undefined
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
          #apply() {
            const current = this.#presentation

            if (current === undefined || this.#host === undefined) {
              return
            }

            this.#notifyContainer()

            this.#configureResource(current)

            this.#sizeFrame(current)

            synchronizeLegendHover(this, current.state)
            this.#resource?.prepare?.(current.state, current.data)

            if (
              this.#drawing !== undefined &&
              this.#container !== undefined &&
              this.#drawing.state.configuration.revealSignature !==
                current.state.configuration.revealSignature
            ) {
              this.#tooltipAttachment?.park()
              this.#host.destroy()
              const options = this.#options(current, true)
              this.#host = mountCartesianRenderer(this.#container, options, this.#fontResource)
              this.#appliedOptions = options
              this.#resource?.attach(this.#host, this.#redraw)
              this.#drawing = current
            }

            const compile =
              this.#drawing === undefined ||
              this.#drawing.data !== current.data ||
              this.#drawing.inputs.definitionRevision !== current.inputs.definitionRevision ||
              drawingStateChanged(this.#drawing.state, current.state) ||
              (current.inputs.rebuildOnClock === true &&
                this.#drawing.state.phaseClockReady !== current.state.phaseClockReady)
            const options = this.#options(current, compile)
            if (!sameRendererOptions(this.#appliedOptions, options)) {
              this.#host.update(options)
              this.#appliedOptions = options
            }
            this.#drawing = current

            this.#synchronizeFocus(current)

            this.#resource?.update(current.state, current.data, current.focusedIndex)
          }
          readonly #fontResource = () =>
            this.#presentation?.inputs.fontMetricsCoverage === 'complete'
              ? this.#resource
              : undefined
          readonly #redraw = () => {
            const current = this.#presentation

            if (current !== undefined) {
              const options = this.#options(current, true)
              this.#host?.update(options)
              this.#appliedOptions = options
            }
          }
          #configureResource(
            current: DrawingPresentation<
              Row,
              SceneDatum,
              XValue,
              YValue,
              Snapshot,
              ResourceOptions
            >,
          ) {
            const host = this.#host

            if (host === undefined) {
              return
            }

            if (this.#resourceInputs !== current.inputs) {
              this.#resourceInputs = current.inputs

              if (
                this.#resource === undefined ||
                current.inputs.configureResource?.(this.#resource) !== true
              ) {
                const previousResource = this.#resource
                previousResource?.destroy()
                this.#resource = current.inputs.createResource?.(
                  this,
                  nativeObservations(this),
                  this.#clock,
                )
                if (previousResource !== this.#resource) this.#definition = undefined
                this.#resource?.attach(host, this.#redraw)
              }
            }
          }
          #synchronizeFocus(
            current: DrawingPresentation<
              Row,
              SceneDatum,
              XValue,
              YValue,
              Snapshot,
              ResourceOptions
            >,
          ) {
            const host = this.#host

            if (host === undefined) {
              return
            }

            const point =
              current.focusedIndex === null
                ? null
                : (host
                    .getScene()
                    .points.find(
                      (candidate) =>
                        (current.inputs.pointIndexOf === undefined
                          ? current.inputs.sourceOf(candidate.datum) ===
                            current.data[current.focusedIndex ?? -1]
                          : current.inputs.pointIndexOf(candidate) === current.focusedIndex) &&
                        (current.focusedSeriesIndex === null ||
                          current.inputs.seriesIndexOf?.(candidate.datum) ===
                            current.focusedSeriesIndex),
                    ) ?? null)

            host.interaction.setControlledFocus(point, { source: 'programmatic' })
          }
          #pointerIndex(
            event: PointerEvent,
            point: ChartPoint<SceneDatum, XValue, YValue> | undefined,
          ) {
            const current = this.#presentation
            const host = this.#host

            if (current === undefined || host === undefined) {
              return null satisfies number | null
            }

            if (current.inputs.pointerIndexAt === undefined) {
              if (point === undefined) {
                return null satisfies number | null
              }

              return (
                current.inputs.pointIndexOf === undefined
                  ? current.data.indexOf(current.inputs.sourceOf(point.datum))
                  : (current.inputs.pointIndexOf(point) ?? null)
              ) satisfies number | null
            }

            const position = host.interaction.clientToScene(event.clientX, event.clientY)

            return (position === null ? null : current.inputs.pointerIndexAt(position)) satisfies
              | number
              | null
          }
          #sizeFrame(
            current: DrawingPresentation<
              Row,
              SceneDatum,
              XValue,
              YValue,
              Snapshot,
              ResourceOptions
            >,
          ) {
            const host = this.#frame?.host
            if (host === undefined) return
            const fillsFrame = current.inputs.familyRoot !== undefined
            host.classList.remove('w-full', 'h-full')
            host.classList.add(
              '[width:var(--bkm-frame-width)]',
              '[height:var(--bkm-frame-height)]',
              '[aspect-ratio:var(--bkm-frame-ratio)]',
            )
            host.style.setProperty(
              '--bkm-frame-width',
              fillsFrame || current.inputs.width === undefined
                ? '100%'
                : `${current.inputs.width}px`,
            )
            host.style.setProperty(
              '--bkm-frame-height',
              fillsFrame || current.inputs.fillHeight === true
                ? '100%'
                : current.inputs.height === undefined
                  ? 'auto'
                  : `${current.inputs.height}px`,
            )
            host.style.setProperty(
              '--bkm-frame-ratio',
              !fillsFrame &&
                current.inputs.height === undefined &&
                current.inputs.fillHeight !== true
                ? String(current.inputs.aspectRatio ?? 2)
                : 'auto',
            )
          }
          #options(
            current: DrawingPresentation<
              Row,
              SceneDatum,
              XValue,
              YValue,
              Snapshot,
              ResourceOptions
            >,
            recompile = false,
          ) {
            const compile = this.#resource?.definition ?? current.inputs.resourceDefinition

            if (this.#definition === undefined || recompile) {
              this.#definition = {
                ...(compile === undefined
                  ? current.inputs.definition(current.data, this.#tooltipExtension)
                  : compile(
                      current.data,
                      current.state,
                      (snapshot) => this.#resource?.draw(snapshot),
                      this.#clock,
                      this.#tooltipExtension,
                    )),
                pointer: false,
                keyboard: true,
              }
            }
            let options: ChartRendererHostOptions<SceneDatum, XValue, YValue> = {
              definition: this.#definition,
              renderer: this.#renderer.get(
                current.inputs.motion,
                current.state.configuration.animationDuration,
              ),
              ariaLabel:
                current.inputs.createResource !== undefined &&
                current.state.configuration.status === 'loading'
                  ? 'Loading chart'
                  : current.inputs.ariaLabel,
              idPrefix: current.id,
              onRender: this.#onRender,
            }

            if (current.inputs.ariaDescription !== undefined) {
              options = { ...options, ariaDescription: current.inputs.ariaDescription }
            }

            if (current.inputs.familyRoot !== undefined) return options

            if (current.inputs.width !== undefined) {
              options = { ...options, width: current.inputs.width }
            }

            if (current.inputs.height !== undefined) {
              options = { ...options, height: current.inputs.height }
            } else if (current.inputs.fillHeight !== true) {
              options = { ...options, aspectRatio: current.inputs.aspectRatio ?? 2 }
            }

            return options
          }
          override acquire(clock: () => number) {
            this.#clock = clock
            const current = this.#presentation
            if (current === undefined) {
              throw new TypeError('Cartesian Mount requires a checked presentation')
            }
            const frame = createChartFrame(this.ownerDocument)
            const container = frame.surface
            const pointer = (event: PointerEvent) => {
              if (pointerScheduling === 'host-frame' && event.buttons % 2 === 1) {
                return
              }

              if (
                this.#presentation?.inputs.createResource !== undefined &&
                !this.#presentation?.state.revealReady
              ) {
                return
              }

              const resolved = this.#host?.interaction.resolvePointer(event.clientX, event.clientY)

              const index = this.#pointerIndex(event, resolved?.point)

              const detail = {
                index: index === -1 ? null : index,
                seriesIndex:
                  resolved === null || resolved === undefined
                    ? null
                    : (this.#presentation?.inputs.seriesIndexOf?.(resolved.point.datum) ?? null),
              }

              this.dispatchEvent(new CustomEvent('focus-observed', { detail }))
            }

            const leave = () => {
              this.dispatchEvent(new CustomEvent('pointer-leave-observed', { detail: {} }))
            }

            const blur = (event: FocusEvent) => {
              if (event.relatedTarget instanceof Node && container.contains(event.relatedTarget)) {
                return
              }

              this.dispatchEvent(new CustomEvent('blur-observed', { detail: {} }))
            }

            const keyboard = (event: KeyboardEvent) => {
              const { key } = event

              if (
                key !== 'ArrowLeft' &&
                key !== 'ArrowRight' &&
                key !== 'ArrowUp' &&
                key !== 'ArrowDown' &&
                key !== 'Home' &&
                key !== 'End'
              ) {
                return
              }

              event.preventDefault()
              event.stopImmediatePropagation()
              this.dispatchEvent(new CustomEvent('key-observed', { detail: { key } }))
            }

            let released = false
            const release = () => {
              if (released) return
              released = true
              container.removeEventListener('pointermove', pointer, true)
              container.removeEventListener('pointerleave', leave)
              container.removeEventListener('keydown', keyboard, true)
              container.removeEventListener('focusout', blur)
              this.#tooltipAttachment?.release()
              this.#tooltipAttachment = undefined
              this.#tooltipExtension = undefined
              const resource = this.#resource
              const host = this.#host
              const observer = this.#containerObserver
              this.#resource = undefined
              this.#resourceInputs = undefined
              this.#host = undefined
              this.#definition = undefined
              this.#appliedOptions = undefined
              this.#drawing = undefined
              this.#containerObserver = undefined
              this.#frame = undefined
              this.#container = undefined
              try {
                resource?.destroy()
              } finally {
                try {
                  host?.destroy()
                } finally {
                  frame.host.remove()
                  observer?.(null)
                }
              }
            }

            try {
              this.#frame = frame
              this.#container = container
              this.#sizeFrame(current)
              this.append(frame.host)
              const descriptor = current.inputs.tooltip
              if (descriptor !== undefined) {
                const tooltip = this.closest('[data-bkm-native-chart]')?.querySelector<HTMLElement>(
                  `#${CSS.escape(descriptor.id)}`,
                )
                if (tooltip === undefined || tooltip === null) {
                  throw new TypeError('Cartesian Mount requires its committed tooltip shell')
                }
                this.#tooltipAttachment = acquireTooltipAttachment(container, tooltip)
                this.#tooltipExtension = nativeTooltip(
                  tooltip,
                  () => this.#presentation?.inputs.tooltip?.horizontalBars === true,
                  this.#tooltipAttachment.park,
                )
              }
              this.#notifyContainer()
              this.#resourceInputs = current.inputs
              this.#resource = current.inputs.createResource?.(
                this,
                nativeObservations(this),
                clock,
              )
              const options = this.#options(current)
              this.#host = mountCartesianRenderer(container, options, this.#fontResource)
              this.#appliedOptions = options
              this.#resource?.attach(this.#host, this.#redraw)
              this.#drawing = current
              container.addEventListener('pointermove', pointer, true)
              container.addEventListener('pointerleave', leave)
              container.addEventListener('keydown', keyboard, true)
              container.addEventListener('focusout', blur)
              this.#apply()
              return release
            } catch (error) {
              try {
                release()
              } catch {}
              throw error
            }
          }
        }
  ) satisfies
    | DrawingElementConstructor<Row, SceneDatum, XValue, YValue, Snapshot, ResourceOptions>
    | undefined
}

interface DrawingPresentation<
  Row,
  SceneDatum = Row,
  XValue extends ChartValue = Date,
  YValue extends ChartValue = number,
  Snapshot = CartesianSnapshot<Row>,
  ResourceOptions = TimeSeriesProps<Row>,
> {
  readonly id: string
  readonly data: ReadonlyArray<Row>
  readonly focusedIndex: number | null
  readonly focusedSeriesIndex: number | null
  readonly inputs: CartesianViewInputs<Row, SceneDatum, XValue, YValue, Snapshot, ResourceOptions>
  readonly state: Interaction
}

interface DrawingElement<
  Row,
  SceneDatum = Row,
  XValue extends ChartValue = Date,
  YValue extends ChartValue = number,
  Snapshot = CartesianSnapshot<Row>,
  ResourceOptions = TimeSeriesProps<Row>,
> extends HTMLElement {
  readonly presentation:
    | DrawingPresentation<Row, SceneDatum, XValue, YValue, Snapshot, ResourceOptions>
    | undefined
  readonly acquire: (clock: () => number) => () => void
}

type DrawingElementConstructor<
  Row,
  SceneDatum = Row,
  XValue extends ChartValue = Date,
  YValue extends ChartValue = number,
  Snapshot = CartesianSnapshot<Row>,
  ResourceOptions = TimeSeriesProps<Row>,
> = new () => DrawingElement<Row, SceneDatum, XValue, YValue, Snapshot, ResourceOptions>

const clockBeforeAcquire = () => 0
