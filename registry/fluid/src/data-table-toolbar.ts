import { DataTableSearchField } from './data-table-search-view.js'
import { DataTableSavedViews } from './data-table-saved-views.js'
import type { DataTableViewBuilder } from './data-table-definition.js'
// Derived from Fluid Functionalism f8014098. MIT, copyright 2026 Micka Touillaud.
// See NOTICE
import type { Html } from 'foldkit/html'
import type { MotionScope } from './motion.js'
import { DataTableColumnsMenu } from './data-table-columns-view.js'
import { Message } from './data-table-definition.js'
import type { DataTableModel, DataTableViewInputs } from './data-table-definition.js'
import { DataTableFilters } from './data-table-filters-view.js'
import { Button } from './button.js'
import { resolvePresentation } from './presentation.js'
import { dataTablePageCount, dataTableRoots, dataTableSelectedRows } from './data-table-state.js'

export function DataTableToolbar(
  model: DataTableModel,
  inputs: DataTableViewInputs,
  h: DataTableViewBuilder,
  motion: MotionScope,
): Html {
  const { icons } = resolvePresentation(inputs)
  return h.div(
    [h.Class('flex flex-wrap items-center justify-between gap-2')],
    [
      h.div(
        [h.Class('flex min-w-0 flex-1 items-center gap-2')],
        [
          inputs.showSearch === false ? null : DataTableSearchField(model, inputs, h, motion),
          inputs.showFilters === false ? null : DataTableFilters(model, h, inputs),
          DataTableSavedViews(model, inputs, h, motion),
        ],
      ),
      h.div(
        [h.Class('flex items-center gap-1')],
        [
          ...(inputs.showHistory === false
            ? []
            : [
                Button(
                  {
                    ...inputs,
                    variant: 'ghost',
                    buttonSize: 'icon-toolbar',
                    leadingIcon: icons['rotate-ccw'],
                    disabled: model.history.length === 0,
                    children: [],
                    attributes: [h.AriaLabel('Undo'), h.OnClick(Message.UndoRequested())],
                  },
                  h,
                ),
                Button(
                  {
                    ...inputs,
                    variant: 'ghost',
                    buttonSize: 'icon-toolbar',
                    leadingIcon: icons['rotate-ccw'],
                    disabled: model.future.length === 0,
                    children: [],
                    className: '-scale-x-100',
                    attributes: [h.AriaLabel('Redo'), h.OnClick(Message.RedoRequested())],
                  },
                  h,
                ),
              ]),
          inputs.showViewOptions === false ? null : DataTableColumnsMenu(model, inputs, h, motion),
        ],
      ),
    ],
  )
}

export function DataTablePagination(
  model: DataTableModel,
  inputs: DataTableViewInputs,
  h: DataTableViewBuilder,
): Html {
  const { icons, size } = resolvePresentation(inputs)
  const total = dataTableRoots(model).length
  const pages = dataTablePageCount(model)
  const count = dataTableSelectedRows(model).length
  const pageSizes = inputs.pageSizes ?? [10, 20, 50]
  const sizes =
    pageSizes.length === 0
      ? []
      : [
          ...new Set([
            ...pageSizes.filter((value) => Number.isSafeInteger(value) && value > 0),
            model.pageSize,
          ]),
        ].sort((a, b) => a - b)
  return h.div(
    [
      h.Class(
        `flex flex-wrap items-center justify-between gap-x-4 gap-y-2 tabular-nums text-muted-foreground ${size.text}`,
      ),
    ],
    [
      h.span(
        [h.AriaLive('polite'), h.Class('pl-2')],
        [
          count
            ? `${count} of ${total} rows selected`
            : pages > 1
              ? `${Math.max(0, Math.min(model.pageSize, total - model.pageIndex * model.pageSize))} / ${total} rows`
              : `${total} ${total === 1 ? 'row' : 'rows'}`,
        ],
      ),
      h.div(
        [h.Class('flex flex-wrap items-center gap-x-4 gap-y-2 whitespace-nowrap')],
        [
          sizes.length === 0
            ? null
            : h.label(
                [h.Class('flex items-center gap-1')],
                [
                  'Rows per page',
                  h.select(
                    [
                      h.AriaLabel('Rows per page'),
                      h.Class(
                        'cursor-pointer bg-transparent px-2 py-1 outline-none focus-visible:ring-2 focus-visible:ring-foreground/30',
                      ),
                      h.OnChange((value) => Message.PageSizeChanged({ pageSize: Number(value) })),
                    ],
                    sizes.map((value) =>
                      h.option(
                        [h.Value(String(value)), h.Selected(value === model.pageSize)],
                        [String(value)],
                      ),
                    ),
                  ),
                ],
              ),
          h.span(
            [h.Class('flex items-center gap-1')],
            [
              `Page ${model.pageIndex + 1} of ${pages}`,
              Button(
                {
                  ...inputs,
                  variant: 'ghost',
                  buttonSize: size.variant === 'compact' ? 'icon-compact' : 'icon',
                  leadingIcon: icons['arrow-left'],
                  children: [],
                  disabled: model.pageIndex <= 0,
                  attributes: [
                    h.AriaLabel('Previous page'),
                    h.OnClick(Message.PageChanged({ pageIndex: Math.max(0, model.pageIndex - 1) })),
                  ],
                },
                h,
              ),
              Button(
                {
                  ...inputs,
                  variant: 'ghost',
                  buttonSize: size.variant === 'compact' ? 'icon-compact' : 'icon',
                  leadingIcon: icons['arrow-right'],
                  children: [],
                  disabled: model.pageIndex >= pages - 1,
                  attributes: [
                    h.AriaLabel('Next page'),
                    h.OnClick(Message.PageChanged({ pageIndex: model.pageIndex + 1 })),
                  ],
                },
                h,
              ),
            ],
          ),
        ],
      ),
    ],
  )
}
