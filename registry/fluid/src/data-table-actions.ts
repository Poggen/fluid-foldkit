import { Effect, Layer, Option, Schema } from 'effect'
import { Block, Update } from 'foldkit'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import { ContextMenuBlock, layer as ContextMenuLayer } from './context-menu.js'
import { CommandMenuDialogBlock, CommandMenuDialogLayer } from './command-menu-dialog.js'
import { CommandMenuItem } from './command-menu.js'
import { DialogBlock, DialogLayer } from './dialog.js'
import type { DialogResources } from './dialog.js'
import type { DropdownResources } from './dropdown-resources.js'
import { createMotionScope } from './motion.js'
import { makeDataTableActionsView } from './data-table-actions-view.js'
import type { DataTableActionsViewInputs } from './data-table-actions-view.js'
import { observeDataTableActionTargets } from './data-table-actions-observation.js'

export const DataTableAction = Schema.Struct({
  ...CommandMenuItem.fields,
  destructive: Schema.optionalKey(Schema.Boolean),
})
export type DataTableAction = typeof DataTableAction.Type
export const defaultRowActions: ReadonlyArray<DataTableAction> = [
  { value: 'select', label: 'Select row' },
  { value: 'delete', label: 'Delete row', destructive: true },
]
export const defaultSelectionActions: ReadonlyArray<DataTableAction> = [
  { value: 'delete', label: 'Delete selected rows', destructive: true },
]
export const DataTableActionsConfig = Schema.Struct({
  id: Schema.String,
  rowActions: Schema.optionalKey(Schema.Array(DataTableAction)),
  selectionActions: Schema.optionalKey(Schema.Array(DataTableAction)),
  selectedIds: Schema.optionalKey(Schema.Array(Schema.String)),
  disabled: Schema.optionalKey(Schema.Boolean),
  selectable: Schema.optionalKey(Schema.Boolean),
})
export type DataTableActionsConfig = typeof DataTableActionsConfig.Type
export const Message = defineMessageUnion({
  RowTargeted: { id: Schema.String },
  SelectionCleared: {},
  OpenedPalette: {},
  RetiredPalette: {},
  MoveConfirmed: {},
  MoveCancelled: {},
})
const OutMessage = defineMessageUnion({
  ActionSelected: { action: Schema.String, ids: Schema.Array(Schema.String) },
  MoveConfirmed: {},
  MoveCancelled: {},
})
const InMessage = defineInMessageUnion({
  RequestedConfirmMove: { open: Schema.Boolean },
  RequestedConfigure: {
    selectedIds: Schema.Array(Schema.String),
    disabled: Schema.Boolean,
    selectable: Schema.Boolean,
  },
})
const DataTableActionsNamespace = Block.makeNamespace('DataTableActions')
export const RetirePalette = DataTableActionsNamespace.makeCommand('RetirePalette', {
  messages: [Message.RetiredPalette],
  *handler() {
    return () => Effect.succeed(Message.RetiredPalette())
  },
})
const ObserveTargets = DataTableActionsNamespace.makeMountStream('ObserveTargets', {
  messages: [Message.RowTargeted],
  *handler() {
    return observeDataTableActionTargets
  },
})
export const DataTableActionsKey = Symbol('DataTableActions')
export const DataTableActionsBlock = Block.make(DataTableActionsNamespace, {
  key: DataTableActionsKey,
  Model: Schema.Struct({
    id: Schema.String,
    targetId: Schema.OptionFromNullOr(Schema.String),
    selectedIds: Schema.Array(Schema.String),
    shownCount: Schema.Natural,
    disabled: Schema.Boolean,
    selectable: Schema.Boolean,
    rowActions: Schema.Array(DataTableAction),
    selectionActions: Schema.Array(DataTableAction),
    context: ContextMenuBlock.Model,
    palette: CommandMenuDialogBlock.Model,
    confirmation: DialogBlock.Model,
  }),
  Message,
  InMessage,
  OutMessage,
  InitArgs: Schema.Tuple([DataTableActionsConfig]),
  ChildInitContext: DataTableActionsConfig,
  effects: Block.makeEffectsContract<never, DropdownResources | DialogResources>(),
  view: {
    kind: 'Element',
    Inputs: Block.makeInputContract<DataTableActionsViewInputs>(),
    mounts: [ObserveTargets],
  },
})
const Context = DataTableActionsBlock.makeRequiredFieldBinding(ContextMenuBlock, {
  field: 'context',
  init: {
    contextToArgs: (config: DataTableActionsConfig) => [
      {
        id: `${config.id}-context`,
        disabled: config.disabled === true || (config.rowActions ?? defaultRowActions).length === 0,
      },
    ],
  },
}).withOutMessagePolicy({
  fold: DataTableActionsBlock.makeOutMessageFold(ContextMenuBlock, {
    Events: ({ events }) =>
      DataTableActionsBlock.makeStep((model) => {
        const selected = events.find((event) => event._tag === 'Selected')
        const action = selected?._tag === 'Selected' ? model.rowActions[selected.index] : undefined
        const ids = Option.isSome(model.targetId) ? [model.targetId.value] : []
        return model.disabled ||
          action === undefined ||
          action.disabled ||
          ids.length === 0 ||
          (action.value === 'select' && !model.selectable)
          ? { model }
          : Update.withOutMessage(
              { model },
              OutMessage.ActionSelected({ action: action.action ?? action.value, ids }),
            )
      }),
  }),
})
const RawPalette = DataTableActionsBlock.makeRequiredFieldBinding(CommandMenuDialogBlock, {
  field: 'palette',
  init: {
    contextToArgs: (config: DataTableActionsConfig) => [
      {
        id: `${config.id}-palette`,
        items: config.selectionActions ?? defaultSelectionActions,
        shortcut:
          !config.disabled &&
          (config.selectedIds?.length ?? 0) > 0 &&
          (config.selectionActions ?? defaultSelectionActions).length > 0
            ? 'mod+k'
            : null,
        shortcutScopeId: config.id,
      },
    ],
  },
})
const Palette = RawPalette.withOutMessagePolicy({
  fold: DataTableActionsBlock.makeOutMessageFold(CommandMenuDialogBlock, {
    OpenChanged: () => DataTableActionsBlock.makeNoopStep(),
    QueryChanged: () => DataTableActionsBlock.makeNoopStep(),
    Selected: ({ item }) =>
      DataTableActionsBlock.makeStep((model) =>
        model.disabled || item.disabled || model.selectedIds.length === 0
          ? { model }
          : Update.withOutMessage(
              { model },
              OutMessage.ActionSelected({
                action: item.action ?? item.value,
                ids: model.selectedIds,
              }),
            ),
      ),
  }),
})
const Confirmation = DataTableActionsBlock.makeRequiredFieldBinding(DialogBlock, {
  field: 'confirmation',
  init: {
    contextToArgs: (config: DataTableActionsConfig) => [
      { id: `${config.id}-confirm-move`, open: false },
    ],
  },
}).withOutMessagePolicy({
  fold: DataTableActionsBlock.makeOutMessageFold(DialogBlock, {
    CompletedClose: () => DataTableActionsBlock.makeNoopStep(),
    OpenChanged: ({ open }) =>
      DataTableActionsBlock.makeStep((model) =>
        open ? { model } : Update.withOutMessage({ model }, OutMessage.MoveCancelled()),
      ),
  }),
})
export const DataTableActionsComposition = DataTableActionsBlock.makeComposition({
  bindings: [Context, Palette, Confirmation],
  mounts: [ObserveTargets],
})
export const DataTableActionsConfirmation = Confirmation
export const DataTableActionsContext = Context
export const DataTableActionsPalette = Palette
export const DataTableActionsObserveTargets = ObserveTargets
const init = DataTableActionsComposition.makeInit((config) => ({
  childInitContext: config,
  model: {
    id: config.id,
    targetId: Option.none(),
    selectedIds: config.selectedIds ?? [],
    shownCount: config.selectedIds?.length ?? 0,
    disabled: config.disabled ?? false,
    selectable: config.selectable ?? true,
    rowActions: config.rowActions ?? defaultRowActions,
    selectionActions: config.selectionActions ?? defaultSelectionActions,
  },
}))
const update = DataTableActionsComposition.makeUpdate({
  MoveConfirmed: DataTableActionsBlock.makeStep((model) =>
    model.disabled || !model.confirmation.isOpen
      ? { model }
      : Update.withOutMessage({ model }, OutMessage.MoveConfirmed()),
  ),
  MoveCancelled: DataTableActionsBlock.makeStep((model) =>
    !model.confirmation.isOpen
      ? { model }
      : Update.withOutMessage({ model }, OutMessage.MoveCancelled()),
  ),
  RetiredPalette: RawPalette.requestClose(),
  OpenedPalette: DataTableActionsBlock.makeStep((model) =>
    model.disabled || model.selectedIds.length === 0 || model.selectionActions.length === 0
      ? DataTableActionsBlock.makeNoopStep()
      : Palette.requestOpen(),
  ),
  RowTargeted: DataTableActionsBlock.makeFieldsStep(
    (_model, { id }: typeof Message.RowTargeted.Type) => ({ targetId: () => Option.some(id) }),
  ),
  SelectionCleared: DataTableActionsBlock.makeStep((model) =>
    Update.withOutMessage(
      { model },
      OutMessage.ActionSelected({ action: 'clear-selection', ids: model.selectedIds }),
    ),
  ),
})
const inMessageUpdate = DataTableActionsComposition.makeInMessageUpdate({
  RequestedConfirmMove: DataTableActionsBlock.makeStep(
    (_model, { open }: typeof InMessage.RequestedConfirmMove.Type) =>
      Confirmation.requestControlledOpen({ control: Option.some(open) }),
  ),
  RequestedConfigure: DataTableActionsBlock.makeStep(
    (model, config: typeof InMessage.RequestedConfigure.Type) =>
      Update.combineSteps([
        DataTableActionsBlock.makeFieldsStep(() => ({
          selectedIds: () => config.selectedIds,
          shownCount: (count) => config.selectedIds.length || count,
          disabled: () => config.disabled,
          selectable: () => config.selectable,
        })),
        DataTableActionsBlock.makeCommandsStep(() =>
          (config.disabled || config.selectedIds.length === 0) && model.palette.dialog.isOpen
            ? [RetirePalette()]
            : [],
        ),
        Context.requestDisabled({ disabled: config.disabled || model.rowActions.length === 0 }),
        Palette.requestShortcut({
          shortcut:
            config.disabled ||
            config.selectedIds.length === 0 ||
            model.selectionActions.length === 0
              ? Option.none()
              : Option.some('mod+k'),
        }),
      ]),
  ),
})
export const DataTableActionsLayer = DataTableActionsBlock.makeLayer(
  Effect.gen(function* () {
    const children = yield* DataTableActionsComposition.acquireChildren()
    const motion = createMotionScope('DataTableActions')
    yield* Layer.build(motion.layer)
    return {
      children,
      init,
      update,
      inMessageUpdate,
      view: makeDataTableActionsView(motion),
      EffectsLayer: Layer.merge(ObserveTargets.layer, RetirePalette.layer),
    }
  }),
).pipe(Layer.provide(Layer.mergeAll(ContextMenuLayer, CommandMenuDialogLayer, DialogLayer)))
