import { Match, Schema } from 'effect'
import { Update } from 'foldkit'
import type { FluidConfiguration } from '../../playground/configuration'
import { FluidGalleryBlock } from './block'
import { Checkbox, Input, Search, Select, Switch, Textarea } from './core-bindings'
import { First, Last, Website } from './interactive-bindings'

export const selectItems = (preset: 'roles' | 'frameworks' | 'long') =>
  (preset === 'roles'
    ? ['Owner', 'Editor', 'Viewer', 'Guest']
    : preset === 'frameworks'
      ? ['React', 'Svelte', 'Vue', 'Solid']
      : [
          'Design and creative engineering',
          'Product and strategy',
          'Research and accessibility',
          'Infrastructure and developer experience',
        ]
  ).map((label) => ({ value: label, label }))
const equal = Schema.toEquivalence(
  Schema.Array(Schema.Struct({ value: Schema.String, label: Schema.String })),
)

export const reconcileSimpleInput = (
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
) =>
  FluidGalleryBlock.makeStep((model) =>
    Match.value(configuration).pipe(
      Match.tag('input', (c) =>
        model.input.value === c.value &&
        model.input.disabled === c.disabled &&
        model.input.readOnly === c.readOnly
          ? FluidGalleryBlock.makeNoopStep()
          : Input.requestConfigure({ value: c.value, disabled: c.disabled, readOnly: c.readOnly }),
      ),
      Match.tag('textarea', (c) =>
        model.textarea.value === c.value &&
        model.textarea.disabled === c.disabled &&
        model.textarea.readOnly === c.readOnly
          ? FluidGalleryBlock.makeNoopStep()
          : Textarea.requestConfigure({
              value: c.value,
              disabled: c.disabled,
              readOnly: c.readOnly,
            }),
      ),
      Match.tag('field', (c) =>
        model.search.value === c.value &&
        model.search.disabled === c.disabled &&
        model.search.readOnly === c.readOnly
          ? FluidGalleryBlock.makeNoopStep()
          : Search.requestConfigure({ value: c.value, disabled: c.disabled, readOnly: c.readOnly }),
      ),
      Match.tag('input-group', (c) =>
        Update.combineSteps([
          ...(model.first.value === c.firstValue &&
          model.first.disabled === c.disabled &&
          model.first.readOnly === c.readOnly
            ? []
            : [
                First.requestConfigure({
                  value: c.firstValue,
                  disabled: c.disabled,
                  readOnly: c.readOnly,
                }),
              ]),
          ...(model.last.value === c.secondValue &&
          model.last.disabled === c.disabled &&
          model.last.readOnly === c.readOnly
            ? []
            : [
                Last.requestConfigure({
                  value: c.secondValue,
                  disabled: c.disabled,
                  readOnly: c.readOnly,
                }),
              ]),
          ...(model.website.value === c.thirdValue &&
          model.website.disabled === c.disabled &&
          model.website.readOnly === c.readOnly
            ? []
            : [
                Website.requestConfigure({
                  value: c.thirdValue,
                  disabled: c.disabled,
                  readOnly: c.readOnly,
                }),
              ]),
        ]),
      ),
      Match.tag('checkbox', (c) =>
        model.checkbox.checked === c.checked &&
        model.checkbox.disabled === c.disabled &&
        model.checkbox.readOnly === c.readOnly
          ? FluidGalleryBlock.makeNoopStep()
          : Checkbox.requestConfigure({
              checked: c.checked,
              disabled: c.disabled,
              readOnly: c.readOnly,
            }),
      ),
      Match.tag('switch', (c) =>
        model.switch.checked === c.checked && model.switch.disabled === c.disabled
          ? FluidGalleryBlock.makeNoopStep()
          : Switch.requestConfigure({ checked: c.checked, disabled: c.disabled }),
      ),
      Match.tag('select', (c) => {
        const items = selectItems(c.itemsPreset)
        return equal(model.select.items, items) && model.select.disabled === c.disabled
          ? FluidGalleryBlock.makeNoopStep()
          : Select.requestConfigure({ items, disabled: c.disabled })
      }),
      Match.exhaustive,
    ),
  )
