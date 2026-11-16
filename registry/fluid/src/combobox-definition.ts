import { Layer, Option, Predicate, Schema, Stream } from 'effect'
import { Block, Update } from 'foldkit'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import { ComboboxChip, ChipMeasurement } from './combobox-chips.js'
import { SelectOption } from './select.js'
import { ComboboxPopupBlock, layer as PopupLayer } from './combobox-popup.js'
import type { ComboboxPopupConfig } from './combobox-popup.js'
import { ComboboxFieldEvent, observeComboboxField } from './combobox-field.js'
import { HoverBlock, HoverMode, layer as HoverLayer } from './hover.js'
import { HoverHighlightBlock, layer as HighlightLayer } from './hover-highlight.js'
import { SelectionBackgroundsBlock, layer as SelectionLayer } from './selection-backgrounds.js'
import { ScrollAreaBlock, layer as ScrollLayer } from './scroll-area.js'
import type { ComboboxViewInputs } from './combobox-view.js'
import type { DialogResources } from './dialog-resources.js'
export interface ComboboxConfig {
  readonly hoverMode?: HoverMode
  readonly id: string
  readonly items: ReadonlyArray<SelectOption>
  readonly multiple?: boolean
  readonly value?: string | ReadonlyArray<string> | null
  readonly defaultValue?: string | ReadonlyArray<string>
  readonly disabled?: boolean
  readonly hideSelected?: boolean
  readonly allowCreate?: boolean
  readonly rootId?: string
  readonly parentId?: string
}
export const comboboxValues = (value: ComboboxConfig['value']): ReadonlyArray<string> => {
  if (!Predicate.isString(value)) {
    return value ?? []
  }
  return value === '' ? [] : [value]
}
export const Model = Schema.Struct({
  id: Schema.String,
  items: Schema.Array(SelectOption),
  values: Schema.Array(Schema.String),
  initialValues: Schema.Array(Schema.String),
  controlled: Schema.Boolean,
  multiple: Schema.Boolean,
  disabled: Schema.Boolean,
  hideSelected: Schema.Boolean,
  allowCreate: Schema.Boolean,
  chips: Schema.Array(ComboboxChip),
  chipGeneration: Schema.Natural,
  fieldHeight: Schema.OptionFromNullOr(Schema.Finite),
  fieldWidth: Schema.Finite,
  query: Schema.String,
  closingQuery: Schema.OptionFromNullOr(Schema.String),
  openingLast: Schema.Boolean,
  open: Schema.Boolean,
  activeIndex: Schema.OptionFromNullOr(Schema.Int),
  visibleValues: Schema.Array(Schema.String),
  popup: ComboboxPopupBlock.Model,
  hover: HoverBlock.Model,
  highlight: HoverHighlightBlock.Model,
  selection: SelectionBackgroundsBlock.Model,
  scroll: ScrollAreaBlock.Model,
})

