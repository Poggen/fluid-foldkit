import { modifyFields } from 'foldkit/struct'
import { LiveLinePresentation } from './presentation'
import { LIVE_SURFACE_STYLE } from './theme'
import { chartStyleText } from '../cartesian/style'
import type { LiveTooltipValue } from './tooltip-view'
import type { LiveLineChartProps, LiveCursor } from './options'
import { PlannerRow, SourceRowsReference, plannerRows } from './input'
import { LiveConfiguration, LiveState, advanceLive } from './state'
import { ClockObservation, Cursor, Focus, Message, Tooltip } from './message'
import { ConfigurationSchema as Config, StateSchema as State } from './model-schema'
import { ResolveInput, LiveLineNamespace, Mount, Prepare } from './lifecycle'
import { DrawingElementBase } from './drawing-element-base'
import { LiveRegistration } from './registration'
import type { LiveClock } from './state'
import { Effect, Layer, Option, Predicate, Schema } from 'effect'
import { Block, CustomElement } from 'foldkit'
import type { Html } from 'foldkit/html'
import type { ChartStyle } from '../cartesian/content-types'
import { defineInMessageUnion } from 'foldkit/message'

export const LiveControl = Schema.Struct({
  controlled: Schema.Boolean,
  index: Schema.Option(Schema.Int),
})

export type LiveControl = Schema.Schema.Type<typeof LiveControl>

export interface LiveHost<Row> {
  readonly update: (
    data: ReadonlyArray<Row>,
    focus: number | null,
    state: LiveState,
    cursor: LiveCursor | null,
    needsClock: boolean,
  ) => void
  readonly destroy: () => void
}

export interface LiveInputs<Row> {
  readonly layout?: 'contents' | 'square'
  readonly size?: number
  readonly surfaceStyle?: ChartStyle
  readonly mount: (
    element: HTMLElement,
    data: ReadonlyArray<Row>,
    focus: number | null,
    observe: (cursor: LiveCursor | null) => void,
    clock: () => number,
    observeSize: (size: number) => void,
    state: LiveState,
    observeClock: (clock: LiveClock) => void,
    wallClock: () => number,
    observeTooltip: (tooltip: LiveTooltipValue | null) => void,
    cursor: LiveCursor | null,
    needsClock: boolean,
  ) => LiveHost<Row>
  readonly configure: (host: LiveHost<Row>) => void
  readonly customContent: (
    data: ReadonlyArray<Row>,
    focused: number | null,
    size: number,
    tooltip: LiveTooltipValue | null,
    state: LiveState,
  ) => Html
  readonly serverContent?: (data: ReadonlyArray<Row>) => Html
}

const initialControl = (): LiveControl => ({ controlled: false, index: Option.none() })

