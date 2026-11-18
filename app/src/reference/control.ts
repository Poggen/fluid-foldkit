import { modifyFields } from 'foldkit/struct'
import { SelectBlock, layer as SelectLayer } from '@foldkit-visuals/fluid/select'
import { SwitchBlock, SwitchLayer } from '@foldkit-visuals/fluid/switch'
import { Input } from '@foldkit/ui'
import { Layer, Schema } from 'effect'
import { Block, Update } from 'foldkit'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import type { Control } from '../playground/control-definition'
import { switchMotion } from '../gallery/fluid/core-bindings'
import { target } from '../motion'
import { presentation, type ResolvedSettings as Settings } from '../settings'
const Value = Schema.Union([Schema.String, Schema.Finite, Schema.Boolean])
const Config = Schema.Struct({
  prop: Schema.String,
  label: Schema.String,
  group: Schema.String,
  disabled: Schema.Boolean,
  kind: Schema.Literals(['choice', 'toggle', 'text', 'number']),
  value: Value,
  values: Schema.Array(Schema.Union([Schema.String, Schema.Finite])),
  min: Schema.Finite,
  max: Schema.Finite,
  step: Schema.Finite,
})
export const controlConfig = (control: Control) => ({
  prop: control.prop,
  label: control.label ?? labelFor(control.prop),
  group: control.group ?? 'Properties',
  disabled: control.enabled === false,
  kind: control.kind,
  value: control.initial,
  values: control.kind === 'choice' ? control.values : [],
  min: control.kind === 'number' ? control.min : 0,
  max: control.kind === 'number' ? control.max : 100,
  step: control.kind === 'number' ? control.step : 1,
})
const key = Symbol('PropControl')
export const PropControlBlock = Block.make('PropControl', {
  key,
  InitArgs: Schema.Tuple([Config]),
  ChildInitContext: Config,
  Model: Schema.Struct({ ...Config.fields, select: SelectBlock.Model, toggle: SwitchBlock.Model }),
  Message: defineMessageUnion({ Edited: { value: Schema.String } }),
  InMessage: defineInMessageUnion({
    InformedOfValue: { value: Value },
    InformedOfBounds: { min: Schema.Finite, max: Schema.Finite, step: Schema.Finite },
    InformedOfAvailability: { disabled: Schema.Boolean },
  }),
  OutMessage: defineMessageUnion({ Changed: { prop: Schema.String, value: Value } }),
  effects: Block.makeEffectsContract<
    never,
    Block.FactsOf<typeof SelectBlock>['programRequirements']
  >(),
  view: {
    kind: 'Element',
    Inputs: Block.makeInputContract<{
      readonly settings: Pick<Settings, 'shape' | 'size' | 'hover'>
      readonly ready?: boolean
    }>(),
  },
})
const SelectRequests = PropControlBlock.makeRequiredFieldBinding(SelectBlock, {
  field: 'select',
  init: {
    contextToArgs: (config) => [
      {
        id: `prop-${config.prop}-select`,
        items: config.values.map((value) => ({
          value: String(value),
          label: optionLabel(String(value)),
        })),
        value: String(config.value),
        disabled: config.disabled,
      },
    ],
  },
})
const Select = SelectRequests.withOutMessagePolicy({
  fold: PropControlBlock.makeOutMessageFold(SelectBlock, {
    Selected: ({ value }) =>
      PropControlBlock.makeStep((model) => {
        const next = typeof model.value === 'number' ? Number(value) : value
        const steps = Update.combineSteps([
          PropControlBlock.makeFieldsStep(() => ({ value: () => next })),
          SelectRequests.requestConfigure({ items: model.select.items, value }),
        ])
        return (connected: Parameters<typeof steps>[0]) =>
          Update.withOutMessage(
            steps(connected),
            PropControlBlock.OutMessage.Changed({ prop: model.prop, value: next }),
          )
      }),
    OpenChanged: PropControlBlock.makeNoopStep,
  }),
})
const ToggleRequests = PropControlBlock.makeRequiredFieldBinding(SwitchBlock, {
  field: 'toggle',
  init: {
    contextToArgs: (config) => [
      {
        id: `prop-${config.prop}-toggle`,
        checked: config.value === true,
        disabled: config.disabled,
      },
    ],
  },
})
const Toggle = ToggleRequests.withOutMessagePolicy({
  fold: PropControlBlock.makeOutMessageFold(SwitchBlock, {
    Toggled: () =>
      PropControlBlock.makeStep((model) => {
        const value = !model.toggle.checked
        const configure = ToggleRequests.requestConfigure({
          checked: value,
          disabled: model.disabled,
        })
        return PropControlBlock.makeStep(
          () => (connected: Parameters<typeof configure>[0]) =>
            Update.withOutMessage(
              Update.combineSteps(connected, [
                configure,
                PropControlBlock.makeStep((next) => ({
                  model: modifyFields(next, { value: () => value }),
                })),
              ]),
              PropControlBlock.OutMessage.Changed({ prop: model.prop, value }),
            ),
        )
      }),
  }),
})
const PropControlComposition = PropControlBlock.makeComposition({ bindings: [Select, Toggle] })
export const labelFor = (value: string) =>
  value
    .replaceAll(
      /([a-z])([A-Z])/gu,
      (_match: string, left: string, right: string) => `${left} ${right.toLowerCase()}`,
    )
    .replace(/^./u, (value) => value.toUpperCase())
