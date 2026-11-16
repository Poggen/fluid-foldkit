import { checkboxGroupToolbar } from './checkbox-group-toolbar'
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

import { RadioGroupBlock, RadioItem, layer as RadioLayer } from '@foldkit-visuals/fluid/radio-group'
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

export const SelectionFormsExampleKey = Symbol('SelectionFormsExampleBlock')

export const SelectionFormsExampleBlock = Block.make('SelectionFormsExample', {
  key: SelectionFormsExampleKey,
  Model,
  Message,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Document' },
  effects,
})

const Provider = SelectionFormsExampleBlock.makeRequiredFieldBinding(PresentationProviderBlock, {
  field: 'provider',
  init: {
    contextToArgs: (): [PresentationProviderConfig] => [
      { id: 'selection-page', mode: 'shape', defaultShape: examplePresentation.shape ?? 'rounded' },
    ],
  },
})

const C0 = SelectionFormsExampleBlock.makeRequiredFieldBinding(CheckboxGroupBlock, {
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
  fold: SelectionFormsExampleBlock.makeOutMessageFold(CheckboxGroupBlock, {
    Toggled: ({ index }) =>
      SelectionFormsExampleBlock.makeStep((model) => {
        const items = model.checks.checkedItems.map((item) =>
          item.index === index ? { ...item, checked: !item.checked } : item,
        )

        return Update.combineSteps([
          C0.requestItems({ items }),
          C0.requestSelection({
            indices: items.filter((item) => item.checked).map((item) => item.index),
          }),
          SelectionFormsExampleBlock.makeFieldsStep(() => ({
            notifications: Number.increment,
          })),
        ])
      }),
  }),
})

const C1 = SelectionFormsExampleBlock.makeRequiredFieldBinding(CheckboxGroupBlock, {
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
  fold: SelectionFormsExampleBlock.makeOutMessageFold(CheckboxGroupBlock, {
    Toggled: ({ index }) =>
      SelectionFormsExampleBlock.makeStep((model) => {
        const items = model.baseChecks.checkedItems.map((item) =>
          item.index === index ? { ...item, checked: !item.checked } : item,
        )

        return Update.combineSteps([
          C1.requestItems({ items }),
          C1.requestSelection({
            indices: items.filter((item) => item.checked).map((item) => item.index),
          }),
          SelectionFormsExampleBlock.makeFieldsStep(() => ({
            notifications: Number.increment,
          })),
        ])
      }),
  }),
})

const R0 = SelectionFormsExampleBlock.makeRequiredFieldBinding(RadioGroupBlock, {
  field: 'radios',
  init: {
    contextToArgs: () => [{ ...exampleHoverConfig, id: 'radios', value: '0', items: values }],
  },
})

const Radios = R0.withOutMessagePolicy({
  fold: SelectionFormsExampleBlock.makeOutMessageFold(RadioGroupBlock, {
    Selected: ({ value }) =>
      Update.combineSteps([
        R0.requestSelection({ value: Option.getOrElse(value, () => '') }),
        SelectionFormsExampleBlock.makeFieldsStep(() => ({
          notifications: Number.increment,
        })),
      ]),
  }),
})

const R1 = SelectionFormsExampleBlock.makeRequiredFieldBinding(RadioGroupBlock, {
  field: 'baseRadios',
  init: {
    contextToArgs: () => [{ ...exampleHoverConfig, id: 'base-radios', value: '0', items: values }],
  },
})

const BaseRadios = R1.withOutMessagePolicy({
  fold: SelectionFormsExampleBlock.makeOutMessageFold(RadioGroupBlock, {
    Selected: ({ value }) =>
      Update.combineSteps([
        R1.requestSelection({ value: Option.getOrElse(value, () => '') }),
        SelectionFormsExampleBlock.makeFieldsStep(() => ({
          notifications: Number.increment,
        })),
      ]),
  }),
})

const Group = SelectionFormsExampleBlock.makeRequiredFieldBinding(InputGroupBlock, {
  field: 'group',
  init: { contextToArgs: () => [{ ...exampleHoverConfig, id: 'inputs' }] },
})

const F0 = SelectionFormsExampleBlock.makeRequiredFieldBinding(InputFieldBlock, {
  field: 'field',
  init: { contextToArgs: () => [{ id: 'name', index: 0, value: '' }] },
})

