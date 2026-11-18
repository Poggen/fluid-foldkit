/* @license Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud. */
import type { Model } from './combobox-definition.js'
import type { ComboboxViewInputs } from './combobox-view.js'
import type { SelectOption } from './select.js'
import { Option } from 'effect'
export const presentedComboboxOptions = (model: typeof Model.Type, inputs: ComboboxViewInputs) => {
  const selectedLabel = model.items.find((item) => item.value === model.values[0])?.label ?? ''

  const filterQuery = !model.open
    ? Option.getOrElse(model.closingQuery, () => model.query)
    : model.query
  const query = filterQuery.trim()
  const unfiltered =
    (model.open || Option.isNone(model.closingQuery)) &&
    !model.multiple &&
    filterQuery === selectedLabel
  const visible = model.items.filter(
    (item) =>
      (!model.multiple || !model.hideSelected || !model.values.includes(item.value)) &&
      (query === '' ||
        unfiltered ||
        (inputs.filter?.(item, query) ??
          item.label.toLocaleLowerCase().includes(query.toLocaleLowerCase()))),
  )
  const createQuery = model.query.trim()
  const canCreate =
    model.allowCreate &&
    createQuery !== '' &&
    !model.items.some((item) => item.label.toLocaleLowerCase() === createQuery.toLocaleLowerCase())
  const presented: ReadonlyArray<SelectOption> = canCreate
    ? [
        ...visible,
        {
          value: '\u0000create',
          label: inputs.createLabel?.(createQuery) ?? `Create “${createQuery}”`,
        },
      ]
    : visible
  return { presented, query }
}
