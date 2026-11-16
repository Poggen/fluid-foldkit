import { modifyFields } from 'foldkit/struct'
import { BrushNamespace, Message, PrepareBrush, MountBrush, brushEffectsLayer } from './lifecycle'
import { Option, Schema } from 'effect'
import { Block, CustomElement, Update } from 'foldkit'
import { childAttributes } from 'foldkit/html'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import { chartRows } from '../cartesian/data-boundary'
import type { ChartRowSchema } from '../cartesian/data-boundary'
import { defineBrushDrawingElement } from './drawing-element'
import { DrawingElementBase } from '../cartesian/lifecycle'
import {
  BrushRange,
  Domains,
  advanceInteraction,
  replaceInteraction,
  configureInteraction,
  observePhaseTiming,
  observeSweep,
  phasePlan,
  yDomainsTween,
} from '../cartesian/state'
import { PhaseTimingObservation, SweepObservation } from '../cartesian/observations'
import { ChartViewport } from '../cartesian/viewport'
import type { BrushPlot, BrushViewInputs, ChartBrushLayoutState } from './options'
import {
  BrushInteractionFields,
  BrushObservation,
  OwnerConfiguration,
  brushDate,
  fullExtent,
  initialBrushInteraction,
  initialControl,
  observeControl,
  reportedSelection,
  resolveSelection,
} from './state'
import type { BrushInteraction, Range } from './state'

/** Pure checked definition; DOM acquisition belongs to the registered Cartesian Mount Layer. */
export function defineChartBrushBlock<
  RowSchema extends ChartRowSchema & { readonly Type: Readonly<Record<string, unknown>> },
