import { modifyFields } from 'foldkit/struct'
import { DrawingElementBase } from './drawing-element-base'
import { HeatmapRegistration } from './registration'
import { HeatmapPresentation } from './presentation'
import { HeatmapColumnSchema } from './options'

import { Effect, Layer, Option, Schema } from 'effect'
import { Block, CustomElement } from 'foldkit'
import type { Html } from 'foldkit/html'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import { HeatmapNamespace, Mount, Prepare } from './lifecycle'

const Row = Schema.toCodecJson(HeatmapColumnSchema)

export const HeatmapControl = Schema.Struct({
  controlled: Schema.Boolean,
  index: Schema.Option(Schema.Int),
})

export type HeatmapControl = Schema.Schema.Type<typeof HeatmapControl>

export interface HeatmapHostContract<Row> {
  readonly update: (
    data: ReadonlyArray<Row>,
    focused: number | null,
    level: number | null,
    entered: boolean,
  ) => void
  readonly destroy: () => void
}

export interface HeatmapInputs<Row> {
  readonly layout?: 'contents' | 'square'
  readonly size?: number
  readonly className?: string
  readonly style?: Readonly<Record<string, string | number>>
  readonly mount: (
    element: HTMLElement,
    data: ReadonlyArray<Row>,
    focused: number | null,
    level: number | null,
    observe: (index: number | null) => void,
    clock: () => number,
    observeSize: (size: number) => void,
    currentDate: Readonly<Date>,
    entered: boolean,
    observeEntered: () => void,
    observeReplay: () => void,
  ) => HeatmapHostContract<Row>
  readonly configure: (host: HeatmapHostContract<Row>) => void
  readonly serverContent?: (data: ReadonlyArray<Row>) => Html
  readonly customContent: (data: ReadonlyArray<Row>, focused: number | null, size: number) => Html
}

const initialControl: () => HeatmapControl = () => ({ controlled: false, index: Option.none() })