const Field = F0.withOutMessagePolicy({
  fold: SelectionFormsExampleBlock.makeOutMessageFold(InputFieldBlock, {
    Changed: ({ value }) =>
      SelectionFormsExampleBlock.makeStep((model) =>
        model.shouldAcceptInput
          ? F0.requestConfigure({ value, disabled: model.isDisabled, readOnly: false })
          : SelectionFormsExampleBlock.makeNoopStep(),
      ),
  }),
})

const SelectionFormsExampleComposition = SelectionFormsExampleBlock.makeComposition({
  bindings: [Provider, Checks, BaseChecks, Radios, BaseRadios, Group, Field],
})
export type SelectionFormsViewBuilder = Block.ViewBuilderFor<
  typeof SelectionFormsExampleComposition
>

const init = SelectionFormsExampleComposition.makeInit(() => ({
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

const update = SelectionFormsExampleComposition.makeUpdate({
  ClickedSize: SelectionFormsExampleBlock.makeFieldsStep(() => ({ isCompact: Boolean.not })),
  ClickedShape: SelectionFormsExampleBlock.makeStep((model) =>
    Update.combineSteps([
      SelectionFormsExampleBlock.makeFieldsStep(() => ({
        isPill: Boolean.not,
        shape: (shape) => (shape === 'pill' ? 'rounded' : 'pill'),
      })),
      Provider.requestShape({ shape: model.shape === 'pill' ? 'rounded' : 'pill' }),
      Checks.requestRadius({ radius: model.isPill ? 8 : 16 }),
      BaseChecks.requestRadius({ radius: model.isPill ? 8 : 16 }),
    ]),
  ),
  ClickedMount: SelectionFormsExampleBlock.makeFieldsStep(() => ({
    isMounted: Boolean.not,
  })),
  ClickedErrors: SelectionFormsExampleBlock.makeFieldsStep(() => ({
    hasErrors: Boolean.not,
  })),
  ClickedDisabled: SelectionFormsExampleBlock.makeStep((model) =>
    Update.combineSteps([
      SelectionFormsExampleBlock.makeFieldsStep(() => ({ isDisabled: Boolean.not })),
      Field.requestConfigure({
        value: model.field.value,
        disabled: !model.isDisabled,
        readOnly: false,
      }),
    ]),
  ),
  ClickedReject: SelectionFormsExampleBlock.makeFieldsStep(() => ({
    shouldAcceptInput: Boolean.not,
  })),
  ClickedExternal: SelectionFormsExampleBlock.makeStep((model) =>
    Field.requestConfigure({ value: 'external', disabled: model.isDisabled, readOnly: false }),
  ),
})

const motion = createTargetMotionScope('selection-forms')

const animateHighlight = hoverHighlightAnimation(motion)

const animateSelection = selectionBackgroundAnimation(motion)

const view = SelectionFormsExampleComposition.makeView((model, h) => {
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
            checkboxGroupToolbar(Message, h),
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
                            h.h2([h.Class('m-[0_0_12px] text-[13px] font-normal')], ['Radio']),
                            h.block(
                              Radios.embedView({
                                slotId: 'radios',
                                model: model.radios,
                                viewInputs: {
                                  ...presentation,
                                  animate,
                                  animateHighlight,
                                  content: (context) =>
                                    labels.map((label, index) =>
                                      RadioItem({ label, index }, context, h),
                                    ),
                                },
                              }),
                            ),
                          ],
                        ),
                        h.section(
                          [],
                          [
                            h.h2([h.Class('m-[0_0_12px] text-[13px] font-normal')], ['Radio Base']),
                            h.block(
                              BaseRadios.embedView({
                                slotId: 'base-radios',
                                model: model.baseRadios,
                                viewInputs: {
                                  ...presentation,
                                  animate,
                                  animateHighlight,
                                  content: (context) =>
                                    labels.map((label, index) =>
                                      RadioItem({ label, index }, context, h),
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

export const SelectionFormsLayer = SelectionFormsExampleBlock.makeLayer({
  init,
  update,
  view,
}).pipe(
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

export const SelectionFormsMotionLayer = motion.layer
