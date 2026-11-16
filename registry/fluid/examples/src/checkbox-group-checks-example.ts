import * as classNames from './checkbox-group-checks-example-classes.js'
import { Button } from '@foldkit/ui'
import { Boolean, Number } from 'effect'
import {
  exampleHoverConfig,
  examplePresentation,
  exampleSelectionRadius,
} from './example-presentation.js'
import { Layer, Option, Schema } from 'effect'
import { Block, Update } from 'foldkit'
import { childAttributes } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import {
  CheckboxGroupBlock,
  CheckboxItem,
  layer as CheckboxLayer,
} from '@foldkit-visuals/fluid/checkbox-group'

import { RadioGroupBlock, layer as RadioLayer } from '@foldkit-visuals/fluid/radio-group'
import { InputGroupBlock, layer as InputGroupLayer } from '@foldkit-visuals/fluid/input-group'
import { InputFieldBlock, layer as InputFieldLayer } from '@foldkit-visuals/fluid/input-field'

import {
  PresentationProviderBlock,
  layer as ProviderLayer,
  type PresentationProviderConfig,
} from '@foldkit-visuals/fluid/presentation/provider'
import { createTargetMotionScope } from '@foldkit-visuals/fluid/motion/target'
import { hoverHighlightAnimation } from '@foldkit-visuals/fluid/hover-highlight'
import { selectionBackgroundAnimation } from '@foldkit-visuals/fluid/selection-backgrounds'

const labels = ['First', 'Second', 'Third']

const values = labels.map((_label, index) => ({ index, value: String(index) }))

const checks = labels.map((_label, index) => ({ index, checked: index === 0 }))

const Model = Schema.Struct({
  provider: PresentationProviderBlock.Model,
  checks: CheckboxGroupBlock.Model,
  baseChecks: CheckboxGroupBlock.Model,
  radios: RadioGroupBlock.Model,
  baseRadios: RadioGroupBlock.Model,
  group: InputGroupBlock.Model,
  field: InputFieldBlock.Model,
  isCompact: Schema.Boolean,
  isPill: Schema.Boolean,
  shape: Schema.Literals(['rounded', 'pill', 'sharp']),
  isMounted: Schema.Boolean,
  hasErrors: Schema.Boolean,
  shouldAcceptInput: Schema.Boolean,
  isDisabled: Schema.Boolean,
  notifications: Schema.Natural,
})

const Message = defineMessageUnion({
  ClickedSize: {},
  ClickedShape: {},
  ClickedMount: {},
  ClickedErrors: {},
  ClickedDisabled: {},
  ClickedExternal: {},
  ClickedReject: {},
})

const effects = Block.makeEffectsContract()

export const CheckboxInputExampleKey = Symbol('CheckboxInputExampleBlock')

export const CheckboxInputExampleBlock = Block.make('CheckboxInputExample', {
  key: CheckboxInputExampleKey,
  Model,
  Message,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Document' },
  effects,
})

const Provider = CheckboxInputExampleBlock.makeRequiredFieldBinding(PresentationProviderBlock, {
  field: 'provider',
  init: {
    contextToArgs: (): [PresentationProviderConfig] => [
      { id: 'selection-page', mode: 'shape', defaultShape: examplePresentation.shape ?? 'rounded' },
    ],
  },
})

const C0 = CheckboxInputExampleBlock.makeRequiredFieldBinding(CheckboxGroupBlock, {
  field: 'checks',
  init: {
    contextToArgs: () => [
      {
        ...exampleHoverConfig,
        id: 'checks',
        radius: exampleSelectionRadius,
        checkedIndices: [0],
        items: checks,
      },
    ],
  },
})

const Checks = C0.withOutMessagePolicy({
  fold: CheckboxInputExampleBlock.makeOutMessageFold(CheckboxGroupBlock, {
    Toggled: ({ index }) =>
      CheckboxInputExampleBlock.makeStep((model) => {
        const items = model.checks.checkedItems.map((item) =>
          item.index === index ? { ...item, checked: !item.checked } : item,
        )

        return Update.combineSteps([
          C0.requestItems({ items }),
          C0.requestSelection({
            indices: items.filter((item) => item.checked).map((item) => item.index),
          }),
          CheckboxInputExampleBlock.makeFieldsStep(() => ({
            notifications: Number.increment,
          })),
        ])
      }),
  }),
})

