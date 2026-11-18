/* @license Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud. */
import { rectAt, emptyGeometry } from './lib/indexed-geometry.js'
import { Effect, Layer, Option, Schema } from 'effect'
import { Block, Update } from 'foldkit'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import { DropdownControllerBlock, layer as ControllerLayer } from './dropdown-controller.js'
import { DropdownControl, DropdownSelection, DropdownIndex } from './dropdown-state.js'
import type { DropdownConfig } from './dropdown-state.js'
import { DropdownObservation, DropdownMountArgs } from './dropdown-observation.js'
import { DropdownResources } from './dropdown-resources.js'
import { HoverBlock, HoverMode, layer as HoverLayer } from './hover.js'
import { HoverHighlightBlock, layer as HighlightLayer } from './hover-highlight.js'
import { SelectionBackgroundsBlock, layer as SelectionLayer } from './selection-backgrounds.js'
import { ScrollAreaBlock, layer as ScrollLayer } from './scroll-area.js'
import type { DropdownProps } from './dropdown-props.js'
import { spring, exitFallbackMs } from './lib/springs.js'

export const Model = Schema.Struct({
  controller: DropdownControllerBlock.Model,
  hover: HoverBlock.Model,
  highlight: HoverHighlightBlock.Model,
  selected: HoverHighlightBlock.Model,
  focus: HoverHighlightBlock.Model,
  scroll: ScrollAreaBlock.Model,
  selection: SelectionBackgroundsBlock.Model,
  focusVisible: Schema.Boolean,
  overlaysHidden: Schema.Boolean,
})

export const Message = defineMessageUnion({
  Mounted: {},
  RequestedHideOverlays: {},
  ClickedSubTrigger: {},
  ClickedTrigger: { withinHoverAdmission: Schema.Boolean },
  PressedOpeningKey: { key: Schema.String },
  RequestedOpen: { open: Schema.Boolean },
  ConfiguredOpen: { control: DropdownControl },
  ConfiguredDisabled: { disabled: Schema.Boolean },
  HeldSubmenu: { index: DropdownIndex, open: Schema.Boolean },
  HoveredTrigger: { over: Schema.Boolean, openOnHover: Schema.optionalKey(Schema.Boolean) },
  CompletedHover: { generation: Schema.Natural },
  ConfiguredSelection: { selection: DropdownSelection },
  MeasuredRows: DropdownObservation.MeasuredRows.fields,
  FocusedRow: DropdownObservation.FocusedRow.fields,
  PressedNavigationKey: DropdownObservation.PressedNavigationKey.fields,
  TypedCharacter: DropdownObservation.TypedCharacter.fields,
  ActivatedRow: DropdownObservation.ActivatedRow.fields,
  Dismissed: DropdownObservation.Dismissed.fields,
  CompletedExit: DropdownObservation.CompletedExit.fields,
  MovedPointer: {},
  ClearedTypeahead: { generation: Schema.Natural },
  CompletedFocus: {},
})

export const DropdownEvent = Schema.TaggedUnion({
  OpenChanged: { open: Schema.Boolean },
  RootCloseRequested: {},
  Selected: { id: Schema.String, index: DropdownIndex },
})

const rootCloseEvent = DropdownEvent.cases.RootCloseRequested.make({})

const closedEvent = DropdownEvent.cases.OpenChanged.make({ open: false })

const OutMessage = defineMessageUnion({ Events: { events: Schema.Array(DropdownEvent) } })

export const InMessage = defineInMessageUnion({
  RequestedHoverMode: { mode: HoverMode },
  RequestedVisibility: { open: Schema.Boolean },
  RequestedOverlaysHidden: {},
  RequestedSubmenuHold: { index: DropdownIndex, open: Schema.Boolean },
  RequestedControlledOpen: { control: DropdownControl },
  RequestedDisabled: { disabled: Schema.Boolean },
  RequestedSelection: { selection: DropdownSelection },
})

export const Config = Schema.Struct({
  hoverMode: Schema.optionalKey(HoverMode),
  id: Schema.String,
  rootId: Schema.optionalKey(Schema.String),
  parentId: Schema.optionalKey(Schema.String),
  open: Schema.optionalKey(Schema.Boolean),
  defaultOpen: Schema.optionalKey(Schema.Boolean),
  disabled: Schema.optionalKey(Schema.Boolean),
  checkedIndex: Schema.optionalKey(DropdownIndex),
  checkedIndices: Schema.optionalKey(Schema.Array(DropdownIndex)),
})

export const DropdownNamespace = Block.makeNamespace('Dropdown')

export const FocusTarget = DropdownNamespace.makeCommand('FocusTarget', {
  args: { id: Schema.String, targetId: Schema.String },
  messages: [Message.CompletedFocus],
  *handler() {
    const resources = yield* DropdownResources

    return ({ id, targetId }) =>
      resources.focus(id, targetId).pipe(Effect.as(Message.CompletedFocus()))
  },
})

export const FinishExit = DropdownNamespace.makeCommand('FinishExit', {
  args: { generation: Schema.Natural },
  messages: [Message.CompletedExit],
  *handler() {
    return ({ generation }) =>
      Effect.sleep(`${exitFallbackMs(spring.fast)} millis`).pipe(
        Effect.as(Message.CompletedExit({ generation })),
      )
  },
})

