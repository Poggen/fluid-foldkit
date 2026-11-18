/* @license Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud. */
import { Layer, Option } from 'effect'
import { Update } from 'foldkit'
import {
  createDropdownComposition,
  Observe,
  ObserveTrigger,
  FocusTarget,
  FinishExit,
  ClearTypeahead,
  DelayHover,
} from './dropdown-composition.js'
import type {
  DropdownDeclared,
  DropdownConfigSchema,
  Config,
  SubConfigSchema,
  Model,
  Message,
} from './dropdown-composition.js'
import { dropdownView } from './dropdown-view.js'

const dropdownUpdate: <const Key extends symbol, ConfigSchema extends DropdownConfigSchema>(
  runtime: DropdownRuntime<Key, ConfigSchema>,
  handlers: DropdownHandlers<Key, ConfigSchema>,
) => ReturnType<typeof runtime.Composition.makeUpdate<DropdownOutputs<Key, ConfigSchema>>> =
  function dropdownUpdate<const Key extends symbol, ConfigSchema extends DropdownConfigSchema>(
    runtime: DropdownRuntime<Key, ConfigSchema>,
    handlers: DropdownHandlers<Key, ConfigSchema>,
  ) {
    return runtime.Composition.makeUpdate<DropdownOutputs<Key, ConfigSchema>>(
      handlers,
    ) satisfies ReturnType<
      typeof runtime.Composition.makeUpdate<DropdownOutputs<Key, ConfigSchema>>
    >
  }

const dropdownInMessageUpdate: <
  const Key extends symbol,
  ConfigSchema extends DropdownConfigSchema,
>(
  runtime: DropdownRuntime<Key, ConfigSchema>,
  handlers: DropdownHandlers<Key, ConfigSchema>,
) => ReturnType<
  typeof runtime.Composition.makeInMessageUpdate<DropdownInMessageOutputs<Key, ConfigSchema>>
> = function dropdownInMessageUpdate<
  const Key extends symbol,
  ConfigSchema extends DropdownConfigSchema,
>(runtime: DropdownRuntime<Key, ConfigSchema>, handlers: DropdownHandlers<Key, ConfigSchema>) {
  return runtime.Composition.makeInMessageUpdate<DropdownInMessageOutputs<Key, ConfigSchema>>(
    dropdownInMessageHandlers(runtime, handlers),
  ) satisfies ReturnType<
    typeof runtime.Composition.makeInMessageUpdate<DropdownInMessageOutputs<Key, ConfigSchema>>
  >
}

const dropdownBehaviorPlans: <const Key extends symbol, ConfigSchema extends DropdownConfigSchema>(
  runtime: DropdownRuntime<Key, ConfigSchema>,
) => BehaviorChannels<Key, ConfigSchema> = function dropdownBehaviorPlans<
  const Key extends symbol,
  ConfigSchema extends DropdownConfigSchema,
>(runtime: DropdownRuntime<Key, ConfigSchema>) {
  const handlers = dropdownHandlers(runtime)

  return {
    update: dropdownUpdate(runtime, handlers),
    inMessageUpdate: dropdownInMessageUpdate(runtime, handlers),
    view: dropdownView<Key, ConfigSchema>(runtime),
    EffectsLayer: dropdownEffectsLayer(),
  } satisfies BehaviorChannels<Key, ConfigSchema>
}

/** Root initialization is authored against its concrete required Config schema. */
export const dropdownPlans: <const Key extends symbol>(
  block: DropdownDeclared<Key>,
  inline: boolean,
) => DropdownPlans<Key> = function dropdownPlans<const Key extends symbol>(
  block: DropdownDeclared<Key>,
  inline: boolean,
) {
  const runtime = createDropdownComposition<Key, typeof Config>(block)
  const init = dropdownRootInit(runtime, inline)

  return {
    init,
    ...dropdownBehaviorPlans<Key, typeof Config>(runtime),
  } satisfies DropdownPlans<Key>
}