>(options: { readonly name: string; readonly Row: RowSchema }) {
  if (!/^[a-z][a-z0-9-]*$/u.test(options.name)) {
    throw new TypeError('Brush name must be a caller-owned lowercase custom-element namespace')
  }

  type Row = RowSchema['Type']

  const Rows = chartRows(options.Row)

  const Model = Schema.Struct({
    id: Schema.String,
    data: Rows,
    isMounted: Schema.Boolean,
    ...BrushInteractionFields,
  })

  type Model = typeof Model.Type

  const InMessage = defineInMessageUnion({
    RequestedSelection: { range: Schema.Option(BrushRange) },
    RequestedData: { data: Rows },
    RequestedConfigure: { owner: OwnerConfiguration },
  })

  const OutMessage = defineMessageUnion({
    SelectionObserved: {
      kind: BrushObservation.fields.kind,
      report: Schema.Option(BrushRange),
      viewport: Schema.Option(BrushRange),
      enabled: Schema.Boolean,
      slotCount: Schema.Int,
    },
    ViewportChanged: {
      viewport: Schema.Option(BrushRange),
      enabled: Schema.Boolean,
      slotCount: Schema.Int,
    },
  })

  const effects = Block.makeEffectsContract()

  const contract = {
    Model,
    Message,
    InMessage,
    OutMessage,
    InitArgs: Schema.Tuple([Schema.String, Rows, OwnerConfiguration]),
    view: { kind: 'Element', Inputs: Block.makeInputContract<BrushViewInputs<Row>>() } satisfies {
      readonly kind: 'Element'
      readonly Inputs: unknown
    },
    effects,
    inMessageOutputs: {
      RequestedSelection: { outMessage: OutMessage.ViewportChanged },
      RequestedData: { outMessage: OutMessage.ViewportChanged },
      RequestedConfigure: { outMessage: OutMessage.ViewportChanged },
    },
  }

  class Presentation {
    readonly focusedIndex = null
    readonly focusedSeriesIndex = null
    readonly id: string
    readonly data: ReadonlyArray<Row>
    readonly inputs: BrushPlot<Row>
    readonly state: BrushInteraction
    constructor(
      id: string,
      data: ReadonlyArray<Row>,
      inputs: BrushPlot<Row>,
      state: BrushInteraction,
    ) {
      this.id = id
      this.data = data
      this.inputs = inputs
      this.state = state
    }
  }

  const ElementSpec = CustomElement.define({
    tag: `fk-bklit-${options.name}`,
    properties: {
      presentation: Schema.declare<Presentation>(
        (value): value is Presentation => value instanceof Presentation,
      ),
    },
    events: {
      'bkm-brush-observed': BrushObservation,
      'sweep-observed': SweepObservation,
      'phase-timing': PhaseTimingObservation,
      'phase-deadline': Schema.Struct({ generation: Schema.Int }),
      'reveal-completed': Schema.Struct({ generation: Schema.Int }),
      'domains-observed': Schema.Struct({
        current: Domains,
        target: Domains,
        viewport: Schema.optionalKey(ChartViewport),
      }),
    },
  })

  const DrawingElement = defineBrushDrawingElement<Row>(DrawingElementBase)

  const elementId = (id: string) => `${ElementSpec.tag}-${id}`

  const registration = () => {
    if (DrawingElement === undefined) {
      throw new TypeError('Brush requires a browser DOM')
    }

    const registered = customElements.get(ElementSpec.tag)

    if (registered === undefined) {
      customElements.define(ElementSpec.tag, DrawingElement)
    } else if (registered !== DrawingElement) {
      throw new TypeError('Brush name belongs to another row definition')
    }
  }

  const changed = (model: Model) =>
    OutMessage.ViewportChanged({
      viewport: model.owner.enabled ? model.brushSelection : Option.none(),
      enabled: model.owner.enabled,
      slotCount: model.data.length,
    })

  const select = (model: Model, range: Option.Option<Range>) => {
    const next = modifyFields(model, {
      brushSelection: () =>
        Option.orElse(
          resolveSelection(range, fullExtent(model.data, model.owner)),
          () => model.brushSelection,
        ),
    })

    return Update.withOutMessage({ model: next }, changed(next))
  }

  const sameDomains = Schema.toEquivalence(Domains)
  const sameViewport = Schema.toEquivalence(Schema.Option(ChartViewport))

  const plans = <const Key extends symbol>(
    Definition: ReturnType<typeof Block.make<'Brush', Key, typeof contract>>,
  ) => {
    const EffectsLayer = brushEffectsLayer(registration)
    const Composition = Definition.makeComposition({ mounts: [PrepareBrush, MountBrush] })

    return {
      init: Composition.makeInit(
        (id: string, data: ReadonlyArray<Row>, owner: OwnerConfiguration) => ({
          model: {
            id,
            data,
            isMounted: false,
            ...initialBrushInteraction(owner, fullExtent(data, owner)),
          },
        }),
      ),
      update: Composition.makeUpdate({
        ObservedBrush: (model, event) => {
          const report = reportedSelection(model.control, event)
          const selected = select(model, report)

          const next = modifyFields(selected.model, {
            control: () => observeControl(model.control, event),
          })

          return Update.withOutMessage(
            { model: next },
            OutMessage.SelectionObserved({
              kind: event.kind,
              report,
              viewport: next.owner.enabled ? next.brushSelection : Option.none(),
              enabled: next.owner.enabled,
              slotCount: next.data.length,
            }),
          )
        },
        ChangedSelection: (model, { range }) => select(model, range),
        ObservedSweepCycle: (model, event) => ({ model: observeSweep(model, event) }),
        ObservedPhaseTiming: (model, event) => ({ model: observePhaseTiming(model, event) }),
        ObservedPhaseDeadline: (model, { generation }) => {
          const plan = phasePlan(model, false)

          return {
            model:
              generation !== model.generation || plan === null
                ? model
                : replaceInteraction(model, advanceInteraction(model, plan.next)),
          }
        },
        CompletedReveal: (model, { generation }) => ({
          model:
            generation === model.generation
              ? modifyFields(model, { revealReady: () => true })
              : model,
        }),
        ObservedDomains: (model, { current, target, viewport }) => {
          const measuredViewport = viewport === undefined ? model.viewport : Option.some(viewport)
          const yTweens = yDomainsTween(current, target)

          // Drawing may repeat after input rebinding; only changed measurements own a new model.
          if (
            model.updateStep !== 'snap' &&
            sameDomains(model.domains, current) &&
            sameViewport(model.viewport, measuredViewport) &&
            model.yTweens === yTweens
          ) {
            return { model }
          }

          const next = modifyFields(model, {
            domains: () => current,
            viewport: () => measuredViewport,
            yTweens: () => yTweens,
          })

          if (model.updateStep !== 'snap') {
            return { model: next }
          }

          return {
            model: modifyFields(next, {
              updateStep: () => (yTweens ? 'glide' : 'none'),
              yDomainFrom: () => ({}),
            }),
          }
        },
        CompletedPrepare: (model) => ({ model: modifyFields(model, { isMounted: () => true }) }),
        CompletedMount: Definition.makeNoopStep(),
      }),
      inMessageUpdate: Composition.makeInMessageUpdate({
        RequestedSelection: (model, { range }) => select(model, range),
        RequestedData: (model, { data }) => {
          if (data === model.data) {
            return { model }
          }

          const next = modifyFields(model, {
            data: () => data,
            control: () => initialControl(model.owner.seed),
            brushSelection: () => fullExtent(data, model.owner),
          })

          return Update.withOutMessage({ model: next }, changed(next))
        },
        RequestedConfigure: (model, { owner }) => {
          const keyChanged = model.owner.xDataKey !== owner.xDataKey
          const stripEntered = !model.owner.enabled && owner.enabled

          const extentChanged =
            keyChanged ||
            Option.getOrNull(model.owner.xExtentMax) !== Option.getOrNull(owner.xExtentMax)

          const next = modifyFields(
            replaceInteraction(model, configureInteraction(model, owner.plot)),
            {
              owner: () => owner,
              // The conditional Source strip remounts; only its local control resets.
              control: () =>
                keyChanged || stripEntered ? initialControl(owner.seed) : model.control,
              brushSelection: () =>
                extentChanged ? fullExtent(model.data, owner) : model.brushSelection,
            },
          )

          return Update.withOutMessage({ model: next }, changed(next))
        },
      }),
      view: Composition.makeView.withInputs<BrushViewInputs<Row>>((model, inputs, h) => {
        const selection = Option.getOrNull(model.brushSelection)

        const layout: ChartBrushLayoutState = {
          xDomain:
            model.owner.enabled && selection !== null
              ? [brushDate(selection.start), brushDate(selection.end)]
              : undefined,
          xDomainSlotCount: model.owner.enabled ? model.data.length : undefined,
          brushSelection:
            selection === null
              ? null
              : { start: brushDate(selection.start), end: brushDate(selection.end) },
          selectionAttributes: (value) =>
            childAttributes([
              h.OnClick(
                Definition.Message.ChangedSelection({
                  range:
                    value === null
                      ? Option.none()
                      : Option.some({ start: value.start.getTime(), end: value.end.getTime() }),
                }),
              ),
            ]),
        }

        const plot = model.owner.enabled ? inputs.renderStrip(layout) : undefined
        const drawing = ElementSpec.withMessage(h)

        const strip =
          plot === undefined
            ? h.empty
            : h.div(
                [
                  h.Class(
                    [
                      'relative',
                      ['bk-brush-strip [height:var(--bkm-brush-strip-height)]']
                        .filter(Boolean)
                        .join(' '),
                    ]
                      .filter(Boolean)
                      .join(' '),
                  ),
                  h.Style({ '--bkm-brush-strip-height': `${inputs.height}px` }),
                  h.DataAttribute('bkm-native-chart', `${model.id}-strip`),
                ],
                [
                  plot.resources ?? h.empty,
                  model.isMounted
                    ? drawing([
                        h.Class('block w-full h-full'),
                        h.Id(elementId(model.id)),
                        drawing.Presentation(
                          new Presentation(`${model.id}-strip`, model.data, plot, model),
                        ),
                        drawing.OnBkmBrushObserved(Message.ObservedBrush),
                        drawing.OnSweepObserved(Message.ObservedSweepCycle),
                        drawing.OnPhaseTiming(Message.ObservedPhaseTiming),
                        drawing.OnPhaseDeadline(Message.ObservedPhaseDeadline),
                        drawing.OnRevealCompleted(Message.CompletedReveal),
                        drawing.OnDomainsObserved(Message.ObservedDomains),

                        h.OnMount(MountBrush()),
                      ])
                    : (plot.serverContent?.(model.data, model) ?? h.empty),
                  model.isMounted ? plot.renderBrush(model, model.data) : h.empty,
                ],
              )

        return h.div(
          [
            h.Class(
              `bk-brush${inputs.fitMainContent ? ' bk-brush-fit justify-start' : ''}${inputs.className === undefined ? '' : ` ${inputs.className}`}`,
            ),
            h.OnMount(PrepareBrush()),
          ],
          [
            inputs.renderMain === undefined
              ? h.empty
              : h.div(
                  [h.Class(`bk-brush-main${inputs.fitMainContent ? ' [flex:none]' : ''}`)],
                  [inputs.renderMain(layout)],
                ),
            strip,
          ],
        )
      }),
      EffectsLayer,
    }
  }

  return { namespace: BrushNamespace, contract, plans }
}
