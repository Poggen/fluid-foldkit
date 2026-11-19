/* @license Derived from Fluid Functionalism f8014098. MIT, copyright 2026 Micka Touillaud. */
import type {
  DataTableColumn,
  DataTableFilterValue,
  DataTableModel,
} from './data-table-definition.js'
import type { SelectConfig } from './select.js'

type Chip = Exclude<DataTableFilterValue, string>
type FilterState = Pick<DataTableModel, 'id' | 'columns' | 'filters' | 'disabled'>
export const addFilterKey = 'add'
export const operatorKey = (column: string) => 'operator-' + column

export const emptyColumnFilter: (column: DataTableColumn) => Chip = function emptyColumnFilter(
  column: DataTableColumn,
) {
  const type = typeof column.filter === 'string' ? column.filter : column.editor?.type
  switch (type) {
    case 'number':
      return { kind: 'number' }
    case 'date':
      return { kind: 'date' }
    case 'select':
    case 'tags':
    case 'options':
      return { kind: 'options', values: [] }
    default:
      return { kind: 'text', query: '' }
  }
}

const operators = {
  text: [
    'contains',
    'does not contain',
    'is',
    'is not',
    'starts with',
    'ends with',
    'is empty',
    'is not empty',
  ],
  date: ['between', 'before', 'after'],
  options: ['is', 'is not'],
} as const

export const filterChip = (value: DataTableFilterValue) =>
  typeof value === 'string' ? ({ kind: 'text', query: value } satisfies Chip) : value

export function filterSelectOptions(model: FilterState) {
  const available = model.columns.filter(
    (column) => column.filter !== false && !model.filters.some((filter) => filter.id === column.id),
  )
  const selects: { key: string; config: SelectConfig & { value: string; disabled: boolean } }[] = [
    {
      key: addFilterKey,
      config: {
        id: model.id + '-filter-add',
        items: available.map((column) => ({ value: column.id, label: column.header })),
        value: '',
        disabled: model.disabled || !available.length,
      },
    },
  ]
  for (const filter of model.filters) {
    const chip = filterChip(filter.value)
    if (chip.kind === 'number' || !model.columns.some((column) => column.id === filter.id)) continue
    const key = operatorKey(filter.id)
    const choices = operators[chip.kind]
    selects.push({
      key,
      config: {
        id: model.id + '-filter-' + key,
        items: choices.map((value) => ({ value, label: value })),
        value: chip.op ?? choices[0],
        disabled: model.disabled,
      },
    })
  }
  return selects
}

export function selectedFilter(model: FilterState, key: string, selected: string) {
  if (model.disabled) return
  if (key === addFilterKey) {
    const column = model.columns.find((column) => column.id === selected && column.filter !== false)
    if (column && !model.filters.some((filter) => filter.id === selected))
      return { id: selected, value: emptyColumnFilter(column) }
    return
  }
  const filter = model.filters.find((filter) => operatorKey(filter.id) === key)
  if (!filter) return
  const chip = filterChip(filter.value)
  switch (chip.kind) {
    case 'number':
      return
    case 'text': {
      const op = operators.text.find((value) => value === selected)
      if (op) return { id: filter.id, value: { ...chip, op } }
      return
    }
    case 'options': {
      const op = operators.options.find((value) => value === selected)
      if (op) return { id: filter.id, value: { ...chip, op } }
      return
    }
    case 'date': {
      const op = operators.date.find((value) => value === selected)
      if (op) return { id: filter.id, value: { ...chip, op } }
      return
    }
  }
}
