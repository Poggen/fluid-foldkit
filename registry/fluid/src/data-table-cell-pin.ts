import type { Html } from 'foldkit/html'
import type { DataTableViewBuilder } from './data-table-definition.js'
import type {
  DataTableColumn,
  DataTableModel,
  DataTableViewInputs,
} from './data-table-definition.js'
import { dataTableColumns } from './data-table-state.js'

export function dataTablePinStyle(
  model: DataTableModel,
  column: DataTableColumn,
  inputs: DataTableViewInputs,
): Readonly<Record<string, string>> {
  const left = model.pinnedColumns.left.includes(column.id)
  const right = model.pinnedColumns.right.includes(column.id)
  if (!left && !right) return {}
  const columns = dataTableColumns(model)
  const group = columns.filter((item) =>
    (left ? model.pinnedColumns.left : model.pinnedColumns.right).includes(item.id),
  )
  const index = group.findIndex((item) => item.id === column.id)
  const preceding = left ? group.slice(0, index) : group.slice(index + 1)
  const offset = preceding.reduce(
    (sum, item) => sum + (model.columnWidths[item.id] ?? item.width ?? 166),
    0,
  )
  return {
    position: 'sticky',
    zIndex: '20',
    background: 'var(--background)',
    [left ? 'left' : 'right']:
      `${offset + (left ? (inputs.draggable === false ? 0 : 32) + (model.selectable ? 36 : 0) : model.actions.rowActions.length > 0 ? 36 : 0)}px`,
  }
}

export function dataTablePinLayers(selected: boolean, h: DataTableViewBuilder): Html {
  return h.div(
    [h.AriaHidden(true), h.Class('pointer-events-none absolute inset-0 overflow-hidden')],
    [
      selected ? h.div([h.Class('absolute inset-0 bg-active')]) : null,
      h.div([
        h.DataAttribute('grid-pin-hover', ''),
        h.Class('absolute left-0 top-0 w-full bg-hover'),
        h.Style({ opacity: '0' }),
      ]),
    ],
  )
}
