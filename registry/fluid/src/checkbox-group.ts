import { modifyFields } from 'foldkit/struct'
import { HoverMode } from './hover-observation.js'
import { selectionTarget } from './selection-group-navigation.js'
import { focusSelectionRow } from './selection-group-focus.js'
import { checkboxRow } from './checkbox-group-control.js'
/* @license Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud. */
import { rectAt } from './lib/indexed-geometry.js'
import { Data, Effect, Layer, Option, Schema, Struct, Number } from 'effect'
import { Block, Update } from 'foldkit'
import { childAttributes } from 'foldkit/html'
import type { Attribute, ChildAttribute, Html } from 'foldkit/html'
import type * as Mount from 'foldkit/mount'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import { HoverBlock, layer as HoverLayer } from './hover.js'
import type { HoverConfig } from './hover.js'
import { HoverHighlightBlock, layer as HighlightLayer } from './hover-highlight.js'
import type { HoverHighlightViewInputs } from './hover-highlight.js'
import { SelectionBackgroundsBlock, layer as SelectionLayer } from './selection-backgrounds.js'
import type { SelectionBackgroundsViewInputs } from './selection-backgrounds.js'
import {
  GroupItem,
  groupObservationFields,
  GroupObserverRoots,
  GroupObserverRootsLayer,
  observeGroup,
} from './checkbox-group-observer.js'
import { EXIT_COMPLETE_EVENT } from './motion-target.js'
import type { TargetMotionOptions } from './motion-target.js'
import { spring } from './lib/springs.js'
import { cn } from './lib/utils.js'
import { createPresentationContext, resolvePresentation } from './presentation.js'
import type { Presentation } from './presentation.js'
import { CheckboxValue, CheckboxMark, checkboxMarks } from './checkbox-group-state.js'
import type { CheckboxContext } from './checkbox-group-parts.js'

const Model = Schema.Struct({
  id: Schema.String,
  checkedIndices: Schema.Array(Schema.Int),
  checkedItems: Schema.Array(CheckboxValue),
  initialChecked: Schema.Array(CheckboxValue),
  hasForm: Schema.Boolean,
  marks: Schema.Array(CheckboxMark),
  radius: Schema.Finite,
  items: Schema.Array(GroupItem),
  focusSlot: Schema.OptionFromNullOr(
    Schema.Struct({ index: Schema.Int, generation: Schema.Natural, present: Schema.Boolean }),
  ),
  generation: Schema.Natural,
  hover: HoverBlock.Model,
  highlight: HoverHighlightBlock.Model,
  selection: SelectionBackgroundsBlock.Model,
})

const Message = defineMessageUnion({
  ...groupObservationFields,
  CompletedMarkExit: { index: Schema.Int, generation: Schema.Natural },
  CompletedFocus: {},
  CompletedFocusExit: { generation: Schema.Natural },
})

const Events =
  Data.taggedEnum<Extract<Attribute<typeof Message.Type>, { readonly _tag: 'OnCustomEvent' }>>()

const OutMessage = defineMessageUnion({ Toggled: { index: Schema.Int } })

export const InMessage = defineInMessageUnion({
  RequestedHoverMode: { mode: HoverMode },
  RequestedSelection: { indices: Schema.Array(Schema.Int) },
  RequestedItems: { items: Schema.Array(CheckboxValue) },
  RequestedRadius: { radius: Schema.Finite },
})

const Config = Schema.Struct({
  hoverMode: Schema.optionalKey(HoverMode),
  id: Schema.String,
  checkedIndices: Schema.Array(Schema.Int),
  items: Schema.optionalKey(Schema.Array(CheckboxValue)),
  radius: Schema.optionalKey(Schema.Finite),
})

const effects = Block.makeEffectsContract()

const CheckboxGroupNamespace = Block.makeNamespace('CheckboxGroup')

const ObserveRows = CheckboxGroupNamespace.makeMountStream('ObserveRows', {
  messages: [
    Message.CapturedMount,
    Message.CapturedItems,
    Message.CapturedFocus,
    Message.CapturedBlur,
    Message.CapturedClick,
    Message.CapturedReset,
    Message.CapturedEntryFocus,
    Message.CapturedKey,
  ],
  *handler() {
    const roots = yield* GroupObserverRoots

    return ({ element, viewStateChanges }) => observeGroup(element, viewStateChanges, roots)
  },
})