const C1 = CheckboxInputExampleBlock.makeRequiredFieldBinding(CheckboxGroupBlock, {
  field: 'baseChecks',
  init: {
    contextToArgs: () => [
      {
        ...exampleHoverConfig,
        id: 'base-checks',
        radius: exampleSelectionRadius,
        checkedIndices: [0],
        items: checks,
      },
    ],
  },
})

const BaseChecks = C1.withOutMessagePolicy({
  fold: CheckboxInputExampleBlock.makeOutMessageFold(CheckboxGroupBlock, {
    Toggled: ({ index }) =>
      CheckboxInputExampleBlock.makeStep((model) => {
        const items = model.baseChecks.checkedItems.map((item) =>
          item.index === index ? { ...item, checked: !item.checked } : item,
        )

        return Update.combineSteps([
          C1.requestItems({ items }),
          C1.requestSelection({
            indices: items.filter((item) => item.checked).map((item) => item.index),
          }),
          CheckboxInputExampleBlock.makeFieldsStep(() => ({
            notifications: Number.increment,
          })),
        ])
      }),
  }),
})

const R0 = CheckboxInputExampleBlock.makeRequiredFieldBinding(RadioGroupBlock, {
  field: 'radios',
  init: {
    contextToArgs: () => [{ ...exampleHoverConfig, id: 'radios', value: '0', items: values }],
  },
})

const Radios = R0.withOutMessagePolicy({
  fold: CheckboxInputExampleBlock.makeOutMessageFold(RadioGroupBlock, {
    Selected: ({ value }) =>
      Update.combineSteps([
        R0.requestSelection({ value: Option.getOrElse(value, () => '') }),
        CheckboxInputExampleBlock.makeFieldsStep(() => ({
          notifications: Number.increment,
        })),
      ]),
  }),
})

const R1 = CheckboxInputExampleBlock.makeRequiredFieldBinding(RadioGroupBlock, {
  field: 'baseRadios',
  init: {
    contextToArgs: () => [{ ...exampleHoverConfig, id: 'base-radios', value: '0', items: values }],
  },
})

const BaseRadios = R1.withOutMessagePolicy({
  fold: CheckboxInputExampleBlock.makeOutMessageFold(RadioGroupBlock, {
    Selected: ({ value }) =>
      Update.combineSteps([
        R1.requestSelection({ value: Option.getOrElse(value, () => '') }),
        CheckboxInputExampleBlock.makeFieldsStep(() => ({
          notifications: Number.increment,
        })),
      ]),
  }),
})

const Group = CheckboxInputExampleBlock.makeRequiredFieldBinding(InputGroupBlock, {
  field: 'group',
  init: { contextToArgs: () => [{ ...exampleHoverConfig, id: 'inputs' }] },
})

const F0 = CheckboxInputExampleBlock.makeRequiredFieldBinding(InputFieldBlock, {
  field: 'field',
  init: { contextToArgs: () => [{ id: 'name', index: 0, value: '' }] },
})

const Field = F0.withOutMessagePolicy({
  fold: CheckboxInputExampleBlock.makeOutMessageFold(InputFieldBlock, {
    Changed: ({ value }) =>
      CheckboxInputExampleBlock.makeStep((model) =>
        model.shouldAcceptInput
          ? F0.requestConfigure({ value, disabled: model.isDisabled, readOnly: false })
          : CheckboxInputExampleBlock.makeNoopStep(),
      ),
  }),
})

const CheckboxInputExampleComposition = CheckboxInputExampleBlock.makeComposition({
  bindings: [Provider, Checks, BaseChecks, Radios, BaseRadios, Group, Field],
})

const init = CheckboxInputExampleComposition.makeInit(() => ({
  model: {
    isCompact: false,
    isPill: examplePresentation.shape === 'pill',
    shape: examplePresentation.shape ?? 'rounded',
    isMounted: true,
    hasErrors: false,
    shouldAcceptInput: true,
    isDisabled: false,
    notifications: 0,
  },
}))

