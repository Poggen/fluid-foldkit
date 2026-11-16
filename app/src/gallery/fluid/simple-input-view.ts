import { Match } from 'effect'
import { Field, FieldDescription, FieldError, FieldLabel } from '@foldkit-visuals/fluid/field'
import { defaultIcons } from '@foldkit-visuals/fluid/icons'
import { childAttributes, createKeyedLazy } from 'foldkit/html'
import type { FluidConfiguration } from '../../playground/configuration'
import type { ResolvedSettings } from '../../settings'
import { target } from '../../motion'
import type { FluidGalleryModel } from './block'
import type { FluidViewBuilder } from './composition'
import { Checkbox, Input, Search, Select, Switch, Textarea, switchMotion } from './core-bindings'
import { First, Group, Last, Website } from './interactive-bindings'
import { configuredContext } from './configuration-presentation'

const renderInput = (
  input: FluidGalleryModel['input'],
  c: Extract<FluidConfiguration, { readonly _tag: 'input' }>,
  shape: ResolvedSettings['shape'],
  size: ResolvedSettings['size'],
  hover: ResolvedSettings['hover'],
  h: FluidViewBuilder,
) => {
  const context = configuredContext({ shape, size, hover }, c.appearance, c.size)
  return h.block(
    Input.embedView({
      slotId: 'input',
      model: input,
      viewInputs: {
        context,
        type: c.type,
        name: c.name,
        placeholder: c.placeholder,
        invalid: c.invalid,
        attributes: c.required ? childAttributes([h.Attribute('required', '')]) : [],
      },
    }),
  )
}

const renderTextarea = (
  textarea: FluidGalleryModel['textarea'],
  c: Extract<FluidConfiguration, { readonly _tag: 'textarea' }>,
  shape: ResolvedSettings['shape'],
  size: ResolvedSettings['size'],
  hover: ResolvedSettings['hover'],
  h: FluidViewBuilder,
) => {
  const context = configuredContext({ shape, size, hover }, c.appearance, c.size)
  return h.block(
    Textarea.embedView({
      slotId: 'textarea',
      model: textarea,
      viewInputs: { context, name: c.name, placeholder: c.placeholder, invalid: c.invalid },
    }),
  )
}

const renderField = (
  search: FluidGalleryModel['search'],
  c: Extract<FluidConfiguration, { readonly _tag: 'field' }>,
  shape: ResolvedSettings['shape'],
  size: ResolvedSettings['size'],
  hover: ResolvedSettings['hover'],
  h: FluidViewBuilder,
) => {
  const context = configuredContext({ shape, size, hover }, c.appearance, c.size)
  return Field(
    {
      context,
      orientation: c.orientation,
      invalid: c.invalid,
      children: [
        FieldLabel({ context, htmlFor: search.id, children: [c.label] }, h),
        h.block(
          Search.embedView({
            slotId: 'field-input',
            model: search,
            viewInputs: { context, placeholder: c.placeholder, invalid: c.invalid },
          }),
        ),
        ...(c.showDescription ? [FieldDescription({ children: [c.description] }, h)] : []),
        ...(c.invalid ? [FieldError({ children: [c.error] }, h)] : []),
      ],
    },
    h,
  )
}

const renderInputGroup = (
  group: FluidGalleryModel['group'],
  first: FluidGalleryModel['first'],
  last: FluidGalleryModel['last'],
  website: FluidGalleryModel['website'],
  c: Extract<FluidConfiguration, { readonly _tag: 'input-group' }>,
  shape: ResolvedSettings['shape'],
  size: ResolvedSettings['size'],
  hover: ResolvedSettings['hover'],
  h: FluidViewBuilder,
) => {
  const context = configuredContext({ shape, size, hover }, c.appearance, c.size)
  return h.block(
    Group.embedView({
      slotId: 'input-group',
      model: group,
      viewInputs: {
        context,
        content: (group) => [
          h.block(
            First.embedView({
              slotId: 'first',
              model: first,
              viewInputs: {
                context,
                activeIndex: group.activeIndex,
                label: c.firstLabel,
                labelHidden: c.hideLabels,
                placeholder: c.placeholder,
                ...(c.showIcons ? { icon: defaultIcons.user } : {}),
                ...(c.invalid ? { error: 'Check this value' } : {}),
              },
            }),
          ),
          ...(c.count > 1
            ? [
                h.block(
                  Last.embedView({
                    slotId: 'last',
                    model: last,
                    viewInputs: {
                      context,
                      activeIndex: group.activeIndex,
                      label: c.secondLabel,
                      labelHidden: c.hideLabels,
                      placeholder: c.placeholder,
                      ...(c.showIcons ? { icon: defaultIcons.mail } : {}),
                      ...(c.invalid ? { error: 'Check this value' } : {}),
                    },
                  }),
                ),
              ]
            : []),
          ...(c.count > 2
            ? [
                h.block(
                  Website.embedView({
                    slotId: 'website',
                    model: website,
                    viewInputs: {
                      context,
                      activeIndex: group.activeIndex,
                      label: c.thirdLabel,
                      labelHidden: c.hideLabels,
                      placeholder: c.placeholder,
                      ...(c.showIcons ? { icon: defaultIcons.globe } : {}),
                      ...(c.invalid ? { error: 'Check this value' } : {}),
                    },
                  }),
                ),
              ]
            : []),
        ],
      },
    }),
  )
}