export const CheckboxGroupKey = Symbol('CheckboxGroup')

export const CheckboxGroupBlock = Block.make(CheckboxGroupNamespace, {
  key: CheckboxGroupKey,
  Model,
  Message,
  OutMessage,
  InMessage,
  InitArgs: Schema.Tuple([Config]),
  view: {
    kind: 'Element',
    Inputs: Block.makeInputContract<CheckboxGroupViewInputs>(),
    mounts: [ObserveRows],
  },
  effects,
})

const FocusRow = CheckboxGroupBlock.makeCommand('FocusRow', {
  args: { id: Schema.String, index: Schema.Int },
  messages: [Message.CompletedFocus],
  *handler() {
    return ({ id, index }) =>
      Effect.sync(() => {
        focusSelectionRow(id, index)

        return Message.CompletedFocus()
      })
  },
})

export interface CheckboxGroupConfig {
  readonly hoverMode?: HoverMode
  readonly id: string
  readonly checkedIndices: ReadonlyArray<number>
  readonly items?: ReadonlyArray<CheckboxValue>
  readonly radius?: number
}

const Highlight = CheckboxGroupBlock.makeRequiredFieldBinding(HoverHighlightBlock, {
  field: 'highlight',
  init: {
    contextToArgs: (config: CheckboxGroupConfig) => [
      {
        id: `${config.id}-highlight`,
        ...(config.hoverMode === undefined ? {} : { mode: config.hoverMode }),
      },
    ],
  },
})

const Selection = CheckboxGroupBlock.makeRequiredFieldBinding(SelectionBackgroundsBlock, {
  field: 'selection',
  init: {
    contextToArgs: (config: CheckboxGroupConfig) => [
      {
        id: `${config.id}-selection`,
        indices: [...config.checkedIndices],
        radius: config.radius ?? 8,
      },
    ],
  },
})

const Hover = CheckboxGroupBlock.makeRequiredFieldBinding(HoverBlock, {
  field: 'hover',
  init: {
    contextToArgs: (config: CheckboxGroupConfig) =>
      [
        { id: config.id, ...(config.hoverMode === undefined ? {} : { mode: config.hoverMode }) },
      ] satisfies [HoverConfig],
  },
}).withOutMessagePolicy({
  fold: CheckboxGroupBlock.makeOutMessageFold(HoverBlock, {
    Changed: (snapshot) =>
      Update.combineSteps([
        CheckboxGroupBlock.makeStep((model) =>
          Highlight.informOfSource({ snapshot, hidden: false, mode: model.hover.mode }),
        ),
        CheckboxGroupBlock.makeStep((model) =>
          Selection.informOfGeometry({
            itemRects: snapshot.itemRects,
            radius: model.radius,
          }),
        ),
      ]),
  }),
})

const CheckboxGroupComposition = CheckboxGroupBlock.makeComposition({
  bindings: [Hover, Highlight, Selection],
  mounts: [ObserveRows],
})

const init = CheckboxGroupComposition.makeInit((config: CheckboxGroupConfig) => ({
  childInitContext: config,
  model: {
    id: config.id,
    checkedIndices: [...config.checkedIndices],
    hasForm: true,
    initialChecked:
      config.items ?? [...config.checkedIndices].map((index) => ({ index, checked: true })),
    checkedItems:
      config.items ?? [...config.checkedIndices].map((index) => ({ index, checked: true })),
    marks: (config.items ?? [...config.checkedIndices].map((index) => ({ index, checked: true })))
      .filter((item) => item.checked)
      .map((item) => ({ index: item.index, present: true, generation: 0, initial: false })),
    radius: config.radius ?? 8,
    items: [],
    focusSlot: Option.none(),
    generation: 0,
  },
}))

