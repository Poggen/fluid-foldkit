import { Layer, Schema } from 'effect'
import { Block, Update } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { CheckboxBlock, layer as CheckboxLayer } from '../../../registry/fluid/src/checkbox.js'
import { Field, FieldLabel } from '../../../registry/fluid/src/field.js'
import { createTargetMotionScope } from '../../../registry/fluid/src/motion-target.js'
import { createPresentationContext } from '../../../registry/fluid/src/presentation.js'

export const Config = Schema.Struct({
  checked: Schema.Boolean,
  indeterminate: Schema.Boolean,
  disabled: Schema.Boolean,
  readOnly: Schema.Boolean,
  refuse: Schema.Boolean,
  required: Schema.Boolean,
  card: Schema.Boolean,
  compact: Schema.Boolean,
  sharp: Schema.Boolean,
  reduced: Schema.Boolean,
})
export type Config = typeof Config.Type
const Model = Schema.Struct({
  config: Config,
  checkbox: CheckboxBlock.Model,
  requests: Schema.Array(Schema.Boolean),
})
const Message = defineMessageUnion({
  Configured: { checked: Schema.Boolean, indeterminate: Schema.Boolean },
})
const effects = Block.makeEffectsContract()
export const CheckboxFixtureKey = Symbol('CheckboxFixture')
export const block = Block.make('CheckboxFixture', {
  key: CheckboxFixtureKey,
  Model,
  Message,
  InitArgs: Schema.Tuple([Config]),
  ChildInitContext: Config,
  view: { kind: 'Document' },
  effects,
})
const Requests = block.makeRequiredFieldBinding(CheckboxBlock, {
  field: 'checkbox',
  init: { contextToArgs: (config: Config) => [{ id: 'choice', ...config }] },
})
const Checkbox = Requests.withOutMessagePolicy({
  fold: block.makeOutMessageFold(CheckboxBlock, {
    Changed: ({ checked }) =>
      block.makeStep((model) =>
        Update.combineSteps([
          block.makeFieldsStep(() => ({ requests: (requests) => [...requests, checked] })),
          ...(model.config.refuse
            ? []
            : [
                Requests.requestConfigure({
                  checked,
                  disabled: model.config.disabled,
                  readOnly: model.config.readOnly,
                }),
              ]),
        ]),
      ),
  }),
})
const target = createTargetMotionScope('checkbox-parity')
const composition = block.makeComposition({ bindings: [Checkbox] })
const init = composition.makeInit((config: Config) => ({
  model: { config, requests: [] },
  childInitContext: config,
}))
const update = composition.makeUpdate({
  Configured: block.makeStep((model, { checked, indeterminate }: typeof Message.Configured.Type) =>
    Requests.requestConfigure({
      checked,
      indeterminate,
      disabled: model.config.disabled,
      readOnly: model.config.readOnly,
    }),
  ),
})
const view = composition.makeView((model, h) => {
  const context = createPresentationContext({
    size: model.config.compact ? 'compact' : 'default',
    shape: model.config.sharp ? 'sharp' : 'rounded',
    reducedMotion: model.config.reduced ? 'always' : 'never',
  })
  const control = h.block(
    Checkbox.embedView({
      slotId: 'choice',
      model: model.checkbox,
      viewInputs: {
        context,
        animate: target.node,
        label: 'Choice',
        name: 'choice',
        value: 'yes',
        required: model.config.required,
      },
    }),
  )
  const field = Field(
    {
      context,
      orientation: 'horizontal',
      children: [
        control,
        ...(model.config.card
          ? []
          : [FieldLabel({ context, htmlFor: 'choice', children: ['Choice'] }, h)]),
      ],
    },
    h,
  )
  return {
    title: 'Checkbox parity',
    body: h.main(
      [h.Class('p-8 space-y-8')],
      [
        h.form(
          [h.Id('checkbox-form')],
          [
            model.config.card
              ? FieldLabel({ context, htmlFor: 'choice', children: [field, 'Choice'] }, h)
              : field,
            h.button([h.Type('reset'), h.Class('m-4')], ['Reset']),
            h.button([h.Type('submit'), h.Class('m-4')], ['Submit']),
          ],
        ),
        h.div(
          [h.Class('flex gap-4')],
          [
            h.button(
              [h.OnClick(Message.Configured({ checked: true, indeterminate: false }))],
              ['Check'],
            ),
            h.button(
              [h.OnClick(Message.Configured({ checked: false, indeterminate: true }))],
              ['Dash'],
            ),
            h.button(
              [h.OnClick(Message.Configured({ checked: true, indeterminate: true }))],
              ['Mixed checked'],
            ),
            h.button(
              [h.OnClick(Message.Configured({ checked: false, indeterminate: false }))],
              ['Empty'],
            ),
          ],
        ),
        h.output([h.Id('requests')], [JSON.stringify(model.requests)]),
      ],
    ),
  }
})
export const layer = block
  .makeLayer({ init, update, view })
  .pipe(Layer.provide(CheckboxLayer), Layer.provide(target.layer))
