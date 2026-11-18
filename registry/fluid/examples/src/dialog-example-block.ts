import { Boolean, Number } from 'effect'
import { modifyFields } from 'foldkit/struct'
import { Effect, Layer, Option, Schema } from 'effect'
import { Block, Update } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { DialogBlock } from '@foldkit-visuals/fluid/dialog'
import { createMotionScope } from '@foldkit-visuals/fluid/motion'
import { makeDialogExampleResourcesLayer } from './dialog-example-hooks.js'
import { DialogExampleTheme, makeDialogExampleThemeLayer } from './dialog-example-theme.js'
import { labModelFields, labMessageFields, labDefaults } from './dialog-example-lab-options.js'

const motion = createMotionScope('dialog-example')
const services = Layer.merge(
  makeDialogExampleResourcesLayer(document),
  makeDialogExampleThemeLayer(document),
)
const effects = Block.makeEffectsContract<never, Layer.Success<typeof services>>()
const Model = Schema.Struct({
  lab: DialogBlock.Model,
  ...labModelFields,
  basic: DialogBlock.Model,
  small: DialogBlock.Model,
  large: DialogBlock.Model,
  extraLarge: DialogBlock.Model,
  controlled: DialogBlock.Model,
  maybeOuter: Schema.Option(DialogBlock.Model),
  maybeNested: Schema.Option(DialogBlock.Model),
  scoped: DialogBlock.Model,
  maybeSeeded: Schema.Option(DialogBlock.Model),
  isCompact: Schema.Boolean,
  shouldAcceptClose: Schema.Boolean,
  closeRequests: Schema.Natural,
  isMounted: Schema.Boolean,
})
const Message = defineMessageUnion({
  ...labMessageFields,
  ClickedDensity: {},
  ClickedAdmission: {},
  ClickedUnmount: {},
  ClickedForceClose: {},
  ClickedReopenScoped: {},
  ClickedSeeded: {},
})
export const DialogExampleKey = Symbol('DialogExample')
const DialogExampleBlock = Block.make('DialogExample', {
  key: DialogExampleKey,
  Model,
  Message,
  InitArgs: Schema.Tuple([]),
  effects,
  view: { kind: 'Document' },
})
const Basic = DialogExampleBlock.makeRequiredFieldBinding(DialogBlock, {
  field: 'basic',
  init: { contextToArgs: () => [{ id: 'basic' }] },
}).withOutMessagePolicy({
  fold: DialogExampleBlock.makeOutMessageFold(DialogBlock, {
    OpenChanged: DialogExampleBlock.makeNoopStep,
    CompletedClose: DialogExampleBlock.makeNoopStep,
  }),
})
const Small = DialogExampleBlock.makeRequiredFieldBinding(DialogBlock, {
  field: 'small',
  init: { contextToArgs: () => [{ id: 'small' }] },
}).withOutMessagePolicy({
  fold: DialogExampleBlock.makeOutMessageFold(DialogBlock, {
    OpenChanged: DialogExampleBlock.makeNoopStep,
    CompletedClose: DialogExampleBlock.makeNoopStep,
  }),
})
const Large = DialogExampleBlock.makeRequiredFieldBinding(DialogBlock, {
  field: 'large',
  init: { contextToArgs: () => [{ id: 'large' }] },
}).withOutMessagePolicy({
  fold: DialogExampleBlock.makeOutMessageFold(DialogBlock, {
    OpenChanged: DialogExampleBlock.makeNoopStep,
    CompletedClose: DialogExampleBlock.makeNoopStep,
  }),
})
const ExtraLarge = DialogExampleBlock.makeRequiredFieldBinding(DialogBlock, {
  field: 'extraLarge',
  init: { contextToArgs: () => [{ id: 'extra-large' }] },
}).withOutMessagePolicy({
  fold: DialogExampleBlock.makeOutMessageFold(DialogBlock, {
    OpenChanged: DialogExampleBlock.makeNoopStep,
    CompletedClose: DialogExampleBlock.makeNoopStep,
  }),
})
const Outer = DialogExampleBlock.makeOptionalFieldBinding(DialogBlock, {
  field: 'maybeOuter',
  init: { contextToArgs: () => Option.some([{ id: 'outer' }]) },
}).withOutMessagePolicy({
  fold: DialogExampleBlock.makeOutMessageFold(DialogBlock, {
    OpenChanged: DialogExampleBlock.makeNoopStep,
    CompletedClose: DialogExampleBlock.makeNoopStep,
  }),
})
const Nested = DialogExampleBlock.makeOptionalFieldBinding(DialogBlock, {
  field: 'maybeNested',
  init: { contextToArgs: () => Option.some([{ id: 'nested', parentDialogId: 'outer' }]) },
}).withOutMessagePolicy({
  fold: DialogExampleBlock.makeOutMessageFold(DialogBlock, {
    OpenChanged: DialogExampleBlock.makeNoopStep,
    CompletedClose: DialogExampleBlock.makeNoopStep,
  }),
})
const Scoped = DialogExampleBlock.makeRequiredFieldBinding(DialogBlock, {
  field: 'scoped',
  init: { contextToArgs: () => [{ id: 'scoped', modal: false }] },
}).withOutMessagePolicy({
  fold: DialogExampleBlock.makeOutMessageFold(DialogBlock, {
    OpenChanged: DialogExampleBlock.makeNoopStep,
    CompletedClose: DialogExampleBlock.makeNoopStep,
  }),
})
const Seeded = DialogExampleBlock.makeOptionalFieldBinding(DialogBlock, {
  field: 'maybeSeeded',
  init: { contextToArgs: () => Option.none() },
}).withOutMessagePolicy({
  fold: DialogExampleBlock.makeOutMessageFold(DialogBlock, {
    OpenChanged: DialogExampleBlock.makeNoopStep,
    CompletedClose: DialogExampleBlock.makeNoopStep,
  }),
})
const ControlledRequests = DialogExampleBlock.makeRequiredFieldBinding(DialogBlock, {
  field: 'controlled',
  init: { contextToArgs: () => [{ id: 'controlled', open: false }] },
})
const Controlled = ControlledRequests.withOutMessagePolicy({
  fold: DialogExampleBlock.makeOutMessageFold(DialogBlock, {
    OpenChanged: ({ open }) =>
      DialogExampleBlock.makeStep((model) =>
        Update.combineSteps([
          ...(!open
            ? [DialogExampleBlock.makeFieldsStep(() => ({ closeRequests: Number.increment }))]
            : []),
          open || model.shouldAcceptClose
            ? ControlledRequests.requestControlledOpen({ control: Option.some(open) })
            : DialogExampleBlock.makeNoopStep(),
        ]),
      ),
    CompletedClose: DialogExampleBlock.makeNoopStep,
  }),
})
const LabRequests = DialogExampleBlock.makeRequiredFieldBinding(DialogBlock, {
  field: 'lab',
  init: { contextToArgs: () => [{ id: 'lab' }] },
})
const Lab = LabRequests.withOutMessagePolicy({
  fold: DialogExampleBlock.makeOutMessageFold(DialogBlock, {
    OpenChanged: ({ open }) =>
      DialogExampleBlock.makeStep((model) =>
        Update.combineSteps([
          DialogExampleBlock.makeFieldsStep(() => ({
            labChanges: (changes) => [...changes, open] satisfies Model['labChanges'],
            isLabOwnerOpen: (current) =>
              model.isLabControlled && (open || model.isLabAcceptClose) ? open : current,
          })),
          model.isLabControlled && (open || model.isLabAcceptClose)
            ? LabRequests.requestControlledOpen({ control: Option.some(open) })
            : DialogExampleBlock.makeNoopStep(),
        ]),
      ),
    CompletedClose: DialogExampleBlock.makeNoopStep,
  }),
})
const SetTheme = DialogExampleBlock.makeCommand('SetTheme', {
  args: { dark: Schema.Boolean },
  messages: [Message.CompletedSetTheme],
  *handler() {
    const theme = yield* DialogExampleTheme
    return ({ dark }) => theme.setDark(dark).pipe(Effect.as(Message.CompletedSetTheme()))
  },
})
const DialogExampleComposition = DialogExampleBlock.makeComposition({
  bindings: [Lab, Basic, Small, Large, ExtraLarge, Controlled, Outer, Nested, Scoped, Seeded],
})
const init = DialogExampleComposition.makeInit(() => ({
  model: {
    ...labDefaults,
    isCompact: false,
    shouldAcceptClose: true,
    closeRequests: 0,
    isMounted: true,
  },
}))
const toggleLabField = {
  labShowClose: DialogExampleBlock.makeFieldsStep(() => ({ isLabShowClose: Boolean.not })),
  labDescription: DialogExampleBlock.makeFieldsStep(() => ({ isLabDescription: Boolean.not })),
  labTop: DialogExampleBlock.makeFieldsStep(() => ({ isLabTop: Boolean.not })),
  labPill: DialogExampleBlock.makeFieldsStep(() => ({ isLabPill: Boolean.not })),
  labSurface: DialogExampleBlock.makeFieldsStep(() => ({ isLabSurface: Boolean.not })),
  labDisabled: DialogExampleBlock.makeFieldsStep(() => ({ isLabDisabled: Boolean.not })),
  labCompact: DialogExampleBlock.makeFieldsStep(() => ({ isLabCompact: Boolean.not })),
  labAcceptClose: DialogExampleBlock.makeFieldsStep(() => ({ isLabAcceptClose: Boolean.not })),
}

