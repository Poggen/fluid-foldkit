/* @license Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud. */
import { Effect, Layer, Option, Queue, Schema, Stream } from 'effect'
import { Block } from 'foldkit'
import type { ChildAttribute, Html } from 'foldkit/html'
import { HoverMode } from './hover.js'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import type { DialogResources } from './dialog.js'
import { DialogBlock, DialogLayer, DialogTitle, DialogDescription, isDialogOpen } from './dialog.js'
import type { dialogContract } from './dialog-definition.js'
import {
  CommandMenuBlock,
  CommandMenuLayer,
  CommandMenuConfig,
  CommandMenuItem,
} from './command-menu.js'
import type { CommandMenuViewInputs } from './command-menu.js'
import {
  CommandMenuDialogShortcuts,
  CommandMenuDialogShortcutsLayer,
} from './command-menu-dialog-shortcuts.js'

export { CommandMenuDialogShortcutsLayer } from './command-menu-dialog-shortcuts.js'

export const CommandMenuDialogConfig = Schema.Struct({
  ...CommandMenuConfig.fields,
  open: Schema.optionalKey(Schema.Boolean),
  defaultOpen: Schema.optionalKey(Schema.Boolean),
  modal: Schema.optionalKey(Schema.Boolean),
  shortcut: Schema.optionalKey(Schema.NullOr(Schema.String)),
  shortcutScopeId: Schema.optionalKey(Schema.String),
  closeOnSelect: Schema.optionalKey(Schema.Boolean),
  returnFocusSelector: Schema.optionalKey(Schema.String),
})

export type CommandMenuDialogConfig = typeof CommandMenuDialogConfig.Type

export interface CommandMenuDialogViewInputs extends CommandMenuViewInputs {
  readonly title?: string
  readonly description?: string
  readonly portalContainerId?: string
  readonly trigger?: (attributes: ReadonlyArray<ChildAttribute>) => Html
  readonly panelClassName?: string
}

const Model = Schema.Struct({
  dialog: DialogBlock.Model,
  menu: CommandMenuBlock.Model,
  shortcut: Schema.OptionFromNullOr(Schema.String),
  scopeId: Schema.String,
  closeOnSelect: Schema.Boolean,
})

const Message = defineMessageUnion({ ShortcutToggled: {}, ClosedAfterSelection: {} })

const InMessage = defineInMessageUnion({
  RequestedHoverMode: { mode: HoverMode },
  RequestedShortcut: { shortcut: Schema.OptionFromNullOr(Schema.String) },
  RequestedReturnFocus: { selector: Schema.OptionFromNullOr(Schema.String) },
  RequestedToggle: {},
  RequestedOpen: {},
  RequestedClose: {},
  RequestedControlledOpen: { control: Schema.OptionFromNullOr(Schema.Boolean) },
  RequestedConfigure: {
    items: Schema.Array(CommandMenuItem),
    query: Schema.OptionFromNullOr(Schema.String),
  },
})

const OutMessage = defineMessageUnion({
  OpenChanged: { open: Schema.Boolean },
  Selected: { item: CommandMenuItem },
  QueryChanged: { query: Schema.String },
})

const effects = Block.makeEffectsContract<never, DialogResources>()

const FluidCommandMenuDialogNamespace = Block.makeNamespace('FluidCommandMenuDialog')

const contract = {
  Model,
  Message,
  InMessage,
  OutMessage,
  InitArgs: Schema.Tuple([CommandMenuDialogConfig]),
  ChildInitContext: CommandMenuDialogConfig,
  view: {
    kind: 'Element',
    Inputs: Block.makeInputContract<CommandMenuDialogViewInputs>(),
  } satisfies { readonly kind: 'Element'; readonly Inputs: unknown },
  effects,
  inMessageOutputs: {
    RequestedOpen: { outMessage: OutMessage.OpenChanged },
    RequestedClose: { outMessage: OutMessage.OpenChanged },
    RequestedToggle: { outMessage: OutMessage.OpenChanged },
  },
}

const CloseAfterSelection = FluidCommandMenuDialogNamespace.makeCommand('CloseAfterSelection', {
  messages: [Message.ClosedAfterSelection],
  *handler() {
    return yield* Effect.succeed(() => Effect.succeed(Message.ClosedAfterSelection()))
  },
})

const Shortcut = FluidCommandMenuDialogNamespace.makeMountStream('Shortcut', {
  args: { shortcut: Schema.OptionFromNullOr(Schema.String), scopeId: Schema.String },
  messages: [Message.ShortcutToggled],
  *handler() {
    const shortcuts = yield* CommandMenuDialogShortcuts

    return ({ element, shortcut, scopeId, viewStateChanges }) =>
      viewStateChanges.pipe(
        Stream.switchMap((state) =>
          state !== 'Live' || Option.isNone(shortcut)
            ? Stream.never
            : Stream.callback<typeof Message.ShortcutToggled.Type>((queue) =>
                Effect.acquireRelease(
                  Effect.sync(() =>
                    shortcuts.register(element, shortcut.value, scopeId, () => {
                      Queue.offerUnsafe(queue, Message.ShortcutToggled())
                    }),
                  ),
                  (release) => Effect.sync(release),
                ),
              ),
        ),
      )
  },
})