/** Submenu initialization retains required rootId and parentId at the public boundary. */
export const dropdownSubPlans: <const Key extends symbol>(
  block: DropdownDeclared<Key, typeof SubConfigSchema>,
) => DropdownSubPlans<Key> = function dropdownSubPlans<const Key extends symbol>(
  block: DropdownDeclared<Key, typeof SubConfigSchema>,
) {
  const runtime = createDropdownComposition<Key, typeof SubConfigSchema>(block)
  const init = dropdownSubInit(runtime)

  return {
    init,
    ...dropdownBehaviorPlans<Key, typeof SubConfigSchema>(runtime),
  } satisfies DropdownSubPlans<Key>
}

type DropdownRuntime<Key extends symbol, ConfigSchema extends DropdownConfigSchema> = ReturnType<
  typeof createDropdownComposition<Key, ConfigSchema>
>

function dropdownHandlers<const Key extends symbol, ConfigSchema extends DropdownConfigSchema>(
  runtime: DropdownRuntime<Key, ConfigSchema>,
) {
  const {
    Definition: FluidDropdownDefinition,
    Controller,
    Hover,
    Highlight,
    Selected,
    Focus,
    Selection,
  } = runtime

  return {
    Mounted: Controller.informOfMount(),
    RequestedHideOverlays: FluidDropdownDefinition.makeStep(() =>
      Update.combineSteps([
        FluidDropdownDefinition.makeFieldsStep(() => ({ overlaysHidden: () => true })),
        Hover.requestClear(),
        Highlight.requestHide(),
        Selected.requestHide(),
        Focus.requestHide(),
        Selection.requestSelection({ indices: [] }),
      ]),
    ),
    ClickedSubTrigger: FluidDropdownDefinition.makeStep((model) =>
      model.controller.disabled
        ? FluidDropdownDefinition.makeNoopStep()
        : Controller.requestOpen({ open: model.controller.phase !== 'open' }),
    ),
    ClickedTrigger: FluidDropdownDefinition.makeStep(
      (model, { withinHoverAdmission }: typeof Message.ClickedTrigger.Type) =>
        model.controller.disabled ||
        (withinHoverAdmission &&
          model.controller.phase === 'open' &&
          model.controller.openedByHover)
          ? FluidDropdownDefinition.makeNoopStep()
          : Controller.requestOpen({ open: model.controller.phase !== 'open' }),
    ),
    HoveredTrigger: FluidDropdownDefinition.makeStep(
      (_model, { over, openOnHover }: typeof Message.HoveredTrigger.Type) =>
        Controller.requestTriggerHover({ over, openOnHover: openOnHover ?? false }),
    ),
    CompletedHover: FluidDropdownDefinition.makeStep(
      (_model, { generation }: typeof Message.CompletedHover.Type) =>
        Controller.informOfHoverCompletion({ generation }),
    ),
    HeldSubmenu: FluidDropdownDefinition.makeStep(
      (model, { index, open }: Omit<typeof Message.HeldSubmenu.Type, '_tag'>) => {
        const held = open
          ? Option.some(index)
          : model.controller.heldIndex.pipe(Option.filter((current) => current !== index))

        return Update.combineSteps([
          Controller.requestSubmenuHold({ index, open }),
          Hover.requestPointerHandlers({ enabled: Option.isNone(held) }),
          Hover.requestHighlight({
            index: Option.getOrElse(held, () =>
              Option.match(model.controller.focusedId, {
                onNone: () => null,
                onSome: (focusedId) =>
                  model.controller.rows.find((row) => row.id === focusedId)?.index ?? null,
              }),
            ),
          }),
        ])
      },
    ),
    PressedOpeningKey: FluidDropdownDefinition.makeStep(
      (_model, { key }: typeof Message.PressedOpeningKey.Type) =>
        Controller.requestOpenWithKey({ key }),
    ),
    RequestedOpen: FluidDropdownDefinition.makeStep(
      (_model, { open }: Omit<typeof Message.RequestedOpen.Type, '_tag'>) =>
        Controller.requestOpen({ open }),
    ),
    ConfiguredDisabled: FluidDropdownDefinition.makeStep(
      (_model, { disabled }: Omit<typeof Message.ConfiguredDisabled.Type, '_tag'>) =>
        Controller.requestDisabled({ disabled }),
    ),
    ConfiguredOpen: FluidDropdownDefinition.makeStep(
      (_model, { control }: Omit<typeof Message.ConfiguredOpen.Type, '_tag'>) =>
        Update.combineSteps([
          Controller.requestControlledOpen({ control }),
          FluidDropdownDefinition.makeCommandsStep((model) =>
            model.controller.phase === 'closing'
              ? [FinishExit({ generation: model.controller.generation })]
              : [],
          ),
        ]),
    ),
    ConfiguredSelection: FluidDropdownDefinition.makeStep(
      (_model, { selection }: Omit<typeof Message.ConfiguredSelection.Type, '_tag'>) =>
        Update.combineSteps([
          Controller.requestSelection({ selection }),
          Selection.requestSelection({
            indices: Option.getOrElse(selection.checkedIndices, () => []),
          }),
          Hover.requestRemeasure(),
        ]),
    ),
    MeasuredRows: FluidDropdownDefinition.makeStep(
      (_model, { rows }: typeof Message.MeasuredRows.Type) => Controller.informOfRows({ rows }),
    ),
    FocusedRow: FluidDropdownDefinition.makeStep(
      (model, { id, visible }: typeof Message.FocusedRow.Type) =>
        Update.combineSteps([
          Controller.informOfFocus({ id }),
          FluidDropdownDefinition.makeFieldsStep(() => ({ focusVisible: () => visible })),
          Hover.requestHighlight({
            index: Option.match(id, {
              onNone: () => null,
              onSome: (focusedId) =>
                model.controller.rows.find((row) => row.id === focusedId)?.index ?? null,
            }),
          }),
        ]),
    ),
    PressedNavigationKey: FluidDropdownDefinition.makeStep(
      (_model, { key, searchId }: typeof Message.PressedNavigationKey.Type) =>
        Controller.requestNavigate({ key, searchId }),
    ),
    TypedCharacter: FluidDropdownDefinition.makeStep(
      (_model, { character }: typeof Message.TypedCharacter.Type) =>
        Controller.requestTypeahead({ character }),
    ),
    ActivatedRow: FluidDropdownDefinition.makeStep(
      (_model, { id }: typeof Message.ActivatedRow.Type) => Controller.requestActivate({ id }),
    ),
    Dismissed: FluidDropdownDefinition.makeStep(
      (model, { restore, generation, reason }: typeof Message.Dismissed.Type) =>
        generation === model.controller.generation && model.controller.phase === 'open'
          ? Controller.requestDismiss({ restore, reason })
          : FluidDropdownDefinition.makeNoopStep(),
    ),
    CompletedExit: FluidDropdownDefinition.makeStep(
      (_model, { generation }: typeof Message.CompletedExit.Type) =>
        Controller.informOfExitCompletion({ generation }),
    ),
    MovedPointer: FluidDropdownDefinition.makeStep(() =>
      Update.combineSteps([
        Controller.informOfPointer(),
        FluidDropdownDefinition.makeFieldsStep(() => ({ focusVisible: () => false })),
      ]),
    ),
    ClearedTypeahead: FluidDropdownDefinition.makeStep(
      (_model, { generation }: typeof Message.ClearedTypeahead.Type) =>
        Controller.informOfTypeaheadCompletion({ generation }),
    ),
    CompletedFocus: (model: typeof Model.Type) => ({ model }),
  }
}