const update = CheckboxInputExampleComposition.makeUpdate({
  ClickedSize: CheckboxInputExampleBlock.makeFieldsStep(() => ({ isCompact: Boolean.not })),
  ClickedShape: CheckboxInputExampleBlock.makeStep((model) =>
    Update.combineSteps([
      CheckboxInputExampleBlock.makeFieldsStep(() => ({
        isPill: Boolean.not,
        shape: (shape) => (shape === 'pill' ? 'rounded' : 'pill'),
      })),
      Provider.requestShape({ shape: model.shape === 'pill' ? 'rounded' : 'pill' }),
      Checks.requestRadius({ radius: model.isPill ? 8 : 16 }),
      BaseChecks.requestRadius({ radius: model.isPill ? 8 : 16 }),
    ]),
  ),
  ClickedMount: CheckboxInputExampleBlock.makeFieldsStep(() => ({
    isMounted: Boolean.not,
  })),
  ClickedErrors: CheckboxInputExampleBlock.makeFieldsStep(() => ({
    hasErrors: Boolean.not,
  })),
  ClickedDisabled: CheckboxInputExampleBlock.makeStep((model) =>
    Update.combineSteps([
      CheckboxInputExampleBlock.makeFieldsStep(() => ({ isDisabled: Boolean.not })),
      Field.requestConfigure({
        value: model.field.value,
        disabled: !model.isDisabled,
        readOnly: false,
      }),
    ]),
  ),
  ClickedReject: CheckboxInputExampleBlock.makeFieldsStep(() => ({
    shouldAcceptInput: Boolean.not,
  })),
  ClickedExternal: CheckboxInputExampleBlock.makeStep((model) =>
    Field.requestConfigure({ value: 'external', disabled: model.isDisabled, readOnly: false }),
  ),
})

const motion = createTargetMotionScope('checkbox-input-forms')

const animateHighlight = hoverHighlightAnimation(motion)

const animateSelection = selectionBackgroundAnimation(motion)