const renderCheckbox = (
  checkbox: FluidGalleryModel['checkbox'],
  c: Extract<FluidConfiguration, { readonly _tag: 'checkbox' }>,
  shape: ResolvedSettings['shape'],
  size: ResolvedSettings['size'],
  hover: ResolvedSettings['hover'],
  h: FluidViewBuilder,
) => {
  const context = configuredContext({ shape, size, hover }, c.appearance, c.size)
  return Field(
    {
      context,
      orientation: 'horizontal',
      invalid: c.invalid,
      children: [
        h.block(
          Checkbox.embedView({
            slotId: 'checkbox',
            model: checkbox,
            viewInputs: {
              context,
              animate: target.node,
              label: c.label,
              name: c.name,
              value: c.formValue,
              required: c.required,
              invalid: c.invalid,
            },
          }),
        ),
        FieldLabel({ context, htmlFor: checkbox.id, children: [c.label] }, h),
      ],
    },
    h,
  )
}

const renderSwitch = (
  switchModel: FluidGalleryModel['switch'],
  c: Extract<FluidConfiguration, { readonly _tag: 'switch' }>,
  shape: ResolvedSettings['shape'],
  size: ResolvedSettings['size'],
  hover: ResolvedSettings['hover'],
  h: FluidViewBuilder,
) => {
  const context = configuredContext({ shape, size, hover }, c.appearance, undefined)
  return h.block(
    Switch.embedView({
      slotId: 'switch',
      model: switchModel,
      viewInputs: { context, label: c.label, animate: switchMotion.node },
    }),
  )
}

const renderSelect = (
  select: FluidGalleryModel['select'],
  c: Extract<FluidConfiguration, { readonly _tag: 'select' }>,
  shape: ResolvedSettings['shape'],
  size: ResolvedSettings['size'],
  hover: ResolvedSettings['hover'],
  h: FluidViewBuilder,
) => {
  const context = configuredContext({ shape, size, hover }, c.appearance, c.size)
  return h.block(
    Select.embedView({
      slotId: 'select',
      model: select,
      viewInputs: {
        context,
        animate: target.node,
        placeholder: c.placeholder,
        variant: c.variant,
        name: c.name,
        required: c.required,
        ...(c.error ? { error: 'Select a role' } : {}),
        ...(c.showIcon ? { icon: defaultIcons.user } : {}),
      },
    }),
  )
}

export const makeSimpleInputView = () => {
  const lazy = createKeyedLazy()
  return (
    model: FluidGalleryModel,
    configuration: Extract<
      FluidConfiguration,
      {
        readonly _tag:
          | 'input'
          | 'textarea'
          | 'field'
          | 'input-group'
          | 'checkbox'
          | 'switch'
          | 'select'
      }
    >,
    settings: ResolvedSettings,
    h: FluidViewBuilder,
  ) =>
    Match.value(configuration).pipe(
      Match.tag('input', (c) =>
        lazy('input', renderInput, [
          model.input,
          c,
          settings.shape,
          settings.size,
          settings.hover,
          h,
        ]),
      ),
      Match.tag('textarea', (c) =>
        lazy('textarea', renderTextarea, [
          model.textarea,
          c,
          settings.shape,
          settings.size,
          settings.hover,
          h,
        ]),
      ),
      Match.tag('field', (c) =>
        lazy('field', renderField, [
          model.search,
          c,
          settings.shape,
          settings.size,
          settings.hover,
          h,
        ]),
      ),
      Match.tag('input-group', (c) =>
        lazy('input-group', renderInputGroup, [
          model.group,
          model.first,
          model.last,
          model.website,
          c,
          settings.shape,
          settings.size,
          settings.hover,
          h,
        ]),
      ),
      Match.tag('checkbox', (c) =>
        lazy('checkbox', renderCheckbox, [
          model.checkbox,
          c,
          settings.shape,
          settings.size,
          settings.hover,
          h,
        ]),
      ),
      Match.tag('switch', (c) =>
        lazy('switch', renderSwitch, [
          model.switch,
          c,
          settings.shape,
          settings.size,
          settings.hover,
          h,
        ]),
      ),
      Match.tag('select', (c) =>
        lazy('select', renderSelect, [
          model.select,
          c,
          settings.shape,
          settings.size,
          settings.hover,
          h,
        ]),
      ),
      Match.exhaustive,
    )
}