export const ClearTypeahead = DropdownNamespace.makeCommand('ClearTypeahead', {
  args: { generation: Schema.Natural },
  messages: [Message.ClearedTypeahead],
  *handler() {
    return ({ generation }) =>
      Effect.sleep('500 millis').pipe(Effect.as(Message.ClearedTypeahead({ generation })))
  },
})

export const Observe = DropdownNamespace.makeMountStream('Observe', {
  args: DropdownMountArgs.fields,
  messages: [
    Message.MeasuredRows,
    Message.FocusedRow,
    Message.PressedNavigationKey,
    Message.TypedCharacter,
    Message.ActivatedRow,
    Message.Dismissed,
    Message.CompletedExit,
    Message.MovedPointer,
    Message.RequestedOpen,
    Message.HoveredTrigger,
  ],
  *handler() {
    const resources = yield* DropdownResources

    return resources.observe
  },
})

export const DelayHover = DropdownNamespace.makeCommand('DelayHover', {
  args: { generation: Schema.Natural },
  messages: [Message.CompletedHover],
  *handler() {
    return ({ generation }) =>
      Effect.sleep('100 millis').pipe(Effect.as(Message.CompletedHover({ generation })))
  },
})

export const ObserveTrigger = DropdownNamespace.makeMountStream('ObserveTrigger', {
  args: {
    id: Schema.String,
    sub: Schema.Boolean,
    direction: Schema.Literals(['ltr', 'rtl']),
  },
  messages: [
    Message.Mounted,
    Message.RequestedOpen,
    Message.ClickedSubTrigger,
    Message.ClickedTrigger,
    Message.PressedOpeningKey,
    Message.HoveredTrigger,
  ],
  *handler() {
    const resources = yield* DropdownResources

    return resources.observeTrigger
  },
})

const effects = Block.makeEffectsContract<never, DropdownResources>()

export const contract = {
  Model,
  Message,
  OutMessage,
  InMessage,
  InitArgs: Schema.Tuple([Config]),
  view: {
    kind: 'Element',
    Inputs: Block.makeInputContract<DropdownProps>(),
    mounts: [Observe, ObserveTrigger],
  },
  effects,
  inMessageOutputs: { RequestedVisibility: { outMessage: OutMessage.Events } },
} satisfies Omit<Block.ContractConfiguration, 'key'> & {
  readonly Model: typeof Model
  readonly Message: typeof Message
  readonly OutMessage: typeof OutMessage
}

export const SubConfigSchema = Schema.Struct({
  ...Config.fields,
  rootId: Schema.String,
  parentId: Schema.String,
})

export const subContract = { ...contract, InitArgs: Schema.Tuple([SubConfigSchema]) }

export type DropdownConfigSchema = typeof Config | typeof SubConfigSchema

export type DropdownContract<ConfigSchema extends DropdownConfigSchema = typeof Config> = Omit<
  typeof contract,
  'InitArgs'
> & { readonly InitArgs: Schema.Tuple<readonly [ConfigSchema]> }

export type DropdownDeclared<
  Key extends symbol,
  ConfigSchema extends DropdownConfigSchema = typeof Config,
> = ReturnType<typeof Block.make<'Dropdown', Key, DropdownContract<ConfigSchema>>>

export const dependencies = Layer.mergeAll(
  ControllerLayer,
  HoverLayer,
  HighlightLayer,
  SelectionLayer,
  ScrollLayer,
)

export function createDropdownComposition<
  const Key extends symbol,
  ConfigSchema extends DropdownConfigSchema,