const update = CheckboxGroupComposition.makeUpdate({
  CompletedMarkExit: (model, { index, generation }) => ({
    model: modifyFields(model, {
      marks: (currentMarks) =>
        currentMarks.filter(
          (mark) => mark.index !== index || mark.generation !== generation || mark.present,
        ),
    }),
  }),
  CapturedMount: (model, { hasForm }) => ({
    model: modifyFields(model, {
      hasForm: () => hasForm,
      initialChecked: () => model.checkedItems,
      marks: () =>
        model.checkedItems
          .filter((item) => item.checked)
          .map((item) => ({
            index: item.index,
            present: true,
            generation: model.generation + 1,
            initial: false,
          })),
      focusSlot: () => Option.none(),
      generation: Number.increment,
    }),
  }),
  CapturedEntryFocus: CheckboxGroupBlock.makeNoopStep(),
  CapturedItems: (model, { items }) => ({ model: modifyFields(model, { items: () => items }) }),
  CapturedFocus: CheckboxGroupBlock.makeStep(
    (model, { index, visible }: typeof Message.CapturedFocus.Type) =>
      Update.combineSteps([
        CheckboxGroupBlock.makeFieldsStep(() => ({
          focusSlot: () =>
            visible
              ? Option.some({ index, generation: model.generation + 1, present: true })
              : model.focusSlot.pipe(
                  Option.map((slot) =>
                    modifyFields(slot, {
                      present: () => false,
                      generation: () => model.generation + 1,
                    }),
                  ),
                ),
          generation: () => model.generation + 1,
        })),
        Hover.requestHighlight({ index }),
      ]),
  ),
  CapturedBlur: CheckboxGroupBlock.makeStep(
    (model, { inside }: typeof Message.CapturedBlur.Type) =>
      inside
        ? CheckboxGroupBlock.makeNoopStep()
        : Update.combineSteps([
            CheckboxGroupBlock.makeFieldsStep(() => ({
              focusSlot: () =>
                model.focusSlot.pipe(
                  Option.map((slot) =>
                    modifyFields(slot, {
                      present: () => false,
                      generation: () => model.generation + 1,
                    }),
                  ),
                ),
              generation: () => model.generation + 1,
            })),
            Hover.requestClear(),
          ]),
  ),
  CapturedReset: CheckboxGroupBlock.makeNoopStep(),
  CapturedClick: (model, { index }) => ({ model, outMessage: OutMessage.Toggled({ index }) }),
  CapturedKey: (model, { index, key }) => {
    if (key === ' ' || key === 'Enter') {
      return { model, outMessage: OutMessage.Toggled({ index }) }
    }

    const target = selectionTarget(model.items, index, key, false)

    return target
      ? { model, commands: [FocusRow({ id: model.id, index: target.index })] }
      : { model }
  },
  CompletedFocus: CheckboxGroupBlock.makeNoopStep(),
  CompletedFocusExit: (model, { generation }) => ({
    model:
      Option.isSome(model.focusSlot) &&
      !model.focusSlot.value.present &&
      model.focusSlot.value.generation === generation
        ? modifyFields(model, { focusSlot: () => Option.none() })
        : model,
  }),
})

const inMessageUpdate = CheckboxGroupComposition.makeInMessageUpdate({
  RequestedHoverMode: CheckboxGroupBlock.makeStep.fromMessage(
    ({ mode }: typeof InMessage.RequestedHoverMode.Type) =>
      Hover.requestConfigure({
        options: { mode, axis: 'y', nearest: false, gapClick: true, maxDistance: Infinity },
      }),
  ),
  RequestedItems: (model, { items }) => ({
    model: modifyFields(model, {
      checkedItems: () => items,
      marks: () => checkboxMarks(model.marks, items, model.generation + 1),
      generation: Number.increment,
    }),
  }),
  RequestedSelection: CheckboxGroupBlock.makeStep(
    (_model, { indices }: typeof InMessage.RequestedSelection.Type) =>
      Update.combineSteps([
        CheckboxGroupBlock.makeFieldsStep(() => ({ checkedIndices: () => indices })),
        Selection.requestSelection({ indices }),
      ]),
  ),
  RequestedRadius: CheckboxGroupBlock.makeStep(
    (model, { radius }: typeof InMessage.RequestedRadius.Type) =>
      Update.combineSteps([
        CheckboxGroupBlock.makeFieldsStep(() => ({ radius: () => radius })),
        Selection.informOfGeometry({ itemRects: model.hover.itemRects, radius }),
      ]),
  ),
})

export interface CheckboxGroupViewInputs extends Presentation {
  readonly content: (
    context: CheckboxContext<ChildAttribute<Mount.RequirementsOf<typeof ObserveRows>>>,
  ) => ReadonlyArray<Html>
  readonly animate: (node: Html, options: TargetMotionOptions) => Html
  readonly animateHighlight: HoverHighlightViewInputs['animate']
  readonly animateSelection: SelectionBackgroundsViewInputs['animate']
  readonly className?: string
  readonly attributes?: ReadonlyArray<ChildAttribute>
}

