/* @license Derived from Fluid Functionalism f8014098. MIT, copyright 2026 Micka Touillaud. */
/* @license See NOTICE */
import type { Html } from 'foldkit/html'
import type {
  DataTableModel,
  DataTableViewInputs,
  DataTableViewBuilder,
} from './data-table-definition.js'
import { dataTableColumns } from './data-table-state.js'
import { TableCell, TableRow } from './table-parts.js'

export const renderDataTableLoading: (
  model: DataTableModel,
  inputs: DataTableViewInputs,
  h: DataTableViewBuilder,
) => ReadonlyArray<Html> = function renderDataTableLoading(
  model: DataTableModel,
  inputs: DataTableViewInputs,
  h: DataTableViewBuilder,
) {
  const columns = dataTableColumns(model)
  return Array.from({ length: model.pageSize }, (_, index) =>
    TableRow(
      {
        attributes: [h.Key(`loading-${index}`), h.AriaHidden(true)],
        children: [
          ...(inputs.draggable === false
            ? []
            : [
                TableCell(
                  {
                    ...inputs,
                    children: [h.span([h.Class('block size-4 rounded bg-hover animate-pulse')])],
                  },
                  h,
                ),
              ]),
          ...(model.selectable
            ? [
                TableCell(
                  {
                    ...inputs,
                    children: [h.span([h.Class('block size-4 rounded bg-hover animate-pulse')])],
                  },
                  h,
                ),
              ]
            : []),
          ...columns.map((column, at) =>
            TableCell(
              {
                ...inputs,
                attributes: [h.Key(column.id)],
                children: [
                  h.span(
                    [h.Class('reveal-swap flex h-lh items-center')],
                    [
                      h.span([
                        h.Class(
                          column.editor?.type === 'select' || column.editor?.type === 'tags'
                            ? 'h-5 animate-pulse rounded-md bg-hover'
                            : 'h-2.5 animate-pulse rounded-[3px] bg-hover',
                        ),
                        h.Style({
                          width: `${[72, 56, 88, 64, 48, 80, 60][(index * 3 + at) % 7]}%`,
                        }),
                      ]),
                    ],
                  ),
                ],
              },
              h,
            ),
          ),
          ...(model.actions.rowActions.length > 0
            ? [TableCell({ ...inputs, children: [] }, h)]
            : []),
        ],
      },
      h,
    ),
  )
}
