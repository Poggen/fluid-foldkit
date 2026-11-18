import { replaceInteraction } from './state'
import { modifyFields } from 'foldkit/struct'
import { cartesianCssScope } from './css-scope'
import type { TimeSeriesProps } from './root-options'
import { ChartViewport } from './viewport'
import { tooltipSetter } from './chart-context'
import { drawingStyle } from './container-options'
import { chartStyleProperties } from './style'
import type { ChartRowSchema } from './data-boundary'
import { keyboardIndex, keyboardCandidateIndex } from './focus'
import { pointerFocus } from './pointer-focus'
import {
  FocusObservation,
  KeyboardObservation,
  DragObservation,
  SweepObservation,
  PhaseTimingObservation,
} from './observations'
import {
  CartesianNamespace,
  DrawingElementBase,
  MountCartesian,
  PrepareCartesian,
  cartesianEffectsLayer,
} from './lifecycle'
import { Option, Schema } from 'effect'
import type { Block } from 'foldkit'
import { CustomElement } from 'foldkit'
import { defineDrawingElement } from './drawing-element'
import type { CartesianSnapshot } from './definition'
import type { ChartValue } from '@tanstack/charts'
import {
  initialInteraction,
  configureInteraction,
  phasePlan,
  Domains,
  yDomainsTween,
  observeDrag,
  observeSweep,
  observePhaseTiming,
  advanceInteraction,
} from './state'
import { remountInteraction } from './mount-interaction'
import { cartesianContracts } from './block-contract'
import type { CartesianViewInputs } from './block-contract'

const revealInteraction: (
  configuration: Parameters<typeof initialInteraction>[0],
  startRevealing: boolean,
) => Interaction = function revealInteraction(
  configuration: Parameters<typeof initialInteraction>[0],
  startRevealing: boolean,
) {
  const interaction = initialInteraction(configuration)

  return startRevealing ? modifyFields(interaction, { revealReady: () => false }) : interaction
}

export type { CartesianViewInputs } from './block-contract'

type Interaction = ReturnType<typeof initialInteraction>

type Configuration = Interaction['configuration']

const sameDomains = Schema.toEquivalence(Domains)

const sameViewport = Schema.toEquivalence(Schema.Option(ChartViewport))

const limit: (index: number | null, length: number) => number | null = (
  index: number | null,
  length: number,
) => (index === null || length === 0 ? null : Math.max(0, Math.min(length - 1, index)))

/** Stateful native orchestration. Families supply typed scene compilation through view inputs. */
export function defineCartesianBlock<
  RowSchema extends ChartRowSchema,
  SceneDatum = RowSchema['Type'],
  XValue extends ChartValue = Date,
  YValue extends ChartValue = number,
  Snapshot = CartesianSnapshot<RowSchema['Type']>,
  ResourceOptions = TimeSeriesProps<RowSchema['Type']>,
