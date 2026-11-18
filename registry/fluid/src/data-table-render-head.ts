import type { MotionScope } from './motion.js'
import { DataTableHeaderMenu } from './data-table-header-menu-view.js'
import { dataTablePinStyle } from './data-table-cell-pin.js'
import { Option } from 'effect'
import type { DataTableViewBuilder } from './data-table-definition.js'
/* @license Derived from Fluid Functionalism f8014098. MIT, copyright 2026 Micka Touillaud. */
/* @license See NOTICE */
import type { Html } from 'foldkit/html'
import { Message } from './data-table-definition.js'
import type { DataTableModel, DataTableViewInputs } from './data-table-definition.js'
import type { TableContext } from './table-parts.js'
import { TableHeader, TableHead, TableRow } from './table-parts.js'
import { dataTableFilteredRows, dataTableColumns } from './data-table-state.js'
import { resolvePresentation } from './presentation.js'

export const checkbox: (
  checked: boolean | 'mixed',
  label: string,
  action: string,
  rowId: string,
  inputs: DataTableViewInputs,
  h: DataTableViewBuilder,
) => Html = function checkbox(
  checked: boolean | 'mixed',
  label: string,
  action: string,
  rowId: string,
  inputs: DataTableViewInputs,
  h: DataTableViewBuilder,
) {
  const { icons, shape } = resolvePresentation(inputs)
  return h.button(
    [
      h.Type('button'),
      h.Role('checkbox'),
      h.AriaChecked(checked),
      h.AriaLabel(label),
      h.Disabled(false),
      h.DataAttribute('grid-action', action),
      h.DataAttribute('grid-row', rowId),
      h.Class(
        `flex size-4 shrink-0 cursor-pointer items-center justify-center border outline-none transition-[background-color,border-color] duration-80 focus-visible:ring-2 focus-visible:ring-foreground/40 ${shape.variant === 'sharp' ? 'rounded-[1px]' : 'rounded-[4px]'} ${checked ? 'border-foreground bg-foreground text-background' : 'border-muted-foreground/40 bg-transparent hover:border-foreground'}`,
      ),
    ],
    [
      checked
        ? (checked === 'mixed' ? icons.minus : icons.check)({ size: 12, strokeWidth: 2 }, h)
        : null,
    ],
  )
}

