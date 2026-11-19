/* @license Derived from Fluid Functionalism f8014098. MIT, copyright 2026 Micka Touillaud. */
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
import { addFilterKey, operatorKey, filterChip } from './data-table-filter-options.js'
import { FilterSelects } from './data-table-filter-selects.js'
import type { MotionScope } from './motion.js'
import { resolvePresentation } from './presentation.js'

type Chip = Exclude<DataTableFilterValue, string>
const segment =
  'relative z-[1] inline-flex h-full min-w-0 items-center gap-1 px-1 outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--focus-ring,#6B97FF)] transition-[background-color] duration-80 aria-expanded:bg-active'

function filterSelect(
  model: DataTableModel,
  key: string,
  ariaLabel: string,
  h: DataTableViewBuilder,
  inputs: DataTableViewInputs,
  motion: MotionScope,
) {
  const entry = model.filterSelects.find((entry) => entry.key === key)
  if (!entry) return h.empty
  return h.block(
    FilterSelects.embedView({
      key,
      slotId: entry.model.id,
      model: entry.model,
      viewInputs: {
        ...inputs,
        className: 'max-w-36',
        ariaLabel,
        placeholder: 'Add filter',
        variant: 'borderless',
        animate: motion.node,
      },
    }),
  )
}

export const DataTableFilters: (
  model: DataTableModel,
  h: DataTableViewBuilder,
  inputs: DataTableViewInputs,
  motion: MotionScope,
) => Html = function DataTableFilters(
  model: DataTableModel,
  h: DataTableViewBuilder,
  inputs: DataTableViewInputs,
  motion: MotionScope,
) {
  if (model.filters.length === 0)
    return filterSelect(model, addFilterKey, 'Add a filter', h, inputs, motion)
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

const chipFields: (
  model: DataTableModel,
  h: DataTableViewBuilder,
  column: DataTableColumn,
  value: Chip,
  inputs: DataTableViewInputs,
  motion: MotionScope,
) => Html[] = function chipFields(
  model: DataTableModel,
  h: DataTableViewBuilder,
  column: DataTableColumn,
  value: Chip,
  inputs: DataTableViewInputs,
  motion: MotionScope,
) {
  const label = column.header
  const operator = () =>
    filterSelect(model, operatorKey(column.id), label + ' operator', h, inputs, motion)
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
        operator(),
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
        operator(),
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
        operator(),
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

export const DataTableFilterChips: (
  model: DataTableModel,
  h: DataTableViewBuilder,
  inputs: DataTableViewInputs,
  motion: MotionScope,
) => Html = function DataTableFilterChips(
  model: DataTableModel,
  h: DataTableViewBuilder,
  inputs: DataTableViewInputs,
  motion: MotionScope,
) {
  const { shape, size } = resolvePresentation(inputs)
  if (model.filtersHidden || !model.filters.length) return h.empty
  return h.div(
    [h.AriaLabel('Active filters'), h.Class('flex flex-wrap items-center gap-1.5')],
    [
      ...model.filters.flatMap((filter) => {
        const column = model.columns.find((candidate) => candidate.id === filter.id)
        if (!column) return []
        const value = filterChip(filter.value)
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
              ...chipFields(model, h, column, value, inputs, motion),
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
      filterSelect(model, addFilterKey, 'Add a filter', h, inputs, motion),
    ],
  )
}
