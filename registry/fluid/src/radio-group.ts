import { modifyFields } from 'foldkit/struct'
import { HoverMode } from './hover-observation.js'
import { selectionTarget } from './selection-group-navigation.js'
import { focusSelectionRow } from './selection-group-focus.js'
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
import { CheckboxMark, checkboxMarks } from './checkbox-group-state.js'
import {
  RadioValue,
  radioItemValues,
  radioSelectedIndex,
  radioItemSelected,
  radioHasSelection,
} from './radio-group-state.js'
import type { RadioItemConfig } from './radio-group-state.js'
import type { RadioContext } from './radio-group-parts.js'

const Model = Schema.Struct({
  id: Schema.String,
  value: Schema.OptionFromNullOr(Schema.String),
  selectedIndex: Schema.OptionFromNullOr(Schema.Int),
  values: Schema.Array(RadioValue),
  marks: Schema.Array(CheckboxMark),
  initialChecked: Schema.Array(Schema.Struct({ index: Schema.Int, checked: Schema.Boolean })),
  hasForm: Schema.Boolean,
  radius: Schema.Finite,
  items: Schema.Array(GroupItem),
  focusSlot: Schema.OptionFromNullOr(
    Schema.Struct({ index: Schema.Int, generation: Schema.Natural, present: Schema.Boolean }),
  ),
  generation: Schema.Natural,
  hover: HoverBlock.Model,
  highlight: HoverHighlightBlock.Model,
})

type Model = typeof Model.Type

const Message = defineMessageUnion({
  ...groupObservationFields,
  CompletedMarkExit: { index: Schema.Int, generation: Schema.Natural },
  CompletedFocus: {},
  CompletedFocusExit: { generation: Schema.Natural },
})

const Events =
  Data.taggedEnum<Extract<Attribute<typeof Message.Type>, { readonly _tag: 'OnCustomEvent' }>>()

const OutMessage = defineMessageUnion({
  Selected: { index: Schema.Int, value: Schema.OptionFromNullOr(Schema.String) },
})

const Item = Schema.Struct({
  index: Schema.Int,
  value: Schema.optionalKey(Schema.String),
  selected: Schema.optionalKey(Schema.Boolean),
})

export const InMessage = defineInMessageUnion({
  RequestedHoverMode: { mode: HoverMode },
  RequestedSelection: {
    value: Schema.optionalKey(Schema.String),
    selectedIndex: Schema.optionalKey(Schema.Int),
  },
  RequestedItems: { items: Schema.Array(Item) },
})

const Config = Schema.Struct({
  hoverMode: Schema.optionalKey(HoverMode),
  id: Schema.String,
  selectedIndex: Schema.optionalKey(Schema.Int),
  value: Schema.optionalKey(Schema.String),
  items: Schema.Array(Item),
})

const effects = Block.makeEffectsContract()

const RadioGroupNamespace = Block.makeNamespace('RadioGroup')

const ObserveRows = RadioGroupNamespace.makeMountStream('ObserveRows', {
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

    return ({ element, viewStateChanges }) => observeGroup(element, viewStateChanges, roots, true)
  },
})

export const RadioGroupKey = Symbol('RadioGroup')

export const RadioGroupBlock = Block.make(RadioGroupNamespace, {
  key: RadioGroupKey,
  Model,
  Message,
  OutMessage,
  InMessage,
  InitArgs: Schema.Tuple([Config]),
  view: {
    kind: 'Element',
    Inputs: Block.makeInputContract<RadioGroupViewInputs>(),
    mounts: [ObserveRows],
  },
  effects,
})

const FocusRow = RadioGroupBlock.makeCommand('FocusRow', {
  args: { id: Schema.String, index: Schema.Int },
  messages: [Message.CompletedFocus],
  *handler() {
    return ({ id, index }) =>
      Effect.sync(() => {
        focusSelectionRow(id, index, true)

        return Message.CompletedFocus()
      })
  },
})