export const renderDataTableHead: (
  model: DataTableModel,
  inputs: DataTableViewInputs,
  h: DataTableViewBuilder,
  context: TableContext,
  motion: MotionScope,
) => Html = function renderDataTableHead(
  model: DataTableModel,
  inputs: DataTableViewInputs,
  h: DataTableViewBuilder,
  context: TableContext,
  motion: MotionScope,
) {
  const menu = Option.getOrNull(model.menu)
  const rows = dataTableFilteredRows(model)
  const columns = dataTableColumns(model)
  const { icons } = resolvePresentation(inputs)
  const selected = rows.filter((row) => model.selectedIds.includes(row.id)).length
  return TableHeader(
    {
      context,
      children: [
        TableRow(
          {
            children: [
              ...(inputs.draggable === false
                ? []
                : [
                    TableHead(
                      { children: [], className: 'sticky left-0 z-20 w-8 bg-background px-1.5' },
                      h,
                    ),
                  ]),
              ...(model.selectable
                ? [
                    TableHead(
                      {
                        children: [
                          checkbox(
                            selected === 0 ? false : selected === rows.length ? true : 'mixed',
                            'Select all rows',
                            'select-all',
                            '',
                            inputs,
                            h,
                          ),
                        ],
                        className: 'sticky z-20 w-9 bg-background px-2.5',
                        attributes: [
                          h.Style({ left: inputs.draggable === false ? '0px' : '32px' }),
                        ],
                      },
                      h,
                    ),
                  ]
                : []),
              ...columns.map((column, index) => {
                const sort = model.sorting.find((entry) => entry.id === column.id)
                const ownWidth = model.columnWidths[column.id] ?? column.width
                const width = ownWidth ?? 166
                const sized = inputs.resizableColumns !== false || ownWidth !== undefined
                return TableHead(
                  {
                    context,
                    hoverIndex: index,
                    ...(inputs.size === undefined ? {} : { size: inputs.size }),
                    className: 'relative select-none data-[grid-drop-target]:bg-hover',
                    attributes: [
                      h.Key(column.id),
                      h.Scope('col'),
                      h.AriaSort(sort ? (sort.desc ? 'descending' : 'ascending') : 'none'),
                      h.DataAttribute('grid-header', ''),
                      h.DataAttribute('grid-column', column.id),
                      h.Style({
                        ...dataTablePinStyle(model, column, inputs),
                        ...(sized
                          ? { width: `${width}px`, minWidth: `${width}px`, maxWidth: `${width}px` }
                          : {}),
                      }),
                    ],
                    children: [
                      h.div(
                        [h.Class('flex min-w-0 items-center gap-1')],
                        [
                          DataTableHeaderMenu(model, column, inputs, h, motion, (attributes) =>
                            h.button(
                              [
                                ...attributes,
                                h.Type('button'),

                                h.Draggable(false),
                                ...(inputs.reorderColumns === false
                                  ? []
                                  : [h.DataAttribute('grid-drag', 'column')]),
                                h.DataAttribute('grid-column', column.id),
                                h.DataAttribute('grid-action', 'header'),
                                h.Class(
                                  'flex min-w-0 flex-1 cursor-pointer touch-none items-center gap-1.5 text-left outline-none focus-visible:underline',
                                ),
                              ],
                              [
                                h.span([h.Class('truncate')], [column.header]),
                                sort
                                  ? (sort.desc ? icons['arrow-down'] : icons['arrow-up'])(
                                      { size: 14 },
                                      h,
                                    )
                                  : null,
                                model.sorting.length > 1 && sort
                                  ? h.span(
                                      [h.Class('text-xs text-muted-foreground')],
                                      [String(model.sorting.indexOf(sort) + 1)],
                                    )
                                  : null,
                              ],
                            ),
                          ),
                          h.button(
                            [
                              h.Type('button'),
                              h.AriaLabel(`${column.header} options`),
                              h.AriaHasPopup('menu'),
                              h.AriaExpanded(menu?.kind === 'column' && menu.id === column.id),
                              h.Class(
                                'flex size-6 shrink-0 items-center justify-center rounded-md opacity-0 outline-none transition-opacity hover:bg-hover focus-visible:opacity-100 group-hover/row:opacity-100',
                              ),
                              h.OnClick(
                                Message.MenuChanged({
                                  menu:
                                    menu?.kind === 'column' && menu.id === column.id
                                      ? null
                                      : { kind: 'column', id: column.id },
                                }),
                              ),
                            ],
                            [icons['more-horizontal']({ size: 14 }, h)],
                          ),
                        ],
                      ),
                      inputs.resizableColumns === false
                        ? null
                        : h.span([
                            h.Role('separator'),
                            h.Tabindex(0),
                            h.AriaLabel(`Resize ${column.header}`),
                            h.AriaOrientation('vertical'),
                            h.AriaValuemin(48),
                            h.AriaValuenow(width),
                            h.DataAttribute('grid-resize', ''),
                            h.DataAttribute('grid-column', column.id),
                            h.Class(
                              'absolute inset-y-1 right-0 z-20 w-1.5 cursor-col-resize touch-none rounded-full bg-transparent outline-none transition-colors hover:bg-foreground/20 focus-visible:bg-foreground/30',
                            ),
                            h.OnKeyDownPreventDefault((key) =>
                              key === 'ArrowLeft'
                                ? Option.some(
                                    Message.ColumnWidthChanged({
                                      id: column.id,
                                      width: Math.max(48, width - 16),
                                    }),
                                  )
                                : key === 'ArrowRight'
                                  ? Option.some(
                                      Message.ColumnWidthChanged({
                                        id: column.id,
                                        width: width + 16,
                                      }),
                                    )
                                  : Option.none(),
                            ),
                            h.OnDoubleClick(
                              Message.ColumnWidthChanged({
                                id: column.id,
                                width: column.width ?? 166,
                              }),
                            ),
                          ]),
                    ],
                  },
                  h,
                )
              }),
              model.actions.rowActions.length === 0
                ? null
                : TableHead(
                    { children: [], className: 'sticky right-0 z-20 w-9 bg-background' },
                    h,
                  ),
            ],
          },
          h,
        ),
      ],
    },
    h,
  )
}