type DropdownHandlers<Key extends symbol, ConfigSchema extends DropdownConfigSchema> = ReturnType<
  typeof dropdownHandlers<Key, ConfigSchema>
>

type DropdownOutputs<Key extends symbol, ConfigSchema extends DropdownConfigSchema> = {
  readonly [Tag in keyof DropdownHandlers<Key, ConfigSchema>]: ReturnType<
    DropdownHandlers<Key, ConfigSchema>[Tag]
  >
}

function dropdownInMessageHandlers<
  const Key extends symbol,
  ConfigSchema extends DropdownConfigSchema,
>(runtime: DropdownRuntime<Key, ConfigSchema>, handlers: DropdownHandlers<Key, ConfigSchema>) {
  const { Definition: FluidDropdownDefinition, Controller, Hover } = runtime

  return {
    RequestedHoverMode: FluidDropdownDefinition.makeStep(
      (_model, { mode }: { readonly mode: 'fluid' | 'standard' }) =>
        Hover.requestConfigure({
          options: { mode, axis: 'y', nearest: true, gapClick: true, maxDistance: Infinity },
        }),
    ),
    RequestedVisibility: FluidDropdownDefinition.makeStep(
      (model, { open }: { readonly open: boolean }) =>
        model.controller.disabled
          ? FluidDropdownDefinition.makeNoopStep()
          : Controller.requestOpen({ open }),
    ),
    RequestedOverlaysHidden: handlers.RequestedHideOverlays,
    RequestedSubmenuHold: handlers.HeldSubmenu,
    RequestedControlledOpen: handlers.ConfiguredOpen,
    RequestedDisabled: handlers.ConfiguredDisabled,
    RequestedSelection: handlers.ConfiguredSelection,
  }
}