>(FluidDropdownDefinition: DropdownDeclared<Key, ConfigSchema>) {
  const Highlight = FluidDropdownDefinition.makeRequiredFieldBinding(HoverHighlightBlock, {
    field: 'highlight',
    init: {
      contextToArgs: (config: DropdownConfig) => [
        { id: `${config.id}-highlight`, mode: config.hoverMode ?? 'fluid' },
      ],
    },
  })

  const Selected = FluidDropdownDefinition.makeRequiredFieldBinding(HoverHighlightBlock, {
    field: 'selected',
    init: { contextToArgs: (config: DropdownConfig) => [{ id: `${config.id}-selected` }] },
  })

  const Focus = FluidDropdownDefinition.makeRequiredFieldBinding(HoverHighlightBlock, {
    field: 'focus',
    init: { contextToArgs: (config: DropdownConfig) => [{ id: `${config.id}-focus` }] },
  })

  const Selection = FluidDropdownDefinition.makeRequiredFieldBinding(SelectionBackgroundsBlock, {
    field: 'selection',
    init: {
      contextToArgs: (config: DropdownConfig) => [
        { id: `${config.id}-selection`, indices: config.checkedIndices ?? [], radius: 8 },
      ],
    },
  })

  const ControllerInitial = FluidDropdownDefinition.makeRequiredFieldBinding(
    DropdownControllerBlock,
    {
      field: 'controller',
      init: {
        contextToArgs: (config: DropdownConfig) => [config],
      },
    },
  )

  const Controller = ControllerInitial.withOutMessagePolicy({
    fold: FluidDropdownDefinition.makeOutMessageFold(DropdownControllerBlock, {
      OpenChanged: ({ open }) =>
        FluidDropdownDefinition.makeStep((model) => {
          const steps = Update.combineSteps([
            ...(open
              ? [FluidDropdownDefinition.makeFieldsStep(() => ({ overlaysHidden: () => false }))]
              : []),
            FluidDropdownDefinition.makeCommandsStep(() =>
              model.controller.phase === 'closing'
                ? [FinishExit({ generation: model.controller.generation })]
                : [],
            ),
          ])

          return (registered: Parameters<typeof steps>[0]) =>
            Update.withOutMessage(
              steps(registered),
              OutMessage.Events({ events: [DropdownEvent.cases.OpenChanged.make({ open })] }),
            )
        }),
      FocusRequested: ({ id }) =>
        FluidDropdownDefinition.makeCommandsStep((model) => [
          FocusTarget({ id: model.controller.id, targetId: id }),
        ]),
      Activated: ({ id, index, close, root }) =>
        FluidDropdownDefinition.makeStep((model) => ({
          model,
          outMessage: OutMessage.Events({
            events: [
              DropdownEvent.cases.Selected.make({ id, index }),
              ...(close ? [closedEvent] : []),
              ...(root ? [rootCloseEvent] : []),
            ],
          }),
          commands:
            model.controller.phase === 'closing'
              ? [FinishExit({ generation: model.controller.generation })]
              : [],
        })),
      RootCloseRequested: () =>
        FluidDropdownDefinition.makeOutMessageStep(() =>
          OutMessage.Events({ events: [rootCloseEvent] }),
        ),
      HoverRequested: ({ generation }) =>
        FluidDropdownDefinition.makeCommandsStep(() => [DelayHover({ generation })]),
      TypeaheadChanged: ({ generation, target }) =>
        FluidDropdownDefinition.makeCommandsStep((model) => [
          ClearTypeahead({ generation }),
          ...Option.match(target, {
            onNone: () => [],
            onSome: (targetId) => [FocusTarget({ id: model.controller.id, targetId })],
          }),
        ]),
    }),
  })

  const Hover = FluidDropdownDefinition.makeRequiredFieldBinding(HoverBlock, {
    field: 'hover',
    init: {
      contextToArgs: (config: DropdownConfig) => [
        { id: `${config.id}-hover`, mode: config.hoverMode ?? 'fluid' },
      ],
    },
  }).withOutMessagePolicy({
    fold: FluidDropdownDefinition.makeOutMessageFold(HoverBlock, {
      Changed: (snapshot) =>
        FluidDropdownDefinition.makeStep((model) => {
          const selected = Option.match(model.controller.checkedIndex, {
            onNone: () => null,
            onSome: (index) => rectAt(snapshot.itemRects, index) ?? null,
          })

          const focused = model.controller.focusedId.pipe(
            Option.flatMap((id) =>
              Option.fromNullishOr(model.controller.rows.find((row) => row.id === id)),
            ),
          )

          const rect = Option.match(focused, {
            onNone: () => null,
            onSome: (row) => rectAt(snapshot.itemRects, row.index) ?? null,
          })

          return Update.combineSteps([
            Highlight.informOfSource({
              snapshot,
              hidden: model.overlaysHidden,
              mode: model.hover.mode,
            }),
            Selection.informOfGeometry({
              itemRects:
                !model.overlaysHidden &&
                (model.controller.inline || model.controller.phase === 'open')
                  ? snapshot.itemRects
                  : emptyGeometry,
              radius: 8,
            }),
            Selected.requestRect({
              rect:
                model.overlaysHidden || Option.isSome(model.controller.checkedIndices)
                  ? null
                  : selected,
              session: 0,
            }),
            Focus.requestRect({
              rect:
                !model.overlaysHidden && model.controller.inline && model.focusVisible && rect
                  ? {
                      left: rect.left - 2,
                      top: rect.top - 2,
                      width: rect.width + 4,
                      height: rect.height + 4,
                    }
                  : null,
              session: 0,
            }),
          ])
        }),
    }),
  })

  const Scroll = FluidDropdownDefinition.makeRequiredFieldBinding(ScrollAreaBlock, {
    field: 'scroll',
    init: { contextToArgs: (config: DropdownConfig) => [{ id: `${config.id}-scroll` }] },
  }).withOutMessagePolicy({
    fold: FluidDropdownDefinition.makeOutMessageFold(ScrollAreaBlock, {
      Scrolled: () => Hover.requestRemeasure(),
    }),
  })

  const FluidDropdownComposition = FluidDropdownDefinition.makeComposition({
    bindings: [Controller, Hover, Highlight, Selected, Focus, Scroll, Selection],
    mounts: [Observe, ObserveTrigger],
  })

  return {
    Definition: FluidDropdownDefinition,
    Composition: FluidDropdownComposition,
    Controller,
    Hover,
    Highlight,
    Selected,
    Focus,
    Selection,
    Scroll,
  }
}