export function defineLiveLineRecipe(name: string) {
  const Row = PlannerRow

  if (!/^[a-z][a-z0-9-]*$/u.test(name)) {
    throw new TypeError('LiveLine Block requires a unique lowercase element namespace')
  }

  type Row = typeof Row.Type

  const PresentationSchema = Schema.declare<LiveLinePresentation<Row>>(
    (v): v is LiveLinePresentation<Row> => v instanceof LiveLinePresentation,
  )

  const ElementSpec = CustomElement.define({
    tag: `fk-liveline-${name}`,
    properties: { presentation: PresentationSchema },
    events: {
      'focus-observed': Focus,
      'size-observed': Schema.Struct({ size: Schema.Finite }),
      'clock-observed': ClockObservation,
      'tooltip-observed': Schema.Struct({ tooltip: Tooltip }),
    },
  })

  const Model = Schema.Struct({
    id: Schema.String,
    data: Schema.Array(Row),
    focusedIndex: Schema.Option(Schema.Int),
    control: LiveControl,
    isMounted: Schema.Boolean,
    size: Schema.Finite,
    hostReady: Schema.Boolean,
    configuration: Config,
    state: State,
    revision: Schema.Int,
    requestedGeneration: Schema.Int,
    dataIdentity: Schema.Option(Schema.String),
    tooltip: Tooltip,
    cursor: Cursor,
  })

  const ConfigurationInput = Schema.declare<LiveConfiguration>(
    (value): value is LiveConfiguration => value instanceof LiveConfiguration,
  )

  const InMessage = defineInMessageUnion({
    RequestedData: { data: SourceRowsReference },
    RequestedFocus: { index: Schema.NullOr(Schema.Int) },
    RequestedControl: LiveControl.fields,
    RequestedConfiguration: { configuration: ConfigurationInput },
  })

  const effects = Block.makeEffectsContract()

  const contract = {
    Model,
    Message,
    InMessage,
    InitArgs: Schema.Tuple([
      Schema.String,
      SourceRowsReference,
      ConfigurationInput,
      Schema.optionalKey(LiveControl),
    ]),
    view: { kind: 'Element', Inputs: Block.makeInputContract<LiveInputs<Row>>() },
    effects,
  } satisfies Omit<Block.ContractConfiguration, 'key'> & {
    readonly Model: typeof Model
    readonly Message: typeof Message
  }

  const plans = <const Key extends symbol>(
    Definition: ReturnType<typeof Block.make<'LiveLine', Key, typeof contract>>,
  ) => {
    const Drawing =
      DrawingElementBase === undefined
        ? undefined
        : class extends DrawingElementBase {
            #presentation: LiveLinePresentation<Row> | undefined
            #host: LiveHost<Row> | undefined
            #inputs: LiveInputs<Row> | undefined
            set presentation(value: LiveLinePresentation<Row> | undefined) {
              this.#presentation = value

              if (this.#host !== undefined && value !== undefined) {
                if (this.#inputs !== value.inputs) {
                  this.#inputs = value.inputs
                  value.inputs.configure(this.#host)
                }

                this.#host.update(
                  value.data,
                  value.focused,
                  value.state,
                  value.cursor,
                  value.needsClock,
                )
              }
            }
            get presentation() {
              return this.#presentation
            }
            override acquire(clock: () => number, wallClock: () => number) {
              const p = this.#presentation

              if (p === undefined) {
                throw new TypeError('LiveLine Mount requires presentation')
              }

              this.classList.add('contents')
              this.#inputs = p.inputs
              this.#host = p.inputs.mount(
                this,
                p.data,
                p.focused,
                (cursor) => {
                  this.dispatchEvent(new CustomEvent('focus-observed', { detail: { cursor } }))
                },
                clock,
                (size) => {
                  this.dispatchEvent(new CustomEvent('size-observed', { detail: { size } }))
                },
                p.state,
                (detail) => {
                  this.dispatchEvent(new CustomEvent('clock-observed', { detail }))
                },
                wallClock,
                (tooltip) => {
                  this.dispatchEvent(new CustomEvent('tooltip-observed', { detail: { tooltip } }))
                },
                p.cursor,
                p.needsClock,
              )

              return () => {
                this.#host?.destroy()
                this.#host = undefined
                this.#inputs = undefined
              }
            }
          }

    const register = () => {
      if (Drawing === undefined || typeof customElements === 'undefined') {
        throw new TypeError('LiveLine requires a browser DOM')
      }

      const registered = customElements.get(ElementSpec.tag)

      if (registered === undefined) {
        customElements.define(ElementSpec.tag, Drawing)
      } else if (registered !== Drawing) {
        throw new TypeError('LiveLine name belongs to another definition')
      }
    }

    const Composition = Definition.makeComposition({ mounts: [Prepare, Mount] })

    return {
      init: Composition.makeInit(
        (
          id: string,
          data: LiveLineChartProps['data'],
          configuration: LiveConfiguration,
          control: LiveControl = initialControl(),
        ) => ({
          model: {
            id,
            data: plannerRows(data),
            control,
            focusedIndex: control.index,
            isMounted: false,
            size: 0,
            hostReady: false,
            configuration: { props: { ...configuration.props, data: plannerRows(data) } },
            requestedGeneration: 1,
            dataIdentity: Option.none<string>(),
            state: new LiveState(),
            revision: 0,
            tooltip: null,
            cursor: null,
          },
          commands: [ResolveInput({ id, generation: 1, data })],
        }),
      ),
      inMessageUpdate: Composition.makeInMessageUpdate({
        RequestedData: (m, { data }) => ({
          model: modifyFields(m, {
            requestedGeneration: (requestedGeneration) => requestedGeneration + 1,
          }),
          commands: [ResolveInput({ id: m.id, generation: m.requestedGeneration + 1, data })],
        }),
        RequestedConfiguration: (m, { configuration }) => ({
          model: modifyFields(m, {
            configuration: () => ({ props: configuration.props }),
            requestedGeneration: (requestedGeneration) => requestedGeneration + 1,
          }),
          commands: [
            ResolveInput({
              id: m.id,
              generation: m.requestedGeneration + 1,
              data: configuration.sourceData,
            }),
          ],
        }),
        RequestedFocus: (m, { index }) => ({
          model: modifyFields(m, { focusedIndex: () => Option.fromNullishOr(index) }),
        }),
        RequestedControl: (m, { controlled, index }) => ({
          model: modifyFields(m, {
            control: () => ({ controlled, index }),
            focusedIndex: () => (controlled ? index : m.focusedIndex),
          }),
        }),
      }),
      update: Composition.makeUpdate({
        CompletedInput: (m, { generation, identity, data }) => ({
          model:
            generation === m.requestedGeneration
              ? modifyFields(m, {
                  data: () => data,
                  dataIdentity: () => Option.some(identity),
                  configuration: (configuration) =>
                    modifyFields(configuration, {
                      props: (props) => modifyFields(props, { data: () => data }),
                    }),
                  revision: (revision) => revision + 1,
                })
              : m,
        }),
        ObservedTooltip: (m, { tooltip }) => ({
          model: modifyFields(m, { tooltip: () => tooltip }),
        }),
        ObservedClock: (m, clock) => {
          const state = Option.isNone(m.dataIdentity)
            ? m.state
            : advanceLive(
                m.state,
                m.configuration.props,
                m.revision,
                m.size,
                clock,
                m.dataIdentity.value,
              )

          return { model: state === m.state ? m : modifyFields(m, { state: () => state }) }
        },
        ObservedFocus: (m, { cursor }) => ({
          model: m.control.controlled
            ? m
            : modifyFields(m, {
                cursor: () => cursor,
                focusedIndex: () => Option.fromNullishOr(cursor?.index),
              }),
        }),
        ObservedSize: (m, { size }) => ({
          model:
            m.size === size && m.hostReady
              ? m
              : modifyFields(m, { size: () => size, hostReady: () => true }),
        }),
        CompletedPrepare: Definition.makeFieldsStep(() => ({ isMounted: () => true })),
        CompletedMount: (m) => ({ model: m }),
        Unmounted: (m) => ({
          model: modifyFields(m, {
            state: () => new LiveState(),
            size: () => 0,
            hostReady: () => false,
            isMounted: () => false,
            tooltip: () => null,
            cursor: () => null,
            focusedIndex: () => (m.control.controlled ? m.control.index : Option.none()),
          }),
        }),
      }),
      view: Composition.makeView.withInputs((m, inputs, h) => {
        const drawing = ElementSpec.withMessage(h)
        const fixed = inputs.size !== undefined && inputs.size !== 0

        return h.div(
          [
            h.DataAttribute('bkm-native-chart', m.id),
            h.DataAttribute('bkm-chart', 'liveline'),
            h.Class(
              [
                'ts-chart-surface relative [width:var(--bkm-live-size,100%)]',
                inputs.layout !== 'contents' && !fixed ? '[aspect-ratio:1_/_1]' : '',
              ]
                .filter(Boolean)
                .join(' '),
            ),
            h.Attribute(
              'style',
              chartStyleText(
                inputs.layout === 'contents'
                  ? {
                      ...LIVE_SURFACE_STYLE,
                      ...inputs.surfaceStyle,
                    }
                  : fixed
                    ? { '--bkm-live-size': `${inputs.size}px`, height: `${inputs.size}px` }
                    : {},
              ),
            ),
            h.OnMount(Prepare()),
            // The pinned server renderer has no nested occurrence for a physical unmount hook.
            ...(Predicate.isUndefined(globalThis.window) ? [] : [h.OnUnmount(Message.Unmounted())]),
          ],
          [
            m.isMounted
              ? drawing([
                  drawing.Presentation(
                    new LiveLinePresentation(
                      m.data,
                      Option.getOrNull(m.focusedIndex),
                      inputs,
                      m.state,
                      m.cursor,
                      Option.isSome(m.dataIdentity) &&
                        m.size > 0 &&
                        (m.state.clockActive ||
                          m.revision !== m.state.revision ||
                          m.size !== m.state.width),
                    ),
                  ),
                  drawing.OnFocusObserved(Message.ObservedFocus),
                  drawing.OnSizeObserved(Message.ObservedSize),
                  drawing.OnClockObserved(Message.ObservedClock),
                  drawing.OnTooltipObserved(Message.ObservedTooltip),
                  h.OnMount(Mount()),
                ])
              : (inputs.serverContent?.(m.data) ?? h.empty),
            m.isMounted
              ? inputs.customContent(
                  m.data,
                  Option.getOrNull(m.focusedIndex),
                  m.size,
                  m.tooltip,
                  m.state,
                )
              : h.empty,
          ],
        )
      }),
      EffectsLayer: Layer.mergeAll(Prepare.layer, Mount.layer, ResolveInput.layer).pipe(
        Layer.provide(
          Layer.effect(
            LiveRegistration,
            Effect.sync(() => {
              // Restored Models can render a mounted drawing before any Prepare Mount runs.
              register()
              return register
            }),
          ),
        ),
        Layer.fresh,
      ),
    }
  }

  return { namespace: LiveLineNamespace, contract, plans }
}
