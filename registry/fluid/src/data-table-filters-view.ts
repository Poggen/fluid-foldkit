// Derived from Fluid Functionalism f8014098. MIT, copyright 2026 Micka Touillaud.
import type { Html } from 'foldkit/html'
import { Button } from './button.js'
import {
  Message,
  type DataTableColumn,
  type DataTableViewBuilder,
  type DataTableFilterValue,
  type DataTableModel,
  type DataTableViewInputs,
} from './data-table-definition.js'
import { resolvePresentation } from './presentation.js'

type Chip = Exclude<DataTableFilterValue, string>
const segment =
  'relative z-[1] inline-flex h-full min-w-0 items-center gap-1 px-1 outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--focus-ring,#6B97FF)] transition-[background-color] duration-80 aria-expanded:bg-active'

export function emptyColumnFilter(column: DataTableColumn): Chip {
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

const filterPicker = (model: DataTableModel, h: DataTableViewBuilder) => {
  const available = model.columns.filter(
    (column) => column.filter !== false && !model.filters.some((filter) => filter.id === column.id),
  )
  return h.select(
    [
      h.AriaLabel('Add a filter'),
      h.Disabled(available.length === 0 || model.disabled),
      h.Class('max-w-36 cursor-pointer bg-transparent text-caption text-muted-foreground'),
      h.Value(''),
      h.OnInput((id) => {
        const column = available.find((option) => option.id === id)
        return column
          ? Message.FilterChanged({ id, value: emptyColumnFilter(column) })
          : Message.MenuChanged({ menu: null })
      }),
    ],
    [
      h.option([h.Value(''), h.Disabled(true), h.Selected(true)], ['Add filter']),
      ...available.map((column) => h.option([h.Value(column.id)], [column.header])),
    ],
  )
}

export function DataTableFilters(
  model: DataTableModel,
  h: DataTableViewBuilder,
  inputs: DataTableViewInputs,
): Html {
  if (model.filters.length === 0) return filterPicker(model, h)
  return Button(
    {
      ...inputs,
      variant: 'ghost',
      buttonSize: 'compact',
      disabled: model.disabled,
      attributes: [
        h.AriaExpanded(!model.filtersHidden),
        h.OnClick(Message.FiltersVisibilityChanged()),
      ],
      children: [`Filters (${model.filters.length})`],
    },
    h,
  )
}

function operator<T extends string>(
  h: DataTableViewBuilder,
  label: string,
  current: T,
  choices: readonly T[],
  change: (value: T) => typeof Message.Type,
) {
  return h.select(
    [
      h.AriaLabel(label),
      h.Class(segment),
      h.Value(current),
      h.OnInput((word) => change(choices.find((choice) => choice === word) ?? current)),
    ],
    choices.map((choice) => h.option([h.Value(choice), h.Selected(choice === current)], [choice])),
  )
}

function chipFields(
  model: DataTableModel,
  h: DataTableViewBuilder,
  column: DataTableColumn,
  value: Chip,
): Html[] {
  const label = column.header
  const change = (next: Chip) => Message.FilterChanged({ id: column.id, value: next })
  const field = (name: string, type: string, text: string, accept: (input: string) => Chip) =>
    h.input([
      h.Type(type),
      h.AriaLabel(name),
      h.Class(segment + ' w-auto min-w-12 max-w-32 bg-transparent'),
      h.Value(text),
      h.OnInput((input) => change(accept(input))),
    ])
  switch (value.kind) {
    case 'text': {
      const op = value.op ?? 'contains'
      return [
        operator(
          h,
          `${label} operator`,
          op,
          [
            'contains',
            'does not contain',
            'is',
            'is not',
            'starts with',
            'ends with',
            'is empty',
            'is not empty',
          ],
          (next) => change({ ...value, op: next }),
        ),
        ...(op === 'is empty' || op === 'is not empty'
          ? []
          : [field(`${label} ${op}`, 'text', value.query, (query) => ({ ...value, query }))]),
      ]
    }
    case 'number': {
      const rangeField = (key: 'min' | 'max') =>
        field(`${label} ${key}`, 'number', String(value[key] ?? ''), (text) => {
          const next = { ...value }
          if (text === '' || !Number.isFinite(Number(text))) delete next[key]
          else next[key] = Number(text)
          return next
        })
      return [h.span([], ['from']), rangeField('min'), h.span([], ['to']), rangeField('max')]
    }
    case 'date': {
      const op = value.op ?? 'between'
      const dateField = (key: 'from' | 'to') =>
        field(`${label} ${key}`, 'date', value[key] ?? '', (text) => ({ ...value, [key]: text }))
      return [
        operator(h, `${label} operator`, op, ['between', 'before', 'after'], (next) =>
          change({ ...value, op: next }),
        ),
        ...(op === 'before' ? [] : [dateField('from')]),
        ...(op === 'after' ? [] : [dateField('to')]),
      ]
    }
    case 'options': {
      const options =
        column.editor?.options ??
        [
          ...new Set(
            model.rows.flatMap((row) => {
              const item = row.values[column.id]
              return Array.isArray(item) ? item : item == null ? [] : [String(item)]
            }),
          ),
        ].map((item) => ({ value: item, label: item }))
      return [
        operator(h, `${label} operator`, value.op ?? 'is', ['is', 'is not'], (next) =>
          change({ ...value, op: next }),
        ),
        h.details(
          [h.Class('relative')],
          [
            h.summary(
              [h.AriaLabel(`${label} values`), h.Class(segment + ' cursor-pointer')],
              [
                value.values.length === 0
                  ? 'Choose values'
                  : value.values.length === 1
                    ? (options.find((o) => o.value === value.values[0])?.label ??
                      value.values[0] ??
                      '')
                    : `${value.values.length} items`,
              ],
            ),
            h.div(
              [
                h.Class(
                  'absolute left-0 top-full z-20 min-w-36 rounded-md bg-surface-3 p-1 shadow-surface-3',
                ),
              ],
              options.map((option) => {
                const checked = value.values.includes(option.value)
                return h.label(
                  [h.Class('flex cursor-pointer items-center gap-2 px-2 py-1 hover:bg-hover')],
                  [
                    h.input([
                      h.Type('checkbox'),
                      h.Checked(checked),
                      h.OnClick(
                        change({
                          ...value,
                          values: checked
                            ? value.values.filter((item) => item !== option.value)
                            : [...value.values, option.value],
                        }),
                      ),
                    ]),
                    option.label ?? option.value,
                  ],
                )
              }),
            ),
          ],
        ),
      ]
    }
  }
}

export function DataTableFilterChips(
  model: DataTableModel,
  h: DataTableViewBuilder,
  inputs: DataTableViewInputs,
): Html {
  const { shape, size } = resolvePresentation(inputs)
  if (model.filtersHidden || !model.filters.length) return h.empty
  return h.div(
    [h.AriaLabel('Active filters'), h.Class('flex flex-wrap items-center gap-1.5')],
    [
      ...model.filters.flatMap((filter) => {
        const column = model.columns.find((candidate) => candidate.id === filter.id)
        if (!column) return []
        const value =
          typeof filter.value === 'string'
            ? { kind: 'text' as const, query: filter.value }
            : filter.value
        return [
          h.keyed('div')(
            column.id,
            [
              h.Class(
                'inline-flex items-center gap-1 bg-hover px-1 text-caption ' +
                  shape.item +
                  ' ' +
                  (size.variant === 'compact' ? 'h-6' : 'h-7'),
              ),
            ],
            [
              h.span([h.Class('pl-1 font-medium')], [column.header]),
              ...chipFields(model, h, column, value),
              Button(
                {
                  ...inputs,
                  variant: 'ghost',
                  buttonSize: 'icon-compact',
                  attributes: [
                    h.AriaLabel(`Remove ${column.header} filter`),
                    h.OnClick(Message.FilterChanged({ id: column.id, value: null })),
                  ],
                  children: ['×'],
                },
                h,
              ),
            ],
          ),
        ]
      }),
      filterPicker(model, h),
    ],
  )
}
