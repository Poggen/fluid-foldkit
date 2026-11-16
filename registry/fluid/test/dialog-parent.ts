import { Layer, Option, Schema } from 'effect'
import { Block, Update } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import type { DialogResources } from '../src/dialog.js'
import {
  DialogBlock,
  DialogLayer,
  DialogTitle,
  DialogDescription,
  DialogResourcesServerLayer,
} from '../src/dialog.js'

const Model = Schema.Struct({
  primary: DialogBlock.Model,
  peer: DialogBlock.Model,
  notifications: Schema.Natural,
})

const Message = defineMessageUnion({
  Open: {},
  Close: {},
  TakeControl: { open: Schema.Boolean },
  ToggleModal: {},
  TogglePeerModal: {},
  OpenStacked: {},
  OpenPeer: {},
})

const effects = Block.makeEffectsContract<never, DialogResources>()

export const DialogFixtureKey = Symbol('FluidDialogFixture')

export const DialogFixture = Block.make('FluidDialogFixture', {
  key: DialogFixtureKey,
  Model,
  Message,
  InitArgs: Schema.Tuple([]),
  ChildInitContext: Schema.Struct({ nested: Schema.Boolean }),
  view: { kind: 'Document' },
  effects,
})

const Primary = DialogFixture.makeRequiredFieldBinding(DialogBlock, {
  field: 'primary',
  init: { contextToArgs: () => [{ id: 'primary-dialog' }] },
}).withOutMessagePolicy({
  fold: DialogFixture.makeOutMessageFold(DialogBlock, {
    CompletedClose: DialogFixture.makeNoopStep,
    OpenChanged: () =>
      DialogFixture.makeFieldsStep((model) => ({
        notifications: () => model.notifications + 1,
      })),
  }),
})

const Peer = DialogFixture.makeRequiredFieldBinding(DialogBlock, {
  field: 'peer',
  init: {
    contextToArgs: ({ nested }: { readonly nested: boolean }) => [
      nested
        ? { id: 'peer-dialog', defaultOpen: false, modal: false, parentDialogId: 'primary-dialog' }
        : { id: 'peer-dialog', defaultOpen: true, modal: false },
    ],
  },
}).withOutMessagePolicy({
  fold: DialogFixture.makeOutMessageFold(DialogBlock, {
    CompletedClose: DialogFixture.makeNoopStep,
    OpenChanged: () => DialogFixture.makeNoopStep(),
  }),
})

const FluidDialogFixtureComposition = DialogFixture.makeComposition({
  bindings: [Primary, Peer],
})

const fixtureLayer = (nested: boolean) =>
  DialogFixture.makeLayer({
    init: FluidDialogFixtureComposition.makeInit(() => ({
      childInitContext: { nested },
      model: { notifications: 0 },
    })),
    update: FluidDialogFixtureComposition.makeUpdate({
      Open: Update.combineSteps([Peer.requestClose(), Primary.requestOpen()]),
      Close: Primary.requestClose(),
      OpenStacked: Primary.requestOpen(),
      OpenPeer: Peer.requestOpen(),
      TakeControl: DialogFixture.makeStep.fromMessage(({ open }: typeof Message.TakeControl.Type) =>
        Primary.requestControlledOpen({ control: Option.some(open) }),
      ),
      TogglePeerModal: DialogFixture.makeStep((model) =>
        Peer.requestModal({ modal: !model.peer.modal }),
      ),
      ToggleModal: DialogFixture.makeStep((model) =>
        Primary.requestModal({ modal: !model.primary.modal }),
      ),
    }),
    view: FluidDialogFixtureComposition.makeView((model, h) => ({
      title: 'Dialog fixture',
      body: h.div(
        [h.DataAttribute('dialog-notifications', String(model.notifications))],
        [
          h.button(
            [h.Id('accept-dialog-open'), h.OnClick(Message.TakeControl({ open: true }))],
            ['Accept open'],
          ),
          h.button(
            [h.Id('accept-dialog-close'), h.OnClick(Message.TakeControl({ open: false }))],
            ['Accept close'],
          ),
          h.button(
            [h.Id('toggle-dialog-modal'), h.OnClick(Message.ToggleModal())],
            ['Toggle modality'],
          ),
          h.button(
            [h.Id('toggle-peer-modal'), h.OnClick(Message.TogglePeerModal())],
            ['Toggle peer modality'],
          ),
          h.button(
            [h.Id('open-stacked-dialog'), h.OnClick(Message.OpenStacked())],
            ['Open without closing peer'],
          ),
          h.button([h.Id('open-peer-dialog'), h.OnClick(Message.OpenPeer())], ['Open peer dialog']),
          h.block(
            Primary.embedView({
              slotId: model.primary.id,
              model: model.primary,
              viewInputs: {
                animate: (node) => node,
                trigger: (attributes) => h.button(attributes, ['Open']),
                content: (context) => [
                  DialogTitle({ dialogId: context.id, children: ['Primary title'] }, h),
                ],
              },
            }),
          ),
          h.block(
            Peer.embedView({
              slotId: model.peer.id,
              model: model.peer,
              viewInputs: {
                animate: (node) => node,
                size: 'xl',
                presentation: { size: 'compact' },
                position: 'top',
                hasDescription: true,
                content: (context) => [
                  DialogTitle({ dialogId: context.id, children: ['Peer title'] }, h),
                  DialogDescription({ dialogId: context.id, children: ['Peer explanation'] }, h),
                ],
              },
            }),
          ),
        ],
      ),
    })),
    EffectsLayer: Layer.empty,
  }).pipe(Layer.provide(DialogLayer))

export const DialogFixtureImplementationLayer = fixtureLayer(false)

export const DialogFixtureNestedImplementationLayer = fixtureLayer(true)

export const DialogFixtureLayer = DialogFixtureImplementationLayer.pipe(
  Layer.provide(DialogResourcesServerLayer),
)

export const wrongDialogOperations = () => {
  // @ts-expect-error Controlled admission accepts Option<boolean>, never a string.
  Primary.requestControlledOpen({ control: 'true' })
  // @ts-expect-error Modality is a boolean source root prop.
  Primary.requestModal({ modal: 'true' })
}
