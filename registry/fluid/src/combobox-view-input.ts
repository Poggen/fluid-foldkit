/* @license Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud. */
import { Array, Option } from 'effect'
import * as Primitive from '@foldkit/ui/input'
import type { Block } from 'foldkit'
import { Message } from './combobox-definition.js'
import type { Model, Composition } from './combobox-definition.js'
import type { ComboboxViewInputs } from './combobox-view.js'
import { resolvePresentation } from './presentation.js'
import { cn } from './lib/utils.js'

export const comboboxInput = (
  model: typeof Model.Type,
  inputs: ComboboxViewInputs,
  h: Block.ViewBuilderFor<typeof Composition>,
  hasActive: boolean,
) => {
  const { size } = resolvePresentation(inputs)
  const listId = `${model.id}-list`
  const invalid = inputs.invalid === true || Boolean(inputs.error)
  const activeIndex = Option.getOrNull(model.activeIndex)
  let fieldSize = size.variant === 'compact' ? 'leading-5' : 'leading-6'

  if (model.multiple) {
    fieldSize = size.variant === 'compact' ? 'h-5 leading-5' : 'h-6 leading-6'
  }

  return Primitive.view(
    {
      id: `${model.id}-input`,
      value: model.query,
      isDisabled: model.disabled,
      isInvalid: invalid,
      onInput: (nextQuery) => Message.Inputted({ query: nextQuery }),
      toView: ({ input: attributes }) =>
        h.input([
          ...attributes,
          h.Key('input'),
          h.Role('combobox'),
          h.AriaLabel(inputs.ariaLabel ?? inputs.placeholder ?? 'Search'),
          h.AriaExpanded(model.open),
          h.AriaControls(listId),
          h.AriaAutocomplete('list'),
          ...(!hasActive || !model.open
            ? []
            : [h.AriaActiveDescendant(`${model.id}-item-${activeIndex}`)]),
          h.AriaInvalid(invalid),
          ...(inputs.required === true ? [h.AriaRequired(true)] : []),
          ...(inputs.error ? [h.AriaDescribedBy(`${model.id}-error`)] : []),
          h.Required((inputs.required ?? false) && model.values.length === 0),
          h.Autocomplete('off'),
          h.Autocorrect('off'),
          h.Spellcheck(false),
          h.Placeholder(
            model.multiple
              ? Array.match(model.values, {
                  onEmpty: () => inputs.placeholder ?? 'Search…',
                  onNonEmpty: () => '',
                })
              : (inputs.placeholder ?? 'Search…'),
          ),
          ...(model.multiple ? [h.Size(Math.max(1, model.query.length + 1))] : []),
          ...(inputs.form === undefined ? [] : [h.FormAttr(inputs.form)]),
          h.Class(
            cn(
              model.multiple
                ? 'w-full min-w-0 rounded-none bg-transparent text-foreground placeholder:text-muted-foreground outline-none font-[inherit]'
                : 'min-w-0 flex-1 rounded-none bg-transparent text-foreground placeholder:text-muted-foreground outline-none font-[inherit]',
              size.field,
              fieldSize,
            ),
          ),
        ]),
    },
    h,
  )
}