type DropdownInMessageHandlers<
  Key extends symbol,
  ConfigSchema extends DropdownConfigSchema,
> = ReturnType<typeof dropdownInMessageHandlers<Key, ConfigSchema>>

type DropdownInMessageOutputs<Key extends symbol, ConfigSchema extends DropdownConfigSchema> = {
  readonly [Tag in keyof DropdownInMessageHandlers<Key, ConfigSchema>]: ReturnType<
    DropdownInMessageHandlers<Key, ConfigSchema>[Tag]
  >
}

function dropdownEffectsLayer() {
  return Layer.mergeAll(
    Observe.layer,
    ObserveTrigger.layer,
    FocusTarget.layer,
    FinishExit.layer,
    ClearTypeahead.layer,
    DelayHover.layer,
  )
}

interface BehaviorChannels<Key extends symbol, ConfigSchema extends DropdownConfigSchema> {
  readonly update: ReturnType<typeof dropdownUpdate<Key, ConfigSchema>>
  readonly inMessageUpdate: ReturnType<typeof dropdownInMessageUpdate<Key, ConfigSchema>>
  readonly view: ReturnType<typeof dropdownView<Key, ConfigSchema>>
  readonly EffectsLayer: ReturnType<typeof dropdownEffectsLayer>
}

function dropdownRootInit<const Key extends symbol>(
  runtime: DropdownRuntime<Key, typeof Config>,
  inline: boolean,
) {
  return runtime.Composition.makeInit((config) => ({
    model: { focusVisible: false, overlaysHidden: false },
    childInitContext: { ...config, inline, sub: false },
  }))
}

function dropdownSubInit<const Key extends symbol>(
  runtime: DropdownRuntime<Key, typeof SubConfigSchema>,
) {
  return runtime.Composition.makeInit((config) => ({
    model: { focusVisible: false, overlaysHidden: false },
    childInitContext: { ...config, inline: false, sub: true },
  }))
}

/** Named actual channels keep consumer declarations portable without erasing graph evidence. */
export interface DropdownPlans<Key extends symbol> extends BehaviorChannels<Key, typeof Config> {
  readonly init: ReturnType<typeof dropdownRootInit<Key>>
}

export interface DropdownSubPlans<Key extends symbol> extends BehaviorChannels<
  Key,
  typeof SubConfigSchema
> {
  readonly init: ReturnType<typeof dropdownSubInit<Key>>
}