const view = CheckboxInputExampleComposition.makeView((model, h) => {
  const presentation = {
    size: model.isCompact ? 'compact' : 'default',
    shape: model.shape,
  } satisfies { size: 'compact' | 'default'; shape: 'pill' | 'rounded' | 'sharp' }

  const animate = motion.node

  return {
    title: 'Fluid selection forms',
    body: h.block(
      Provider.embedView({
        slotId: model.provider.id,
        model: model.provider,
        viewInputs: {
          tag: 'main',
          attributes: childAttributes([h.Class('p-6')]),
          content: () => [
            h.div(
              [h.Class(classNames.toolbar)],
              [
                Button.view(
                  {
                    onClick: Message.ClickedSize(),
                    toView: (attributes) =>
                      h.button([...attributes.button, h.Id('set-size')], ['Size']),
                  },
                  h,
                ),
                Button.view(
                  {
                    onClick: Message.ClickedShape(),
                    toView: (attributes) =>
                      h.button([...attributes.button, h.Id('set-shape')], ['Shape']),
                  },
                  h,
                ),
                Button.view(
                  {
                    onClick: Message.ClickedMount(),
                    toView: (attributes) =>
                      h.button([...attributes.button, h.Id('set-mount')], ['Mount']),
                  },
                  h,
                ),
                Button.view(
                  {
                    onClick: Message.ClickedErrors(),
                    toView: (attributes) =>
                      h.button([...attributes.button, h.Id('set-errors')], ['Errors']),
                  },
                  h,
                ),
                Button.view(
                  {
                    onClick: Message.ClickedDisabled(),
                    toView: (attributes) =>
                      h.button([...attributes.button, h.Id('set-disabled')], ['Disabled']),
                  },
                  h,
                ),
                Button.view(
                  {
                    onClick: Message.ClickedExternal(),
                    toView: (attributes) =>
                      h.button([...attributes.button, h.Id('set-external')], ['External']),
                  },
                  h,
                ),
                Button.view(
                  {
                    onClick: Message.ClickedReject(),
                    toView: (attributes) =>
                      h.button([...attributes.button, h.Id('set-reject')], ['Reject edits']),
                  },
                  h,
                ),
              ],
            ),
            h.form(
              [h.Id('selection-form')],
              [
                model.isMounted
                  ? h.div(
                      [h.Class('grid grid-cols-[288px_288px] gap-[24px_32px]')],
                      [
                        h.section(
                          [],
                          [
                            h.h2([h.Class('m-[0_0_12px] text-[13px] font-normal')], ['Checkbox']),
                            h.block(
                              Checks.embedView({
                                slotId: 'checks',
                                model: model.checks,
                                viewInputs: {
                                  ...presentation,
                                  animate,
                                  animateHighlight,
                                  animateSelection,
                                  content: (context) =>
                                    labels.map((label, index) =>
                                      CheckboxItem({ label, index }, context, h),
                                    ),
                                },
                              }),
                            ),
                          ],
                        ),
                        h.section(
                          [],
                          [
                            h.h2(
                              [h.Class('m-[0_0_12px] text-[13px] font-normal')],
                              ['Checkbox Base'],
                            ),
                            h.block(
                              BaseChecks.embedView({
                                slotId: 'base-checks',
                                model: model.baseChecks,
                                viewInputs: {
                                  ...presentation,
                                  animate,
                                  animateHighlight,
                                  animateSelection,
                                  content: (context) =>
                                    labels.map((label, index) =>
                                      CheckboxItem({ label, index }, context, h),
                                    ),
                                },
                              }),
                            ),
                          ],
                        ),
                        h.section(
                          [],
                          [
                            h.h2([h.Class('m-[0_0_12px] text-[13px] font-normal')], ['Input']),
                            h.block(
                              Group.embedView({
                                slotId: 'inputs',
                                model: model.group,
                                viewInputs: {
                                  ...presentation,
                                  content: (context) => [
                                    h.block(
                                      Field.embedView({
                                        slotId: 'field',
                                        model: model.field,
                                        viewInputs: {
                                          ...context,
                                          label: 'Name',
                                          placeholder: 'Enter name',
                                          ...(model.hasErrors
                                            ? { error: 'Required name' }
                                            : undefined),
                                          inputAttributes: childAttributes([
                                            h.Name('name'),
                                            h.Required(true),
                                          ]),
                                        },
                                      }),
                                    ),
                                  ],
                                },
                              }),
                            ),
                          ],
                        ),
                      ],
                    )
                  : null,
                Button.view(
                  {
                    type: 'reset',
                    toView: (attributes) =>
                      h.button(
                        [
                          h.Class('m-[16px_8px_0_0] p-[4px_8px] [border:1px_solid_var(--border)]'),
                          ...attributes.button,
                          h.Id('form-reset'),
                        ],
                        ['Reset'],
                      ),
                  },
                  h,
                ),
                Button.view(
                  {
                    type: 'submit',
                    toView: (attributes) =>
                      h.button(
                        [
                          h.Class('m-[16px_8px_0_0] p-[4px_8px] [border:1px_solid_var(--border)]'),
                          ...attributes.button,
                          h.Id('form-submit'),
                        ],
                        ['Submit'],
                      ),
                  },
                  h,
                ),
              ],
            ),
            h.output(
              [h.Class('block mt-4 text-[12px]'), h.Id('selection-state')],
              [
                JSON.stringify({
                  notifications: model.notifications,
                  checks: model.checks.checkedIndices,
                  baseChecks: model.baseChecks.checkedIndices,
                  radio: Option.getOrNull(model.radios.value),
                  baseRadio: Option.getOrNull(model.baseRadios.value),
                  input: model.field.value,
                }),
              ],
            ),
          ],
        },
      }),
    ),
  }
})

export const CheckboxInputLayer = CheckboxInputExampleBlock.makeLayer({ init, update, view }).pipe(
  Layer.provide(
    Layer.mergeAll(
      CheckboxLayer,
      CheckboxLayer,
      RadioLayer,
      RadioLayer,
      InputGroupLayer,
      InputFieldLayer,
      ProviderLayer,
    ),
  ),
)

export const CheckboxInputMotionLayer = motion.layer