export function defineHeatmapRecipe(name: string) {
  if (!/^[a-z][a-z0-9-]*$/u.test(name)) {
    throw new TypeError('Heatmap Block requires a unique lowercase element namespace')
  }

  type Row = typeof Row.Type

  const PresentationSchema = Schema.declare<HeatmapPresentation<Row>>(
    (v): v is HeatmapPresentation<Row> => v instanceof HeatmapPresentation,
  )

  const Focus = Schema.Struct({ index: Schema.NullOr(Schema.Int) })

  const ElementSpec = CustomElement.define({
    tag: `fk-heatmap-${name}`,
    properties: { presentation: PresentationSchema },
    events: {
      'entered-observed': Schema.Struct({}),
      'replay-observed': Schema.Struct({}),
      'focus-observed': Focus,
      'size-observed': Schema.Struct({ size: Schema.Finite }),
    },
  })

  const Model = Schema.Struct({
    id: Schema.String,
    data: Schema.Array(Row),
    focusedIndex: Schema.Option(Schema.Int),
    hoveredLegendLevel: Schema.Option(Schema.Int),
    control: HeatmapControl,
    isMounted: Schema.Boolean,
    size: Schema.Finite,
    hostReady: Schema.Boolean,
    cellsEntered: Schema.Boolean,
  })

  const InMessage = defineInMessageUnion({
    RequestedData: { data: Schema.Array(Row) },
    RequestedFocus: Focus.fields,
    RequestedLegendLevel: { level: Schema.NullOr(Schema.Int) },
    RequestedControl: HeatmapControl.fields,
  })

  const Message = defineMessageUnion({
    ObservedFocus: Focus.fields,
    ObservedSize: { size: Schema.Finite },
    ObservedEntered: {},
    ObservedReplay: {},
    CompletedPrepare: {},
    CompletedMount: {},
  })

  const effects = Block.makeEffectsContract()

  const contract = {
    Model,
    Message,
    InMessage,
    InitArgs: Schema.Tuple([Schema.String, Schema.Array(Row), Schema.optionalKey(HeatmapControl)]),
    view: { kind: 'Element', Inputs: Block.makeInputContract<HeatmapInputs<Row>>() },
    effects,
  } satisfies Omit<Block.ContractConfiguration, 'key'> & {
    readonly Model: typeof Model
    readonly Message: typeof Message
  }

  const plans = <const Key extends symbol>(
    Definition: ReturnType<typeof Block.make<'Heatmap', Key, typeof contract>>,
  ) => {
    const Drawing =
      DrawingElementBase === undefined
        ? undefined
        : class extends DrawingElementBase {
            #presentation: HeatmapPresentation<Row> | undefined
            #host: HeatmapHostContract<Row> | undefined
            #inputs: HeatmapInputs<Row> | undefined
            set presentation(value: HeatmapPresentation<Row> | undefined) {
              this.#presentation = value

              if (this.#host !== undefined && value !== undefined) {
                if (this.#inputs !== value.inputs) {
                  this.#inputs = value.inputs
                  value.inputs.configure(this.#host)
                }

                this.#host.update(value.data, value.focused, value.level, value.entered)
              }
            }
            get presentation() {
              return this.#presentation
            }
            override acquire(clock: () => number, currentDate: Readonly<Date>) {
              const p = this.#presentation

              if (p === undefined) {
                throw new TypeError('Heatmap Mount requires presentation')
              }

              this.classList.add('contents')
              this.#inputs = p.inputs
              this.#host = p.inputs.mount(
                this,
                p.data,
                p.focused,
                p.level,
                (index) => {
                  this.dispatchEvent(new CustomEvent('focus-observed', { detail: { index } }))
                },
                clock,
                (size) => {
                  this.dispatchEvent(new CustomEvent('size-observed', { detail: { size } }))
                },
                currentDate,
                p.entered,
                () => {
                  this.dispatchEvent(new CustomEvent('entered-observed', { detail: {} }))
                },
                () => {
                  this.dispatchEvent(new CustomEvent('replay-observed', { detail: {} }))
                },
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
        throw new TypeError('Heatmap requires a browser DOM')
      }

      const registered = customElements.get(ElementSpec.tag)

      if (registered === undefined) {
        customElements.define(ElementSpec.tag, Drawing)
      } else if (registered !== Drawing) {
        throw new TypeError('Heatmap name belongs to another definition')
      }
    }

    const Composition = Definition.makeComposition({ mounts: [Prepare, Mount] })

    return {
      init: Composition.makeInit(
        (id: string, data: ReadonlyArray<Row>, control: HeatmapControl = initialControl()) => ({
          model: {
            id,
            data,
            control,
            focusedIndex: control.index,
            hoveredLegendLevel: Option.none(),
            isMounted: false,
            size: 0,
            hostReady: false,
            cellsEntered: false,
          },
        }),
      ),
      inMessageUpdate: Composition.makeInMessageUpdate({
        RequestedData: (m, { data }) => ({ model: modifyFields(m, { data: () => data }) }),
        RequestedFocus: (m, { index }) => ({
          model: modifyFields(m, { focusedIndex: () => Option.fromNullishOr(index) }),
        }),
        RequestedLegendLevel: (m, { level }) => ({
          model: modifyFields(m, {
            hoveredLegendLevel: () => Option.fromNullishOr(level),
            focusedIndex: () => (level === null ? m.focusedIndex : Option.none()),
          }),
        }),
        RequestedControl: (m, { controlled, index }) => ({
          model: modifyFields(m, {
            control: () => ({ controlled, index }),
            focusedIndex: () => (controlled ? index : m.focusedIndex),
          }),
        }),
      }),
      update: Composition.makeUpdate({
        ObservedFocus: (m, { index }) => ({
          model: m.control.controlled
            ? m
            : modifyFields(m, {
                focusedIndex: () => Option.fromNullishOr(index),
                hoveredLegendLevel: () => (index === null ? m.hoveredLegendLevel : Option.none()),
              }),
        }),
        ObservedSize: (m, { size }) => ({
          model:
            m.size === size && m.hostReady
              ? m
              : modifyFields(m, { size: () => size, hostReady: () => true }),
        }),
        CompletedPrepare: Definition.makeFieldsStep(() => ({ isMounted: () => true })),
        CompletedMount: (m) => ({ model: modifyFields(m, { cellsEntered: () => false }) }),
        ObservedEntered: (m) => ({ model: modifyFields(m, { cellsEntered: () => true }) }),
        ObservedReplay: (m) => ({ model: modifyFields(m, { cellsEntered: () => false }) }),
      }),
      view: Composition.makeView.withInputs((m, inputs, h) => {
        const drawing = ElementSpec.withMessage(h)
        const fixed = inputs.size !== undefined && inputs.size !== 0

        return h.div(
          [
            h.Class(
              [
                inputs.layout === 'contents'
                  ? 'contents'
                  : fixed
                    ? 'relative [width:var(--bkm-block-size)] [height:var(--bkm-block-size)]'
                    : 'relative w-full [aspect-ratio:1_/_1]',
              ].join(' '),
            ),
            h.DataAttribute('bkm-native-chart', m.id),
            h.Style(
              inputs.layout !== 'contents' && fixed
                ? { '--bkm-block-size': `${inputs.size}px` }
                : {},
            ),
            h.OnMount(Prepare()),
          ],
          [
            m.isMounted
              ? drawing([
                  drawing.Presentation(
                    new HeatmapPresentation(
                      m.data,
                      Option.getOrNull(m.focusedIndex),
                      inputs,
                      Option.getOrNull(m.hoveredLegendLevel),
                      m.cellsEntered,
                    ),
                  ),
                  drawing.OnFocusObserved(Message.ObservedFocus),
                  drawing.OnEnteredObserved(Message.ObservedEntered),
                  drawing.OnReplayObserved(Message.ObservedReplay),
                  drawing.OnSizeObserved(Message.ObservedSize),
                  h.OnMount(Mount()),
                ])
              : (inputs.serverContent?.(m.data) ?? h.empty),
            m.isMounted
              ? inputs.customContent(m.data, Option.getOrNull(m.focusedIndex), m.size)
              : h.empty,
          ],
        )
      }),
      EffectsLayer: Layer.mergeAll(Prepare.layer, Mount.layer).pipe(
        Layer.provide(
          Layer.effect(
            HeatmapRegistration,
            Effect.sync(() => {
              register()
              return register
            }),
          ),
        ),
        Layer.fresh,
      ),
    }
  }

  return { namespace: HeatmapNamespace, contract, plans }
}