const update = DialogExampleComposition.makeUpdate({
  ClickedLabToggle: DialogExampleBlock.makeStep.fromMessage(({ field }) => toggleLabField[field]),
  ClickedLabHook: DialogExampleBlock.makeFieldsStep.fromMessage(({ policy }) => ({
    labHook: () => policy,
  })),
  ClickedLabSlot: DialogExampleBlock.makeFieldsStep.fromMessage(({ slot }) => ({
    labSlot: () => slot,
  })),
  PressedLabKey: DialogExampleBlock.makeFieldsStep.fromMessage(({ key }) => ({
    labKey: () => key,
  })),
  ClickedLabSize: DialogExampleBlock.makeFieldsStep.fromMessage(({ size }) => ({
    labSize: () => size,
  })),
  ClickedLabOwnership: DialogExampleBlock.makeStep((model) =>
    Update.combineSteps([
      DialogExampleBlock.makeFieldsStep(() => ({
        isLabControlled: Boolean.not,
        isLabOwnerOpen: () => model.lab.isOpen,
      })),
      Lab.requestControlledOpen({
        control: model.isLabControlled ? Option.none() : Option.some(model.lab.isOpen),
      }),
    ]),
  ),
  ClickedLabOwnerOpen: DialogExampleBlock.makeStep((model, { open }) =>
    Update.combineSteps([
      DialogExampleBlock.makeFieldsStep(() => ({ isLabOwnerOpen: () => open })),
      model.isLabControlled
        ? Lab.requestControlledOpen({ control: Option.some(open) })
        : open
          ? Lab.requestOpen()
          : Lab.requestClose(),
    ]),
  ),
  ClickedLabModal: DialogExampleBlock.makeStep((model) =>
    Update.combineSteps([
      DialogExampleBlock.makeFieldsStep(() => ({ isLabModal: Boolean.not })),
      Lab.requestModal({ modal: !model.isLabModal }),
    ]),
  ),
  ClickedLabTheme: (model) => ({
    model: modifyFields(model, { isLabDark: Boolean.not }),
    commands: [SetTheme({ dark: !model.isLabDark })],
  }),
  CompletedSetTheme: DialogExampleBlock.makeNoopStep(),

  ClickedDensity: DialogExampleBlock.makeFieldsStep(() => ({ isCompact: Boolean.not })),
  ClickedAdmission: DialogExampleBlock.makeFieldsStep(() => ({ shouldAcceptClose: Boolean.not })),
  ClickedUnmount: DialogExampleBlock.makeStep((model) =>
    model.isMounted
      ? DialogExampleBlock.makeFieldsStep(() => ({
          isMounted: () => false,
          maybeOuter: () => Option.none(),
          maybeNested: () => Option.none(),
        }))
      : Update.combineSteps([
          DialogExampleBlock.makeStep((current) =>
            Outer.init({
              args: [{ id: 'outer' }],
              toParentModel: (child) =>
                modifyFields(current, {
                  maybeOuter: () => Option.some(child),
                  isMounted: () => true,
                }),
            }),
          ),
          DialogExampleBlock.makeStep((current) =>
            Nested.init({
              args: [{ id: 'nested', parentDialogId: 'outer' }],
              toParentModel: (child) =>
                modifyFields(current, { maybeNested: () => Option.some(child) }),
            }),
          ),
        ]),
  ),
  ClickedForceClose: Controlled.requestControlledOpen({ control: Option.some(false) }),
  ClickedReopenScoped: Scoped.requestOpen(),
  ClickedSeeded: DialogExampleBlock.makeStep((model) =>
    Option.isSome(model.maybeSeeded)
      ? DialogExampleBlock.makeFieldsStep(() => ({ maybeSeeded: () => Option.none() }))
      : Seeded.init({
          args: [{ id: 'seeded', defaultOpen: true }],
          toParentModel: (child) => modifyFields(model, { maybeSeeded: () => Option.some(child) }),
        }),
  ),
})

export {
  DialogExampleBlock,
  DialogExampleComposition,
  Message,
  Basic,
  Small,
  Large,
  ExtraLarge,
  Controlled,
  Outer,
  Nested,
  Scoped,
  Seeded,
  Lab,
  motion,
  services,
  init,
  update,
  SetTheme,
}

type Model = typeof Model.Type