const plans = <const Key extends symbol, const ChildKey extends symbol>(
  definition: ReturnType<typeof Block.make<'FluidCommandMenuDialog', Key, typeof contract>>,
  DialogChild: ReturnType<typeof Block.make<'FluidDialog', ChildKey, typeof dialogContract>>,
) => {
  const RawDialog = definition.makeRequiredFieldBinding(DialogChild, {
    field: 'dialog',
    init: {
      contextToArgs: (config: CommandMenuDialogConfig) => [
        { ...config, id: `${config.id}-dialog` },
      ],
    },
  })

  const Menu = definition
    .makeRequiredFieldBinding(CommandMenuBlock, {
      field: 'menu',
      init: { contextToArgs: (config: CommandMenuDialogConfig) => [config] },
    })
    .withOutMessagePolicy({
      fold: definition.makeOutMessageFold(CommandMenuBlock, {
        QueryChanged: ({ query }) =>
          definition.makeOutMessageStep(() => OutMessage.QueryChanged({ query })),
        Selected: ({ item }) =>
          definition.makeStep((model) => ({
            model,
            commands: model.closeOnSelect ? [CloseAfterSelection()] : [],
            outMessage: OutMessage.Selected({ item }),
          })),
      }),
    })

  const Dialog = RawDialog.withOutMessagePolicy({
    fold: definition.makeOutMessageFold(DialogChild, {
      CompletedClose: () => definition.makeStep(() => Menu.requestRetire()),
      OpenChanged: ({ open }) =>
        definition.makeOutMessageStep(() => OutMessage.OpenChanged({ open })),
    }),
  })

  const Composition = definition.makeComposition({ bindings: [Dialog, Menu], mounts: [Shortcut] })

  const init = Composition.makeInit((config: CommandMenuDialogConfig) => ({
    childInitContext: config,
    model: {
      shortcut: Option.fromNullOr(config.shortcut === undefined ? 'mod+k' : config.shortcut),
      scopeId: config.shortcutScopeId ?? '',
      closeOnSelect: config.closeOnSelect ?? true,
    },
  }))

  const update = Composition.makeUpdate({
    ShortcutToggled: RawDialog.requestToggle(),
    ClosedAfterSelection: RawDialog.requestClose(),
  })

  const inMessageUpdate = Composition.makeInMessageUpdate({
    RequestedHoverMode: definition.makeStep.fromMessage(
      ({ mode }: typeof InMessage.RequestedHoverMode.Type) => Menu.requestHoverMode({ mode }),
    ),
    RequestedShortcut: definition.makeFieldsStep(
      (_model, { shortcut }: typeof InMessage.RequestedShortcut.Type) => ({
        shortcut: () => shortcut,
      }),
    ),
    RequestedReturnFocus: definition.makeStep.fromMessage(
      ({ selector }: typeof InMessage.RequestedReturnFocus.Type) =>
        RawDialog.requestReturnFocus({ selector }),
    ),
    RequestedToggle: RawDialog.requestToggle(),
    RequestedOpen: RawDialog.requestOpen(),
    RequestedClose: RawDialog.requestClose(),
    RequestedControlledOpen: definition.makeStep.fromMessage(
      ({ control }: typeof InMessage.RequestedControlledOpen.Type) =>
        RawDialog.requestControlledOpen({ control }),
    ),
    RequestedConfigure: definition.makeStep.fromMessage(
      ({ items, query }: typeof InMessage.RequestedConfigure.Type) =>
        Menu.requestConfigure({ items, query }),
    ),
  })

  const view = Composition.makeView.withInputs((model, inputs, h) =>
    h.div(
      [h.Class('contents'), h.DataAttribute('command-open', String(isDialogOpen(model.dialog)))],
      [
        h.block(
          Dialog.embedView({
            slotId: 'dialog',
            model: model.dialog,
            viewInputs: {
              ...inputs,
              size: 'lg',
              position: 'top',
              hasDescription: true,
              showCloseButton: false,
              contentClassName: `top-[max(12dvh,calc(50dvh-220px))] flex max-h-[min(440px,76dvh)] flex-col overflow-hidden p-0 ${inputs.panelClassName ?? ''}`,
              content: (context) => [
                DialogTitle(
                  {
                    dialogId: context.id,
                    className: 'sr-only',
                    children: [inputs.title ?? 'Command menu'],
                  },
                  h,
                ),
                DialogDescription(
                  {
                    dialogId: context.id,
                    className: 'sr-only',
                    children: [inputs.description ?? 'Search for a command to run.'],
                  },
                  h,
                ),
                h.block(
                  Menu.embedView({
                    slotId: 'menu',
                    model: model.menu,
                    viewInputs: { ...inputs, inDialog: true, ...context.presentation },
                  }),
                ),
              ],
            },
          }),
        ),

        h.span(
          [
            h.Key(JSON.stringify([Option.getOrNull(model.shortcut), model.scopeId])),
            h.Class('hidden'),
            h.DataAttribute('command-open', String(isDialogOpen(model.dialog))),
            h.OnMount(Shortcut({ shortcut: model.shortcut, scopeId: model.scopeId })),
          ],
          [],
        ),
      ],
    ),
  )

  return {
    init,
    update,
    inMessageUpdate,
    view,
    EffectsLayer: Layer.merge(Shortcut.layer, CloseAfterSelection.layer).pipe(
      Layer.provide(CommandMenuDialogShortcutsLayer),
    ),
  }
}

export const CommandMenuDialogKey = Symbol('CommandMenuDialog')

export const CommandMenuDialogBlock = Block.make(FluidCommandMenuDialogNamespace, {
  key: CommandMenuDialogKey,
  ...contract,
})

export const CommandMenuDialogLayer = CommandMenuDialogBlock.makeLayer(
  plans(CommandMenuDialogBlock, DialogBlock),
).pipe(Layer.provide(Layer.mergeAll(DialogLayer, CommandMenuLayer)))

export const hoverModeOf = (model: typeof CommandMenuDialogBlock.Model.Type) =>
  model.menu.hover.mode