const optionLabel = (value: string) =>
  value === 'one' ? 'One at a time' : value === 'any' ? 'Any number' : labelFor(value)
const plans = {
  init: PropControlComposition.makeInit((config) => ({ model: config, childInitContext: config })),
  update: PropControlComposition.makeUpdate({
    Edited: PropControlBlock.makeStep((model, { value }) => {
      if (model.disabled) return { model }
      const next = model.kind === 'number' ? Number(value) : value
      if (typeof next === 'number' && !Number.isFinite(next)) return { model }
      return Update.withOutMessage(
        { model: modifyFields(model, { value: () => next }) },
        PropControlBlock.OutMessage.Changed({ prop: model.prop, value: next }),
      )
    }),
  }),
  inMessageUpdate: PropControlComposition.makeInMessageUpdate({
    InformedOfBounds: PropControlBlock.makeFieldsStep.fromMessage(({ min, max, step }) => ({
      min: () => min,
      max: () => max,
      step: () => step,
    })),
    InformedOfAvailability: PropControlBlock.makeStep((model, { disabled }) =>
      model.disabled === disabled
        ? { model }
        : Update.combineSteps([
            PropControlBlock.makeFieldsStep(() => ({ disabled: () => disabled })),
            SelectRequests.requestConfigure({
              items: model.select.items,
              value: String(model.value),
              disabled,
            }),
            ToggleRequests.requestConfigure({ checked: model.value === true, disabled }),
          ]),
    ),
    InformedOfValue: PropControlBlock.makeStep((model, { value }) =>
      Update.combineSteps([
        PropControlBlock.makeFieldsStep(() => ({ value: () => value })),
        ...(model.kind === 'choice'
          ? [
              Select.requestConfigure({
                items: model.values.map((value) => ({
                  value: String(value),
                  label: optionLabel(String(value)),
                })),
                value: String(value),
              }),
            ]
          : []),
        ...(model.kind === 'toggle'
          ? [Toggle.requestConfigure({ checked: value === true, disabled: model.disabled })]
          : []),
      ]),
    ),
  }),
  view: PropControlComposition.makeView.withInputs((model, inputs, h) => {
    const context = presentation(inputs.settings)
    const label = model.prop === 'buttonSize' ? 'Size' : model.label
    if (model.kind === 'toggle')
      return h.div(inputs.ready === false ? [h.Attribute('inert', '')] : [], [
        h.block(
          Toggle.embedView({
            slotId: 'toggle',
            model: model.toggle,
            viewInputs: {
              context,
              label,
              layout: 'settings-row',
              animate: (node, animation) =>
                typeof window === 'undefined' ? node : switchMotion.node(node, animation),
            },
          }),
        ),
      ])
    return h.div(
      [
        h.Class('flex items-center justify-between pl-2'),
        ...(model.kind === 'choice' && inputs.ready === false ? [h.Attribute('inert', '')] : []),
      ],
      [
        h.label(
          [
            h.For(
              model.kind === 'choice'
                ? `${model.select.menu.controller.id}-trigger`
                : `playground-${model.prop}`,
            ),
            h.Class('text-site-body text-muted-foreground'),
          ],
          [label],
        ),
        model.kind === 'choice'
          ? h.block(
              Select.embedView({
                slotId: 'select',
                model: model.select,
                viewInputs: {
                  context,
                  variant: 'borderless',
                  className: '',
                  triggerClassName: 'play-row relative z-10 min-w-0 w-auto px-2 text-site-body',
                  ariaLabel: label,
                  animate: target.node,
                },
              }),
            )
          : Input.view(
              {
                id: `playground-${model.prop}`,
                value: String(model.value),
                isDisabled: model.disabled,
                type: model.kind === 'number' ? 'number' : 'text',
                onInput: (value) => PropControlBlock.Message.Edited({ value }),
                toView: (attributes) =>
                  h.input([
                    ...attributes.input,
                    h.DataAttribute('playground-editable', model.prop),
                    h.Class(
                      'h-7 w-[124px] rounded-md bg-transparent px-2 text-right text-site-body text-foreground transition-colors duration-80 hover:bg-hover focus:bg-hover outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--focus-ring,#6B97FF)] pointer-coarse:text-[16px]',
                    ),
                    ...(model.kind === 'number'
                      ? [
                          h.Min(String(model.min)),
                          h.Max(String(model.max)),
                          h.Step(String(model.step)),
                        ]
                      : []),
                  ]),
              },
              h,
            ),
      ],
    )
  }),
}
export const layer = PropControlBlock.makeLayer<typeof plans>(plans).pipe(
  Layer.provide(Layer.mergeAll(SelectLayer, SwitchLayer)),
)
