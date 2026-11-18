import { Option } from 'effect'
import { renderDataTableLoading } from './data-table-render-loading.js'
import type { MotionScope } from './motion.js'
import { spring } from './lib/springs.js'
import { dataTablePinStyle, dataTablePinLayers } from './data-table-cell-pin.js'
import type { DataTableViewBuilder } from './data-table-definition.js'
/* @license Derived from Fluid Functionalism f8014098. MIT, copyright 2026 Micka Touillaud. */
/* @license See NOTICE */
import type { Html } from 'foldkit/html'
import { Message } from './data-table-definition.js'
import type { DataTableModel, DataTableViewInputs } from './data-table-definition.js'
import type { TableContext } from './table-parts.js'
import { TableBody, TableRow, TableCell, TableEmpty } from './table-parts.js'
import { DataTableCellContent } from './data-table-cell.js'
import { dataTableRows, dataTableColumns } from './data-table-state.js'
import { resolvePresentation } from './presentation.js'

import { checkbox, renderDataTableHead } from './data-table-render-head.js'
export const renderDataTable: (
  model: DataTableModel,
  inputs: DataTableViewInputs,
  h: DataTableViewBuilder,
  context: TableContext,
  motion: MotionScope,
) => ReadonlyArray<Html> = function renderDataTable(
  model: DataTableModel,
  inputs: DataTableViewInputs,
  h: DataTableViewBuilder,
  context: TableContext,
  motion: MotionScope,
) {
  const focusedCell = Option.getOrNull(model.focusedCell)
  const rows = inputs.empty === true ? [] : dataTableRows(model)
  const columns = dataTableColumns(model)
  const { icons } = resolvePresentation(inputs)
  const first = columns[0]?.id
  return [
    renderDataTableHead(model, inputs, h, context, motion),
    TableBody(
      {
        children: inputs.loading
          ? renderDataTableLoading(model, inputs, h)
          : rows.length === 0
            ? [
                TableEmpty(
                  {
                    columns:
                      columns.length +
                      (inputs.draggable === false ? 0 : 1) +
                      (model.selectable ? 1 : 0) +
                      (model.actions.rowActions.length > 0 ? 1 : 0),
                    rows: Math.max(
                      1,
                      Math.min(
                        model.pageSize,
                        model.rows.filter((row) => row.parentId === undefined).length,
                      ),
                    ),
                    title: inputs.emptyTitle ?? 'No results',
                    ...(inputs.emptyDescription === undefined
                      ? {}
                      : { description: inputs.emptyDescription }),
                  },
                  h,
                ),
              ]
            : rows.map(({ row, depth }, index) =>
                motion.node(
                  TableRow(
                    {
                      index,
                      context,
                      className: 'data-[grid-drop-target]:*:border-foreground',
                      attributes: [
                        h.Key(row.id),
                        h.DataAttribute('grid-body-row', ''),
                        h.DataAttribute('grid-row', row.id),
                        h.DataAttribute('grid-parent', row.parentId ?? ''),
                        h.AriaSelected(model.selectedIds.includes(row.id)),
                      ],
                      children: [
                        ...(inputs.draggable === false
                          ? []
                          : [
                              TableCell(
                                {
                                  ...inputs,
                                  className: 'sticky left-0 z-20 w-8 bg-background px-1.5',
                                  children: [
                                    dataTablePinLayers(model.selectedIds.includes(row.id), h),
                                    depth === 0
                                      ? h.button(
                                          [
                                            h.Type('button'),
                                            h.AriaLabel(`Move row ${row.id}`),
                                            h.Draggable(false),
                                            h.DataAttribute('grid-drag', 'row'),
                                            h.DataAttribute('grid-row', row.id),
                                            h.Class(
                                              'relative z-10 flex size-5 cursor-grab touch-none items-center justify-center text-muted-foreground/50 outline-none hover:text-foreground focus-visible:ring-2',
                                            ),
                                          ],
                                          [icons['more-vertical']({ size: 14 }, h)],
                                        )
                                      : null,
                                  ],
                                },
                                h,
                              ),
                            ]),
                        ...(model.selectable
                          ? [
                              TableCell(
                                {
                                  ...inputs,
                                  className: 'sticky z-20 w-9 bg-background px-2.5',
                                  attributes: [
                                    h.Style({ left: inputs.draggable === false ? '0px' : '32px' }),
                                  ],
                                  children: [
                                    dataTablePinLayers(model.selectedIds.includes(row.id), h),
                                    h.span(
                                      [h.Class('relative z-10')],
                                      [
                                        checkbox(
                                          model.selectedIds.includes(row.id),
                                          `Select row ${row.id}`,
                                          'select',
                                          row.id,
                                          inputs,
                                          h,
                                        ),
                                      ],
                                    ),
                                  ],
                                },
                                h,
                              ),
                            ]
                          : []),
                        ...columns.map((column, colIndex) => {
                          const hasChildren =
                            column.id === first &&
                            model.rows.some((child) => child.parentId === row.id)
                          const focused = focusedCell
                            ? focusedCell.rowId === row.id && focusedCell.columnId === column.id
                            : index === 0 && colIndex === 0
                          const editable =
                            Boolean(column.editor) &&
                            column.editable !== false &&
                            !model.disabled &&
                            model.editable &&
                            inputs.editable !== false
                          return TableCell(
                            {
                              ...inputs,
                              className:
                                'relative outline-none focus-visible:rounded-md focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-foreground/30 ' +
                                (inputs.cellAlignment === 'top'
                                  ? 'align-top'
                                  : inputs.cellAlignment === 'center'
                                    ? 'align-middle'
                                    : ''),
                              attributes: [
                                h.Key(column.id),
                                h.Tabindex(focused ? 0 : -1),
                                h.DataAttribute('grid-cell', ''),
                                h.DataAttribute('grid-row', row.id),
                                h.DataAttribute('grid-column', column.id),
                                h.DataAttribute('grid-editable', String(editable)),
                                h.AriaLabel(`${column.header} ${editable ? 'editable' : ''}`),
                                h.Style({
                                  ...dataTablePinStyle(model, column, inputs),
                                  ...(inputs.resizableColumns === false &&
                                  model.columnWidths[column.id] === undefined &&
                                  column.width === undefined
                                    ? {}
                                    : {
                                        width: `${model.columnWidths[column.id] ?? column.width ?? 166}px`,
                                        maxWidth: `${model.columnWidths[column.id] ?? column.width ?? 166}px`,
                                      }),
                                }),
                              ],
                              children: [
                                ...(model.pinnedColumns.left.includes(column.id) ||
                                model.pinnedColumns.right.includes(column.id)
                                  ? [dataTablePinLayers(model.selectedIds.includes(row.id), h)]
                                  : []),
                                h.div(
                                  [
                                    h.Class('relative z-10 flex min-w-0 items-center gap-1.5'),
                                    ...(column.id === first
                                      ? [h.Style({ paddingLeft: `${depth * 20}px` })]
                                      : []),
                                  ],
                                  [
                                    hasChildren
                                      ? h.button(
                                          [
                                            h.Type('button'),
                                            h.AriaLabel(
                                              `${model.expandedIds.includes(row.id) ? 'Collapse' : 'Expand'} row ${row.id}`,
                                            ),
                                            h.AriaExpanded(model.expandedIds.includes(row.id)),
                                            h.Class(
                                              'flex size-5 shrink-0 items-center justify-center rounded outline-none hover:bg-hover focus-visible:ring-2',
                                            ),
                                            h.OnClick(Message.ExpansionChanged({ id: row.id })),
                                          ],
                                          [
                                            (model.expandedIds.includes(row.id)
                                              ? icons['chevron-down']
                                              : icons['chevron-right'])({ size: 14 }, h),
                                          ],
                                        )
                                      : null,
                                    h.div(
                                      [h.Class('min-w-0 flex-1')],
                                      [DataTableCellContent(model, row, column, inputs, h, motion)],
                                    ),
                                  ],
                                ),
                              ],
                            },
                            h,
                          )
                        }),
                        model.actions.rowActions.length === 0
                          ? null
                          : TableCell(
                              {
                                ...inputs,
                                className: 'sticky right-0 z-20 w-9 bg-background px-1',
                                children: [
                                  dataTablePinLayers(model.selectedIds.includes(row.id), h),
                                  h.button(
                                    [
                                      h.Type('button'),
                                      h.AriaLabel(`Actions for row ${row.id}`),
                                      h.AriaHasPopup('menu'),
                                      h.DataAttribute('grid-row-action', row.id),
                                      h.Disabled(model.disabled),
                                      h.Class(
                                        'relative z-10 flex size-7 items-center justify-center rounded-md outline-none hover:bg-hover focus-visible:ring-2 focus-visible:ring-inset',
                                      ),
                                    ],
                                    [icons['more-horizontal']({ size: 16 }, h)],
                                  ),
                                ],
                              },
                              h,
                            ),
                      ],
                    },
                    h,
                  ),
                  {
                    layout: 'position',
                    initial: false,
                    animate: { opacity: 1 },
                    transition: spring.fast,
                    reducedMotion: resolvePresentation(inputs).reducedMotion,
                  },
                ),
              ),
      },
      h,
    ),
  ]
}
