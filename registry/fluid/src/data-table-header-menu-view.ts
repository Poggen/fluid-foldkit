import { Option } from 'effect'
/* @license Derived from Fluid Functionalism f8014098. MIT, copyright 2026 Micka Touillaud. */
/* @license See NOTICE */
import type { ChildAttribute, Html } from 'foldkit/html'
import { childAttributes } from 'foldkit/html'
import { HeaderMenu, Message } from './data-table-definition.js'
import type {
  DataTableModel,
  DataTableColumn,
  DataTableViewInputs,
  DataTableViewBuilder,
} from './data-table-definition.js'
import { DropdownItem } from './dropdown-item.js'
import type { MotionScope } from './motion.js'
import { emptyColumnFilter } from './data-table-filters-view.js'

export const DataTableHeaderMenu: (
  model: DataTableModel,
  column: DataTableColumn,
  inputs: DataTableViewInputs,
  h: DataTableViewBuilder,
  motion: MotionScope,
  trigger: (attributes: ReadonlyArray<ChildAttribute>) => Html,
) => Html = function DataTableHeaderMenu(
  model: DataTableModel,
  column: DataTableColumn,
  inputs: DataTableViewInputs,
  h: DataTableViewBuilder,
  motion: MotionScope,
  trigger: (attributes: ReadonlyArray<ChildAttribute>) => Html,
) {
  if (!Option.contains(model.headerColumnId, column.id)) return trigger([])
  const move = (direction: number) => {
    const ids = [...model.columnOrder]
    const from = ids.indexOf(column.id)
    if (from >= 0) {
      ids.splice(from, 1)
      ids.splice(Math.max(0, Math.min(ids.length, from + direction)), 0, column.id)
    }
    return ids
  }
  const items: ReadonlyArray<{
    readonly label: string
    readonly message: typeof Message.Type
    readonly disabled?: boolean
  }> = [
    {
      label: 'Sort ascending',
      message: Message.SortDirectionChanged({ id: column.id, direction: 'asc' }),
      disabled: column.sortable === false,
    },
    {
      label: 'Sort descending',
      message: Message.SortDirectionChanged({ id: column.id, direction: 'desc' }),
      disabled: column.sortable === false,
    },
    {
      label: 'Clear sorting',
      message: Message.SortDirectionChanged({ id: column.id, direction: null }),
      disabled: !model.sorting.some((item) => item.id === column.id),
    },
    ...(inputs.showFilters === false
      ? []
      : [
          {
            label: 'Filter',
            message: Message.FilterChanged({ id: column.id, value: emptyColumnFilter(column) }),
            disabled: column.filter === false,
          },
        ]),
    { label: 'Move left', message: Message.ColumnOrderChanged({ ids: move(-1) }) },
    { label: 'Move right', message: Message.ColumnOrderChanged({ ids: move(1) }) },
    {
      label: 'Freeze through this column',
      message: Message.ColumnsFrozenThrough({ id: column.id }),
    },
    { label: 'Pin to left', message: Message.ColumnPinChanged({ id: column.id, side: 'left' }) },
    { label: 'Pin to right', message: Message.ColumnPinChanged({ id: column.id, side: 'right' }) },
    { label: 'Unpin column', message: Message.ColumnPinChanged({ id: column.id, side: null }) },
    { label: 'Single line', message: Message.ColumnLinesChanged({ id: column.id, lines: 1 }) },
    { label: 'Two lines', message: Message.ColumnLinesChanged({ id: column.id, lines: 2 }) },
    { label: 'Wrap text', message: Message.ColumnLinesChanged({ id: column.id, lines: 'wrap' }) },
    {
      label: 'Hide column',
      message: Message.ColumnVisibilityChanged({ id: column.id, visible: false }),
      disabled: column.hideable === false,
    },
  ]
  return h.block(
    HeaderMenu.embedView({
      slotId: `${model.id}-header-menu`,
      model: model.headerMenu,
      viewInputs: {
        ...inputs,
        trigger,
        animate: motion.node,
        side: 'bottom',
        align: 'start',
        content: (context) =>
          items.map((item, index) =>
            DropdownItem(
              {
                index,
                label: item.label,
                disabled: item.disabled ?? false,
                animate: motion.node,
                attributes: childAttributes([h.OnClick(item.message)]),
              },
              context,
              h,
            ),
          ),
      },
    }),
  )
}