>({
  name,
  Row,
  startRevealing = false,
  statusTransition = 'phased',
  selectionHover = 'anchor',
  pointerScheduling = 'direct',
  restartOnMount = false,
}: {
  readonly name: string
  readonly Row: RowSchema
  readonly startRevealing?: boolean
  readonly statusTransition?: 'phased' | 'instant'
  /** Source Line/Area leave hover cleared until another pointer move after selection. */
  readonly selectionHover?: 'anchor' | 'clear'
  readonly pointerScheduling?: 'direct' | 'host-frame'
  readonly restartOnMount?: boolean
}) {
  if (!/^[a-z][a-z0-9-]*$/u.test(name)) {
    throw new TypeError('Cartesian name must be a caller-owned lowercase custom-element namespace')
  }

  type Datum = RowSchema['Type']

  class Presentation {
    readonly id: string
    readonly data: ReadonlyArray<Datum>
    readonly focusedIndex: number | null
    readonly focusedSeriesIndex: number | null
    readonly state: Interaction
    readonly inputs: CartesianViewInputs<
      Datum,
      SceneDatum,
      XValue,
      YValue,
      Snapshot,
      ResourceOptions
    >
    constructor(
      id: string,
      data: ReadonlyArray<Datum>,
      focusedIndex: number | null,
      focusedSeriesIndex: number | null,
      inputs: CartesianViewInputs<Datum, SceneDatum, XValue, YValue, Snapshot, ResourceOptions>,
      state: Interaction,
    ) {
      this.state = state
      this.id = id
      this.data = data
      this.focusedIndex = focusedIndex
      this.focusedSeriesIndex = focusedSeriesIndex
      this.inputs = inputs
    }
  }

  const PresentationSchema = Schema.declare<Presentation>(
    (value): value is Presentation => value instanceof Presentation,
  )

  const ElementSpec = CustomElement.define({
    tag: `fk-bklit-${name}`,
    properties: { presentation: PresentationSchema },
    events: {
      'drag-observed': DragObservation,
      'sweep-observed': SweepObservation,
      'focus-observed': FocusObservation,
      'blur-observed': Schema.Struct({}),
      'pointer-leave-observed': Schema.Struct({}),
      'key-observed': KeyboardObservation,
      'phase-timing': PhaseTimingObservation,
      'phase-deadline': Schema.Struct({ generation: Schema.Int }),
      'reveal-completed': Schema.Struct({ generation: Schema.Int }),
      'candidates-observed': Schema.Struct({ indices: Schema.Array(Schema.Int) }),
      'domains-observed': Schema.Struct({
        current: Domains,
        target: Domains,
        viewport: Schema.optionalKey(ChartViewport),
      }),
    },
  })

  const contract = cartesianContracts<
    RowSchema,
    SceneDatum,
    XValue,
    YValue,
    Snapshot,
    ResourceOptions
  >(Row)

  const { Message } = contract

  const DrawingElement = defineDrawingElement<
    Datum,
    SceneDatum,
    XValue,
    YValue,
    Snapshot,
    ResourceOptions
  >(DrawingElementBase, pointerScheduling)

  const EffectsLayer = cartesianEffectsLayer(() => {
    if (DrawingElement === undefined || typeof customElements === 'undefined') {
      return
    }

    const registered = customElements.get(ElementSpec.tag)

    if (registered === undefined) {
      customElements.define(ElementSpec.tag, DrawingElement)
    } else if (registered !== DrawingElement) {
      throw new TypeError('Cartesian name belongs to another row definition')
    }
  })

  const focusRow = (index: number | null) => Message.ChangedFocus({ index })

  const plans = <const Key extends symbol>(
    CartesianBlock: ReturnType<typeof Block.make<'Cartesian', Key, typeof contract>>,
  ) => {
    const CartesianComposition = CartesianBlock.makeComposition({
      mounts: [PrepareCartesian, MountCartesian],
    })

    const contextCapabilities = {
      focusRow,
      setTooltipData: tooltipSetter<Datum, ReturnType<typeof focusRow>>(focusRow),
      clearSelection: () => Message.ChangedSelection({ selection: Option.none() }),
    }

    return {
      init: CartesianComposition.makeInit(
        (id: string, data: ReadonlyArray<Datum>, configuration?: Configuration) => ({
          model: {
            id,
            data,
            isMounted: false,
            ...revealInteraction(configuration, startRevealing),
            focusedIndex: Option.none<number>(),
            focusedSeriesIndex: Option.none<number>(),
            focusSource: 'programmatic',
          },
        }),
      ),
      update: CartesianComposition.makeUpdate({
        ObservedSweepCycle: (model, event) => ({ model: observeSweep(model, event) }),
        ObservedDrag: (model, event) => {
          const changes = observeDrag(model, event, selectionHover)

          return {
            model: modifyFields(model, {
              dragAnchor: (value) => changes.dragAnchor ?? value,
              selection: (value) => changes.selection ?? value,
              focusedIndex: (value) => changes.focusedIndex ?? value,
              focusSource: (value) => changes.focusSource ?? value,
            }),
          }
        },
        ChangedSelection: (model, { selection }) => ({
          model: modifyFields(model, { selection: () => selection }),
        }),
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
        ObservedCandidates: (model, { indices }) => ({
          model: modifyFields(model, {
            focusCandidates: () =>
              Option.some(indices.filter((index) => index >= 0 && index < model.data.length)),
          }),
        }),
        ObservedDomains: (model, { current, target, viewport }) => {
          const measuredViewport = viewport === undefined ? model.viewport : Option.some(viewport)
          const yTweens = yDomainsTween(current, target)

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
        ChangedFocus: (model, { index, seriesIndex }) => ({
          model: modifyFields(model, {
            focusedIndex: () => Option.fromNullishOr(limit(index, model.data.length)),
            focusedSeriesIndex: () => Option.fromNullishOr(seriesIndex),
            focusSource: () => 'programmatic',
          }),
        }),
        ObservedBlur: (model) => ({
          model:
            model.focusSource === 'keyboard'
              ? modifyFields(model, {
                  focusedIndex: () => Option.none(),
                  focusedSeriesIndex: () => Option.none(),
                  focusSource: () => 'pointer',
                })
              : model,
        }),
        ObservedPointerLeave: (model) => ({
          model:
            model.focusSource === 'pointer'
              ? modifyFields(model, {
                  focusedIndex: () => Option.none(),
                  focusedSeriesIndex: () => Option.none(),
                })
              : model,
        }),
        ObservedFocus: (model, { index, seriesIndex }) => ({
          model: pointerFocus(
            model,
            limit(index, model.data.length),
            seriesIndex ?? null,
            pointerScheduling === 'host-frame',
          ),
        }),
        ObservedKey: (model, { key }) => {
          const index = Option.match(model.focusCandidates, {
            onNone: () =>
              keyboardIndex(key, Option.getOrNull(model.focusedIndex), model.data.length),
            onSome: (indices) =>
              keyboardCandidateIndex(key, Option.getOrNull(model.focusedIndex), indices),
          })

          return {
            model: modifyFields(model, {
              focusedIndex: () => Option.fromNullishOr(limit(index, model.data.length)),
              focusedSeriesIndex: () => Option.none(),
              focusSource: () => (key === 'Escape' ? 'programmatic' : 'keyboard'),
            }),
          }
        },
        Unmounted: (model) => {
          if (!model.isMounted) {
            return { model }
          }

          const state = restartOnMount ? remountInteraction(model, startRevealing) : model

          return {
            model: modifyFields(replaceInteraction(model, state), {
              isMounted: () => false,
              focusedIndex: () => Option.none(),
              focusedSeriesIndex: () => Option.none(),
              focusSource: () => 'programmatic',
            }),
          }
        },
        CompletedPrepare: (model) => ({
          model: model.isMounted ? model : modifyFields(model, { isMounted: () => true }),
        }),
        CompletedMount: CartesianBlock.makeNoopStep(),
      }),
      inMessageUpdate: CartesianComposition.makeInMessageUpdate({
        RequestedLegendHover: (model, { index }) => ({
          model:
            Option.getOrNull(model.hoveredLegend) === Option.getOrNull(index)
              ? model
              : modifyFields(model, { hoveredLegend: () => index }),
        }),
        RequestedProfitLossLegendHover: (model, { index }) => ({
          model:
            Option.getOrNull(model.hoveredProfitLossLegend) === Option.getOrNull(index)
              ? model
              : modifyFields(model, { hoveredProfitLossLegend: () => index }),
        }),
        RequestedConfigure: (model, { configuration }) => {
          let next: typeof model = replaceInteraction(
            model,
            configureInteraction(model, configuration),
          )

          if (statusTransition === 'instant') {
            next = modifyFields(next, { phase: () => configuration.status })
          }

          if (model.configuration.revealSignature !== configuration.revealSignature) {
            next = modifyFields(next, {
              focusedIndex: () => Option.none(),
              focusedSeriesIndex: () => Option.none(),
              focusSource: () => 'programmatic',
              brush: () => Option.none(),
            })

            if (startRevealing) {
              next = modifyFields(next, { revealReady: () => false })
            }
          }

          return { model: next }
        },
        RequestedBrush: (model, { range }) => ({
          model: modifyFields(model, { brush: () => range, updateStep: () => 'window' }),
        }),
        RequestedSelection: (model, { selection }) => ({
          model: modifyFields(model, { selection: () => selection }),
        }),
        RequestedData: (model, { data }) => ({
          model: modifyFields(model, {
            data: () => data,
            updateStep: () => (Object.keys(model.domains).length === 0 ? 'none' : 'snap'),
            yDomainFrom: () => model.domains,
            focusCandidates: () => Option.none(),
            focusedIndex: () =>
              model.focusedIndex.pipe(
                Option.flatMap((index) => Option.fromNullishOr(limit(index, data.length))),
              ),
          }),
        }),
        RequestedFocus: (model, { index, seriesIndex }) => ({
          model: modifyFields(model, {
            focusedIndex: () => Option.fromNullishOr(limit(index, model.data.length)),
            focusedSeriesIndex: () => Option.fromNullishOr(seriesIndex),
            focusSource: () => 'programmatic',
          }),
        }),
      }),
      view: CartesianComposition.makeView.withInputs<
        CartesianViewInputs<Datum, SceneDatum, XValue, YValue, Snapshot, ResourceOptions>
      >((model, inputs, h) => {
        const drawing = ElementSpec.withMessage(h)

        const pending =
          DrawingElement === undefined
            ? (inputs.serverContent?.(model.data, model, Option.getOrNull(model.focusedIndex)) ??
              h.empty)
            : h.empty

        const content = model.isMounted
          ? drawing([
              drawing.Presentation(
                new Presentation(
                  model.id,
                  model.data,
                  Option.getOrNull(model.focusedIndex),
                  Option.getOrNull(model.focusedSeriesIndex),
                  inputs,
                  model,
                ),
              ),
              drawing.OnDragObserved(Message.ObservedDrag),
              drawing.OnSweepObserved(Message.ObservedSweepCycle),
              drawing.OnFocusObserved(Message.ObservedFocus),
              drawing.OnBlurObserved(Message.ObservedBlur),
              drawing.OnPointerLeaveObserved(Message.ObservedPointerLeave),
              drawing.OnKeyObserved(Message.ObservedKey),
              drawing.OnPhaseTiming(Message.ObservedPhaseTiming),
              drawing.OnPhaseDeadline(Message.ObservedPhaseDeadline),
              drawing.OnRevealCompleted(Message.CompletedReveal),
              drawing.OnCandidatesObserved(Message.ObservedCandidates),
              drawing.OnDomainsObserved(Message.ObservedDomains),
              h.Style(inputs.familyRoot === undefined ? drawingStyle(inputs) : {}),
              h.DataAttribute(
                'focused-index',
                Option.match(model.focusedIndex, { onNone: () => '', onSome: String }),
              ),
              h.Class(
                [
                  inputs.familyRoot === undefined
                    ? 'block [width:var(--bkm-drawing-width,100%)] [height:var(--bkm-drawing-height)]'
                    : 'block relative w-full h-full',
                  cartesianCssScope(model.id).className,
                  inputs.familyRoot === undefined ? inputs.className : undefined,
                ]
                  .filter(Boolean)
                  .join(' '),
              ),
              h.OnMount(MountCartesian()),
            ])
          : pending

        const painted = [
          content,
          inputs.renderContent?.(model.data, Option.getOrNull(model.focusedIndex), model) ??
            h.empty,
          inputs.renderContext?.(
            h,
            model.data,
            Option.getOrNull(model.focusedIndex),
            model,
            contextCapabilities,
            DrawingElement !== undefined,
          ) ?? h.empty,
        ]

        return h.div(
          [
            h.Class(
              inputs.familyRoot === undefined
                ? ['relative [width:var(--bkm-container-width,100%)]'].join(' ')
                : [inputs.familyRoot.className].filter(Boolean).join(' '),
            ),
            h.DataAttribute('bkm-native-chart', model.id),
            ...(inputs.familyRoot === undefined ? [] : [h.DataAttribute('bkm-family-root', '')]),
            h.Style(
              inputs.familyRoot === undefined
                ? inputs.width === undefined
                  ? {}
                  : { '--bkm-container-width': `${inputs.width}px` }
                : chartStyleProperties(inputs.familyRoot.style),
            ),
            h.OnMount(PrepareCartesian()),

            ...(DrawingElement === undefined ? [] : [h.OnUnmount(Message.Unmounted())]),
          ],
          [
            inputs.resources ?? h.empty,
            h.keyed('div')(
              model.configuration.revealSignature,
              [h.Class(inputs.familyRoot === undefined ? 'contents' : 'relative w-full h-full')],
              inputs.familyRoot === undefined
                ? painted
                : [h.div([h.Class('absolute inset-0')], painted)],
            ),
          ],
        )
      }),
      EffectsLayer,
    }
  }

  return { namespace: CartesianNamespace, contract, plans }
}