export type Model = typeof Model.Type
export const Message = defineMessageUnion({
  OpenedByField: {},
  Navigated: ComboboxFieldEvent.Navigated.fields,
  ClosedByField: {},
  RequestedReset: {},
  Activated: ComboboxFieldEvent.Activated.fields,
  Entered: {},
  Committed: { value: Schema.String },
  Removed: ComboboxFieldEvent.Removed.fields,
  Backspaced: ComboboxFieldEvent.Backspaced.fields,
  Inputted: { query: Schema.String },
  Cleared: {},
  MeasuredChips: {
    height: Schema.Finite,
    width: Schema.Finite,
    chips: Schema.Array(ChipMeasurement),
  },
  ChipExited: { value: Schema.String, generation: Schema.Natural },
})
export const OutMessage = defineMessageUnion({
  Selected: { value: Schema.OptionFromNullOr(Schema.String) },
  ValuesChanged: { values: Schema.Array(Schema.String) },
  CreateRequested: { query: Schema.String },
})
export const InMessage = defineInMessageUnion({
  RequestedHoverMode: { mode: HoverMode },
  RequestedOpen: {},
  RequestedClose: {},
  RequestedConfigure: {
    multiple: Schema.optionalKey(Schema.Boolean),
    items: Schema.Array(SelectOption),
    value: Schema.optionalKey(
      Schema.NullOr(Schema.Union([Schema.String, Schema.Array(Schema.String)])),
    ),
    disabled: Schema.optionalKey(Schema.Boolean),
    hideSelected: Schema.optionalKey(Schema.Boolean),
    allowCreate: Schema.optionalKey(Schema.Boolean),
  },
  RequestedAcceptCreated: { item: SelectOption },
})
const effects = Block.makeEffectsContract<never, DialogResources>()
export const ComboboxKey = Symbol('Combobox')
export const ComboboxBlock = Block.make('Combobox', {
  key: ComboboxKey,
  Model,
  Message,
  InMessage,
  OutMessage,
  InitArgs: Schema.Tuple([
    Schema.Struct({
      hoverMode: Schema.optionalKey(HoverMode),
      id: Schema.String,
      items: Schema.Array(SelectOption),
      multiple: Schema.optionalKey(Schema.Boolean),
      value: Schema.optionalKey(
        Schema.NullOr(Schema.Union([Schema.String, Schema.Array(Schema.String)])),
      ),
      defaultValue: Schema.optionalKey(Schema.Union([Schema.String, Schema.Array(Schema.String)])),
      disabled: Schema.optionalKey(Schema.Boolean),
      hideSelected: Schema.optionalKey(Schema.Boolean),
      allowCreate: Schema.optionalKey(Schema.Boolean),
      rootId: Schema.optionalKey(Schema.String),
      parentId: Schema.optionalKey(Schema.String),
    }),
  ]),
  view: { kind: 'Element', Inputs: Block.makeInputContract<ComboboxViewInputs>() },
  effects,
  inMessageOutputs: {
    RequestedAcceptCreated: {
      outMessage: Schema.Union([OutMessage.Selected, OutMessage.ValuesChanged]),
    },
  },
})
export const Definition = ComboboxBlock
export const dependencies = Layer.mergeAll(
  PopupLayer,
  HoverLayer,
  HighlightLayer,
  SelectionLayer,
  ScrollLayer,
)
export const Highlight = Definition.makeRequiredFieldBinding(HoverHighlightBlock, {
  field: 'highlight',
  init: {
    contextToArgs: (config: ComboboxConfig) => [
      { id: `${config.id}-highlight`, mode: config.hoverMode ?? 'fluid' },
    ],
  },
})
export const Selection = Definition.makeRequiredFieldBinding(SelectionBackgroundsBlock, {
  field: 'selection',
  init: {
    contextToArgs: (config: ComboboxConfig) => [
      { id: `${config.id}-selection`, indices: [], radius: 8 },
    ],
  },
})
export const Scroll = Definition.makeRequiredFieldBinding(ScrollAreaBlock, {
  field: 'scroll',
  init: { contextToArgs: (config: ComboboxConfig) => [{ id: `${config.id}-scroll` }] },
}).withOutMessagePolicy({
  fold: Definition.makeOutMessageFold(ScrollAreaBlock, { Scrolled: Definition.makeNoopStep }),
})
export const Hover = Definition.makeRequiredFieldBinding(HoverBlock, {
  field: 'hover',
  init: {
    contextToArgs: (config: ComboboxConfig) => [
      { id: `${config.id}-hover`, mode: config.hoverMode ?? 'fluid' },
    ],
  },
}).withOutMessagePolicy({
  fold: Definition.makeOutMessageFold(HoverBlock, {
    Changed: (snapshot) =>
      Definition.makeStep((model) =>
        Update.combineSteps([
          Definition.makeFieldsStep(() => ({
            activeIndex: () => Option.fromNullishOr(snapshot.activeIndex),
          })),
          Highlight.informOfSource({ snapshot, hidden: false, mode: model.hover.mode }),
          Selection.informOfGeometry({ itemRects: snapshot.itemRects, radius: 8 }),
        ]),
      ),
  }),
})
const RawPopup = Definition.makeRequiredFieldBinding(ComboboxPopupBlock, {
  field: 'popup',
  init: {
    contextToArgs: (config: ComboboxConfig) => {
      const initial = {
        id: `${config.id}-popup`,
        anchorId: `${config.id}-field`,
      } satisfies ComboboxPopupConfig
      const rooted = config.rootId === undefined ? initial : { ...initial, rootId: config.rootId }
      return [config.parentId === undefined ? rooted : { ...rooted, parentId: config.parentId }]
    },
  },
})
export const restQuery = (model: Model, values = model.values): string =>
  model.multiple ? '' : (model.items.find((item) => item.value === values[0])?.label ?? '')