export interface RadioGroupConfig {
  readonly hoverMode?: HoverMode
  readonly id: string
  readonly selectedIndex?: number
  readonly value?: string
  readonly items: ReadonlyArray<RadioItemConfig>
}

const Highlight = RadioGroupBlock.makeRequiredFieldBinding(HoverHighlightBlock, {
  field: 'highlight',
  init: {
    contextToArgs: (config: RadioGroupConfig) => [
      {
        id: `${config.id}-highlight`,
        ...(config.hoverMode === undefined ? {} : { mode: config.hoverMode }),
      },
    ],
  },
})

const Hover = RadioGroupBlock.makeRequiredFieldBinding(HoverBlock, {
  field: 'hover',
  init: {
    contextToArgs: (config: RadioGroupConfig) =>
      [
        { id: config.id, ...(config.hoverMode === undefined ? {} : { mode: config.hoverMode }) },
      ] satisfies [HoverConfig],
  },
}).withOutMessagePolicy({
  fold: RadioGroupBlock.makeOutMessageFold(HoverBlock, {
    Changed: (snapshot) =>
      RadioGroupBlock.makeStep((model) =>
        Highlight.informOfSource({ snapshot, hidden: false, mode: model.hover.mode }),
      ),
  }),
})

const RadioGroupComposition = RadioGroupBlock.makeComposition({
  bindings: [Hover, Highlight],
  mounts: [ObserveRows],
})

const init = RadioGroupComposition.makeInit((config: RadioGroupConfig) => {
  const values = radioItemValues(config.items)
  const selectedIndex = Option.fromUndefinedOr(config.selectedIndex)
  const value = Option.fromUndefinedOr(config.value)

  return {
    childInitContext: config,
    model: {
      id: config.id,
      value,
      selectedIndex,
      values,
      hasForm: true,
      radius: 8,
      items: [],
      focusSlot: Option.none(),
      generation: 0,
      initialChecked: values.map((item) => ({
        index: item.index,
        checked: radioItemSelected({ value, selectedIndex, values }, item),
      })),
      marks: values
        .filter((item) => radioItemSelected({ value, selectedIndex, values }, item))
        .map((item) => ({ index: item.index, present: true, generation: 0, initial: false })),
    },
  }
})

const synchronizeMarks = (model: Model) =>
  modifyFields(model, {
    marks: () =>
      checkboxMarks(
        model.marks,
        model.values.map((item) => ({
          index: item.index,
          checked: radioItemSelected(model, item),
        })),
        model.generation + 1,
      ),
    generation: Number.increment,
  })

const select = (model: Model, index: number) => ({
  model,
  outMessage: OutMessage.Selected({
    index,
    value: model.values.find((item) => item.index === index)?.value ?? Option.none(),
  }),
})

