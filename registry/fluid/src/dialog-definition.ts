// Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud.
import { Effect, Layer, Schema, Stream } from 'effect'
import { Block } from 'foldkit'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import { DialogConfig, DialogControl } from './dialog-state.js'
import { DialogResources } from './dialog-resources.js'
import { dialogObservationFields } from './dialog-observation.js'
import type { DialogProps } from './dialog-contracts.js'

const Model = Schema.Struct({
  id: Schema.String,
  parentId: Schema.OptionFromNullOr(Schema.String),
  focusSelector: Schema.OptionFromNullOr(Schema.String),
  returnFocusSelector: Schema.OptionFromNullOr(Schema.String),
  mounted: Schema.Boolean,
  scoped: Schema.Boolean,
  control: DialogControl,
  shadowOpen: Schema.Boolean,
  isOpen: Schema.Boolean,
  modal: Schema.Boolean,
  phase: Schema.Literals(['Closed', 'Opening', 'Open', 'Closing']),
  generation: Schema.Natural,
})

const Message = defineMessageUnion({
  ...dialogObservationFields,
  Mounted: { scoped: Schema.Boolean },
  ResolvedContainer: { scoped: Schema.Boolean },
})

const InMessage = defineInMessageUnion({
  RequestedOpen: {},
  RequestedClose: {},
  RequestedToggle: {},
  RequestedControlledOpen: { control: DialogControl },
  RequestedModal: { modal: Schema.Boolean },
  RequestedReturnFocus: { selector: Schema.OptionFromNullOr(Schema.String) },
  RequestedRefreshContainer: {},
})

const OutMessage = defineMessageUnion({ OpenChanged: { open: Schema.Boolean }, CompletedClose: {} })

const effects = Block.makeEffectsContract<never, DialogResources>()

export const FluidDialogNamespace = Block.makeNamespace('FluidDialog')

export const dialogContract = {
  Model,
  Message,
  InMessage,
  OutMessage,
  InitArgs: Schema.Tuple([DialogConfig]),
  view: { kind: 'Element', Inputs: Block.makeInputContract<DialogProps>() } satisfies {
    readonly kind: 'Element'
    readonly Inputs: unknown
  },
  effects,
  inMessageOutputs: {
    RequestedOpen: { outMessage: OutMessage.OpenChanged },
    RequestedClose: { outMessage: OutMessage.OpenChanged },
    RequestedToggle: { outMessage: OutMessage.OpenChanged },
  },
}

export const Portal = FluidDialogNamespace.makeMount('Portal', {
  args: { id: Schema.String, containerId: Schema.String },
  messages: [Message.Mounted],
  *handler() {
    const resources = yield* DialogResources

    return ({ element, id, containerId }) =>
      resources
        .mountPortal(element, id, containerId)
        .pipe(Effect.map((scoped) => Message.Mounted({ scoped })))
  },
})

export const Observe = FluidDialogNamespace.makeMountStream('Observe', {
  args: { id: Schema.String },
  messages: [Message.ObservedOpenIntent, Message.Entered, Message.CompletedExit, Message.Released],
  *handler() {
    const resources = yield* DialogResources

    return ({ element, id, viewStateChanges }) =>
      viewStateChanges.pipe(
        Stream.switchMap((state) =>
          state === 'Live' ? resources.observeRoot(element, id) : Stream.never,
        ),
      )
  },
})

export const RefreshContainer = FluidDialogNamespace.makeCommand('RefreshContainer', {
  args: { id: Schema.String },
  messages: [Message.ResolvedContainer],
  *handler() {
    const resources = yield* DialogResources

    return ({ id }) =>
      resources
        .resolveContainer(id, '')
        .pipe(Effect.map((scoped) => Message.ResolvedContainer({ scoped })))
  },
})

export const DialogEffectsLayer = Layer.mergeAll(
  Portal.layer,
  Observe.layer,
  RefreshContainer.layer,
)