export const comboboxFilterQuery = (model: Model): string =>
  !model.multiple && model.query === restQuery(model) ? '' : model.query
export const closeCombobox = (closingQuery?: string) =>
  Update.combineSteps([
    Definition.makeFieldsStep((model) => ({
      open: () => false,
      query: () => restQuery(model),
      closingQuery: () =>
        model.open ? Option.some(closingQuery ?? comboboxFilterQuery(model)) : model.closingQuery,
      activeIndex: () => Option.none(),
    })),
    RawPopup.requestVisibility({ open: false }),
    Highlight.requestHide(),
    Hover.requestHighlight({ index: null }),
    Selection.requestSelection({ indices: [] }),
  ])
export const Popup = RawPopup.withOutMessagePolicy({
  fold: Definition.makeOutMessageFold(ComboboxPopupBlock, {
    Dismissed: () => closeCombobox(),
    RowsChanged: ({ values }) =>
      Definition.makeStep((model) => {
        const first = values.findIndex(
          (value) =>
            value === '\u0000create' ||
            model.items.find((item) => item.value === value)?.disabled !== true,
        )
        const last = values.findLastIndex(
          (value) =>
            value === '\u0000create' ||
            model.items.find((item) => item.value === value)?.disabled !== true,
        )
        const selected = values.findIndex(
          (value) =>
            model.values.includes(value) &&
            model.items.find((item) => item.value === value)?.disabled !== true,
        )
        let choice = first
        if (model.openingLast) {
          choice = last
        } else if (model.query === restQuery(model) && selected !== -1) {
          choice = selected
        }
        const active = model.open && choice >= 0 ? choice : null
        return Update.combineSteps([
          Definition.makeFieldsStep(() => ({
            visibleValues: () => values,
            activeIndex: () => Option.fromNullishOr(active),
            openingLast: () => false,
          })),
          Hover.requestHighlight({ index: active }),
          Selection.requestSelection({
            indices: model.open
              ? values.flatMap((value, index) => (model.values.includes(value) ? [index] : []))
              : [],
          }),
        ])
      }),
  }),
})
export const ObserveField = Definition.makeMountStream('ObserveField', {
  args: { id: Schema.String },
  messages: [
    Message.MeasuredChips,
    Message.ChipExited,
    Message.OpenedByField,
    Message.Navigated,
    Message.ClosedByField,
    Message.RequestedReset,
    Message.Activated,
    Message.Entered,
    Message.Removed,
    Message.Backspaced,
  ],
  *handler() {
    return ({ element, viewStateChanges, id }) =>
      observeComboboxField(element, viewStateChanges, id).pipe(
        Stream.map((event) =>
          ComboboxFieldEvent.match(event, {
            RequestedOpen: () => Message.OpenedByField(),
            RequestedClose: () => Message.ClosedByField(),
            RequestedReset: () => Message.RequestedReset(),
            Navigated: ({ key }) => Message.Navigated({ key }),
            Activated: ({ index }) => Message.Activated({ index }),
            MeasuredChips: ({ height, width, chips }) =>
              Message.MeasuredChips({ height, width, chips }),
            ChipExited: ({ value, generation }) => Message.ChipExited({ value, generation }),
            Entered: () => Message.Entered(),
            Removed: ({ value }) => Message.Removed({ value }),
            Backspaced: ({ renderedChipsCount }) => Message.Backspaced({ renderedChipsCount }),
          }),
        ),
      )
  },
})
export const Composition = Definition.makeComposition({
  bindings: [Popup, Hover, Highlight, Selection, Scroll],
  mounts: [ObserveField],
})