const update = RadioGroupComposition.makeUpdate({
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
      initialChecked: () =>
        model.values.map((item) => ({
          index: item.index,
          checked: radioItemSelected(model, item),
        })),
      marks: () =>
        model.values
          .filter((item) => radioItemSelected(model, item))
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
  CapturedEntryFocus: RadioGroupBlock.makeNoopStep(),
  CapturedItems: (model, { items }) => ({ model: modifyFields(model, { items: () => items }) }),
  CapturedFocus: RadioGroupBlock.makeStep(
    (model, { index, visible }: typeof Message.CapturedFocus.Type) =>
      Update.combineSteps([
        RadioGroupBlock.makeFieldsStep(() => ({
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
  CapturedBlur: RadioGroupBlock.makeStep((model, { inside }: typeof Message.CapturedBlur.Type) =>
    inside
      ? RadioGroupBlock.makeNoopStep()
      : Update.combineSteps([
          RadioGroupBlock.makeFieldsStep(() => ({
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
  CapturedReset: RadioGroupBlock.makeNoopStep(),
  CapturedClick: (model, { index }) => select(model, index),
  CapturedKey: (model, { index, key }) => {
    if (key === ' ' || key === 'Enter') {
      return select(model, index)
    }

    const target = selectionTarget(model.items, index, key, true)

    return target
      ? { model, commands: [FocusRow({ id: model.id, index: target.index })] }
      : { model }
  },
  CompletedFocus: RadioGroupBlock.makeNoopStep(),
  CompletedFocusExit: (model, { generation }) => ({
    model:
      Option.isSome(model.focusSlot) &&
      !model.focusSlot.value.present &&
      model.focusSlot.value.generation === generation
        ? modifyFields(model, { focusSlot: () => Option.none() })
        : model,
  }),
})

const inMessageUpdate = RadioGroupComposition.makeInMessageUpdate({
  RequestedHoverMode: RadioGroupBlock.makeStep.fromMessage(
    ({ mode }: typeof InMessage.RequestedHoverMode.Type) =>
      Hover.requestConfigure({
        options: { mode, axis: 'y', nearest: false, gapClick: true, maxDistance: Infinity },
      }),
  ),
  RequestedSelection: (model, { value, selectedIndex }) => ({
    model: synchronizeMarks(
      modifyFields(model, {
        value: () => Option.fromUndefinedOr(value),
        selectedIndex: () => Option.fromUndefinedOr(selectedIndex),
      }),
    ),
  }),
  RequestedItems: (model, { items }) => ({
    model: synchronizeMarks(modifyFields(model, { values: () => radioItemValues(items) })),
  }),
})

export interface RadioGroupViewInputs extends Presentation {
  readonly content: (
    context: RadioContext<ChildAttribute<Mount.RequirementsOf<typeof ObserveRows>>>,
  ) => ReadonlyArray<Html>
  readonly animate: (node: Html, options: TargetMotionOptions) => Html
  readonly animateHighlight: HoverHighlightViewInputs['animate']
  readonly className?: string
  readonly attributes?: ReadonlyArray<ChildAttribute>
}

const view = RadioGroupComposition.makeView.withInputs<RadioGroupViewInputs>((model, inputs, h) => {
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

  const selectedRect = rectAt(model.hover.itemRects, radioSelectedIndex(model))

  const selectedPill = selectedRect
    ? inputs.animate(h.div([h.Class(cn('absolute bg-active pointer-events-none', shape.bg))]), {
        initial: false,
        animate: { ...selectedRect, opacity: 1 },
        transition: { ...spring.moderate, opacity: { duration: 0.08 } },
        reducedMotion,
      })
    : null

  const context: RadioContext<ChildAttribute<Mount.RequirementsOf<typeof ObserveRows>>> = {
    ...Struct.pick(inputs, ['shape', 'size', 'surface']),
    animate: inputs.animate,
    context: createPresentationContext({
      ...inputs,
      hasSizeProvider: inputs.size !== undefined || presentation.hasSizeProvider,
    }),
    id: model.id,
    values: model.values,
    value: model.value,
    selectedIndex: model.selectedIndex,
    hasSelection: radioHasSelection(model),
    hasForm: model.hasForm,
    initialChecked: model.initialChecked,
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
            h.Role('radiogroup'),
            h.DataAttribute('slot', 'fluid-selection-group'),
            h.Class(cn('relative flex flex-col w-72 max-w-full select-none', inputs.className)),
          ]),
          ...(inputs.attributes ?? []),
        ],
        content: () => [
          selectedPill,
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
})

export const layer = RadioGroupBlock.makeLayer({
  init,
  update,
  inMessageUpdate,
  view,
  EffectsLayer: Layer.mergeAll(ObserveRows.layer, FocusRow.layer).pipe(
    Layer.provide(GroupObserverRootsLayer),
  ),
}).pipe(Layer.provide(Layer.mergeAll(HoverLayer, HighlightLayer)))

export { RadioItem } from './radio-group-parts.js'

export type { RadioContext, RadioItemProps } from './radio-group-parts.js'

export const test = { FocusRow, ObserveRows }

export const hoverModeOf = (model: typeof RadioGroupBlock.Model.Type) => model.hover.mode