const view = CheckboxGroupComposition.makeView.withInputs<CheckboxGroupViewInputs>(
  (model, inputs, h) => {
    const presentation = resolvePresentation(inputs)
    const { shape, reducedMotion } = presentation
    const slot = Option.getOrNull(model.focusSlot)
    const rect = slot === null ? null : rectAt(model.hover.itemRects, slot.index)

    const ring =
      slot && rect
        ? inputs.animate(
            h.keyed('div')('focus', [
              h.Class(
                cn(
                  'absolute pointer-events-none z-20 border border-[color:var(--focus-ring,#6B97FF)]',
                  shape.focusRing,
                ),
              ),
              Events.OnCustomEvent({
                name: EXIT_COMPLETE_EVENT,
                f: () => Option.some(Message.CompletedFocusExit({ generation: slot.generation })),
              }),
            ]),
            {
              initial: false,
              animate: {
                left: rect.left - 2,
                top: rect.top - 2,
                width: rect.width + 4,
                height: rect.height + 4,
                opacity: 1,
              },
              exit: { opacity: 0, transition: spring.fast.exit },
              transition: { ...spring.fast, opacity: { duration: 0.08 } },
              present: slot.present,
              reducedMotion,
            },
          )
        : null

    const context: CheckboxContext<ChildAttribute<Mount.RequirementsOf<typeof ObserveRows>>> = {
      ...Struct.pick(inputs, ['shape', 'size', 'surface']),
      animate: inputs.animate,
      context: createPresentationContext({
        ...inputs,
        hasSizeProvider: inputs.size !== undefined || presentation.hasSizeProvider,
      }),
      id: model.id,
      checkbox: (control, render) =>
        checkboxRow(model.id, control, (index) => Message.CapturedClick({ index }), render, h),
      checkedIndices: model.checkedIndices,
      checkedItems: model.checkedItems,
      initialChecked: model.initialChecked,
      hasForm: model.hasForm,
      marks: model.marks.map((mark) => ({
        ...mark,
        completion: childAttributes([
          Events.OnCustomEvent({
            name: EXIT_COMPLETE_EVENT,
            f: () =>
              Option.some(
                Message.CompletedMarkExit({ index: mark.index, generation: mark.generation }),
              ),
          }),
        ]),
      })),
      activeIndex: model.hover.activeIndex,
      itemMount: childAttributes([h.OnMount(ObserveRows())]),
    }

    return h.block(
      Hover.embedView({
        slotId: model.hover.id,
        model: model.hover,
        viewInputs: {
          attributes: [
            ...childAttributes([
              h.Role('group'),
              h.DataAttribute('slot', 'fluid-selection-group'),
              h.Class(cn('relative flex flex-col w-72 max-w-full select-none', inputs.className)),
            ]),
            ...(inputs.attributes ?? []),
          ],
          content: () => [
            h.block(
              Selection.embedView({
                slotId: model.selection.id,
                model: model.selection,
                viewInputs: { animate: inputs.animateSelection },
              }),
            ),
            h.block(
              Highlight.embedView({
                slotId: model.highlight.id,
                model: model.highlight,
                viewInputs: {
                  className: shape.bg,
                  animate: inputs.animateHighlight,
                  mode: model.hover.mode,
                },
              }),
            ),
            ring,
            ...inputs.content(context),
          ],
        },
      }),
    )
  },
)

export const layer = CheckboxGroupBlock.makeLayer({
  init,
  update,
  inMessageUpdate,
  view,
  EffectsLayer: Layer.mergeAll(ObserveRows.layer, FocusRow.layer).pipe(
    Layer.provide(GroupObserverRootsLayer),
  ),
}).pipe(Layer.provide(Layer.mergeAll(HoverLayer, HighlightLayer, SelectionLayer)))

export { CheckboxItem } from './checkbox-group-parts.js'

export type { CheckboxContext, CheckboxItemProps } from './checkbox-group-parts.js'

export const test = { FocusRow, ObserveRows }

export const hoverModeOf = (model: typeof CheckboxGroupBlock.Model.Type) => model.hover.mode

export const radiusOf = (model: typeof CheckboxGroupBlock.Model.Type) => model.radius
