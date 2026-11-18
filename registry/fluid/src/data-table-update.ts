import { Option } from 'effect'
import type { DataTableModel, DataTableRow, DataTableView } from './data-table-definition.js'
import { Message, OutMessage } from './data-table-definition.js'
import { dataTableRows, dataTableFilteredRows, reconcileDataTable } from './data-table-state.js'

const applySavedView: (model: DataTableModel, view: DataTableView) => DataTableModel =
  function applySavedView(model: DataTableModel, view: DataTableView) {
    const { search, sorting, filters, hiddenColumns, columnOrder } = view
    return reconcileDataTable({
      ...model,
      search,
      sorting,
      filters,
      hiddenColumns,
      columnOrder,
      activeViewId: Option.some(view.id),
      pageIndex: 0,
    })
  }

const snapshot = (model: DataTableModel) => ({
  rows: model.rows,
  selectedIds: model.selectedIds,
  focusedCell: model.focusedCell,
})
const changedRows: (model: DataTableModel, rows: ReadonlyArray<DataTableRow>) => DataTableModel = (
  model: DataTableModel,
  rows: ReadonlyArray<DataTableRow>,
) =>
  reconcileDataTable({
    ...model,
    rows,
    history: [...model.history.slice(-49), snapshot(model)],
    future: [],
    editing: Option.none(),
  })
export const dataTableChangeRows = (model: DataTableModel, rows: ReadonlyArray<DataTableRow>) =>
  model.disabled
    ? { model }
    : { model: changedRows(model, rows), outMessage: OutMessage.RowsChanged({ rows }) }
export function dataTableUndo(model: DataTableModel, redo = false) {
  const source = redo ? model.future : model.history
  const entry = source.at(-1)
  if (model.disabled || !entry) return { model }
  const next = reconcileDataTable({
    ...model,
    ...entry,
    focusedRowId: Option.map(entry.focusedCell, (cell) => cell.rowId),
    editing: Option.none(),
    history: redo ? [...model.history, snapshot(model)] : model.history.slice(0, -1),
    future: redo ? model.future.slice(0, -1) : [...model.future, snapshot(model)],
  })
  return { model: next, outMessage: OutMessage.RowsChanged({ rows: entry.rows }) }
}
export function dataTableUpdate(model: DataTableModel, message: typeof Message.Type) {
  if (model.disabled) return { model }
  return Message.match(message, {
    TextWrapChanged: ({ wrapped }) => ({
      model: {
        ...model,
        columnLines: {
          ...model.columnLines,
          ...Object.fromEntries(
            model.columns
              .filter((column) => column.lines !== undefined)
              .map(
                (column) =>
                  [
                    column.id,
                    wrapped ? 'wrap' : column.lines === 'wrap' ? 1 : (column.lines ?? 1),
                  ] satisfies readonly [string, 1 | 2 | 'wrap'],
              ),
          ),
        },
      },
    }),
    SearchFocusCompleted: () => ({ model }),
    SearchOpened: () => ({ model: { ...model, searchOpen: true } }),
    SearchBlurred: () => ({
      model: {
        ...model,
        searchOpen:
          (typeof model.search === 'string' ? model.search : model.search.query) === ''
            ? false
            : model.searchOpen,
      },
    }),
    SearchClosed: () => ({
      model: { ...model, searchOpen: false, search: '', pageIndex: 0, activeViewId: Option.none() },
    }),
    SearchChanged: (message) => {
      return {
        model: { ...model, search: message.search, pageIndex: 0, activeViewId: Option.none() },
      }
    },
    FilterChanged: (message) => {
      const value = message.value
      const existing = model.filters.some((filter) => filter.id === message.id)
      const filters =
        value === null
          ? model.filters.filter((filter) => filter.id !== message.id)
          : existing
            ? model.filters.map((filter) =>
                filter.id === message.id ? { id: message.id, value } : filter,
              )
            : [...model.filters, { id: message.id, value }]
      return {
        model: {
          ...model,
          filters,
          pageIndex: 0,
          activeViewId: Option.none(),
          filtersHidden: value !== null && !existing ? false : model.filtersHidden,
          menu: value !== null && !existing ? Option.none() : model.menu,
        },
      }
    },
    SortDirectionChanged: (message) => {
      if (model.columns.find((column) => column.id === message.id)?.sortable === false)
        return { model }
      return {
        model: {
          ...model,
          sorting:
            message.direction === null
              ? []
              : [{ id: message.id, desc: message.direction === 'desc' }],
          pageIndex: 0,
          activeViewId: Option.none(),
          menu: Option.none(),
        },
      }
    },
    SortChanged: (message) => {
      if (model.columns.find((column) => column.id === message.id)?.sortable === false)
        return { model }
      const current = model.sorting.find((sort) => sort.id === message.id)
      const next = current?.desc === true ? [] : [{ id: message.id, desc: current !== undefined }]
      return {
        model: {
          ...model,
          sorting: [
            ...(message.multi ? model.sorting.filter((sort) => sort.id !== message.id) : []),
            ...next,
          ],
          pageIndex: 0,
          activeViewId: Option.none(),
        },
      }
    },
    SelectionChanged: (message) => {
      if (!model.selectable || !model.rows.some((row) => row.id === message.id)) return { model }
      const ids = descendants(model, [message.id])
      const selectedIds = [
        ...model.selectedIds.filter((id) => !ids.includes(id)),
        ...(message.selected ? ids : []),
      ]
      return {
        model: { ...model, selectedIds },
        outMessage: OutMessage.SelectionChanged({ ids: selectedIds }),
      }
    },
    AllSelectionChanged: (message) => {
      if (!model.selectable) return { model }
      const ids = new Set(dataTableFilteredRows(model).map((row) => row.id))
      const selectedIds = [
        ...model.selectedIds.filter((id) => !ids.has(id)),
        ...(message.selected ? [...ids] : []),
      ]
      return {
        model: { ...model, selectedIds },
        outMessage: OutMessage.SelectionChanged({ ids: selectedIds }),
      }
    },
    PageSelectionChanged: (message) => {
      if (!model.selectable) return { model }
      const ids = descendants(
        model,
        dataTableRows(model).map(({ row }) => row.id),
      )
      const selectedIds = [
        ...model.selectedIds.filter((id) => !ids.includes(id)),
        ...(message.selected ? ids : []),
      ]
      return {
        model: { ...model, selectedIds },
        outMessage: OutMessage.SelectionChanged({ ids: selectedIds }),
      }
    },
    PageChanged: (message) => {
      return { model: reconcileDataTable({ ...model, pageIndex: message.pageIndex }) }
    },
    PageSizeChanged: (message) => {
      return {
        model: reconcileDataTable({
          ...model,
          pageSize: Math.max(1, message.pageSize),
          pageIndex: Math.floor((model.pageIndex * model.pageSize) / Math.max(1, message.pageSize)),
        }),
      }
    },
    ExpansionChanged: (message) => {
      return {
        model: {
          ...model,
          expandedIds: model.expandedIds.includes(message.id)
            ? model.expandedIds.filter((id) => id !== message.id)
            : [...model.expandedIds, message.id],
        },
      }
    },
    ColumnVisibilityChanged: (message) => {
      if (model.columns.find((column) => column.id === message.id)?.hideable === false)
        return { model }
      return {
        model: {
          ...model,
          hiddenColumns: [
            ...model.hiddenColumns.filter((id) => id !== message.id),
            ...(message.visible ? [] : [message.id]),
          ],
        },
      }
    },
    ColumnOrderChanged: (message) => {
      const utility = new Set(['drag', 'select', 'actions'])
      const data = model.columns
        .filter((column) => !utility.has(column.id))
        .map((column) => column.id)
      const ids = [...new Set(message.ids.filter((id) => data.includes(id)))]
      const columnOrder = [
        ...['drag', 'select'].filter((id) => model.columns.some((column) => column.id === id)),
        ...ids,
        ...data.filter((id) => !ids.includes(id)),
        ...model.columns.filter((column) => column.id === 'actions').map((column) => column.id),
      ]
      const frozen = model.pinnedColumns.left.filter(
        (id) => data.includes(id) && !model.hiddenColumns.includes(id),
      ).length
      const left =
        frozen === 0
          ? model.pinnedColumns.left
          : [
              ...model.pinnedColumns.left.filter((id) => utility.has(id)),
              ...columnOrder
                .filter(
                  (id) =>
                    data.includes(id) &&
                    !model.pinnedColumns.right.includes(id) &&
                    !model.hiddenColumns.includes(id),
                )
                .slice(0, frozen),
              ...model.pinnedColumns.left.filter(
                (id) => data.includes(id) && model.hiddenColumns.includes(id),
              ),
            ]
      return { model: { ...model, columnOrder, pinnedColumns: { ...model.pinnedColumns, left } } }
    },
    ColumnWidthChanged: (message) => {
      return {
        model: {
          ...model,
          columnWidths: { ...model.columnWidths, [message.id]: Math.max(48, message.width) },
        },
      }
    },
    ColumnLinesChanged: (message) => {
      return {
        model: { ...model, columnLines: { ...model.columnLines, [message.id]: message.lines } },
      }
    },
    EditStarted: (message) => {
      const row = model.rows.find((entry) => entry.id === message.rowId)
      const column = model.columns.find((entry) => entry.id === message.columnId)
      return !model.editable || !row || !column?.editor || column.editable === false
        ? { model }
        : {
            model: {
              ...model,
              editing: Option.some({
                rowId: row.id,
                columnId: column.id,
                draft: row.values[column.id] ?? null,
              }),
            },
          }
    },
    EditDraftChanged: (message) => {
      return {
        model: Option.isNone(model.editing)
          ? model
          : { ...model, editing: Option.some({ ...model.editing.value, draft: message.value }) },
      }
    },
    EditCommitted: () => {
      const edit = Option.getOrNull(model.editing)
      if (edit === null) return { model }
      const column = model.columns.find((entry) => entry.id === edit.columnId)
      let value = edit.draft
      if (column?.editor?.type === 'number') {
        const number = value === '' || value === null ? null : Number(value)
        if (number !== null && !Number.isFinite(number)) return { model }
        value = number
      }
      const options = column?.editor?.options
      if (
        column?.editor?.type === 'select' &&
        options &&
        !options.some((option) => option.value === value)
      )
        return { model }
      if (
        column?.editor?.type === 'tags' &&
        (!Array.isArray(value) ||
          (!column.editor.creatable &&
            options &&
            value.some((tag) => !options.some((option) => option.value === tag))))
      )
        return { model }
      const rows = model.rows.map((row) =>
        row.id === edit.rowId ? { ...row, values: { ...row.values, [edit.columnId]: value } } : row,
      )
      return {
        model: changedRows(model, rows),
        outMessage: OutMessage.CellEdited({ rowId: edit.rowId, columnId: edit.columnId, value }),
      }
    },
    EditCancelled: () => {
      return { model: { ...model, editing: Option.none() } }
    },
    UndoRequested: () => {
      return dataTableUndo(model)
    },
    RedoRequested: () => {
      return dataTableUndo(model, true)
    },
    RowsDeleted: (message) => {
      const ids = new Set(message.ids)
      let count = -1
      while (count !== ids.size) {
        count = ids.size
        for (const row of model.rows)
          if (row.parentId !== undefined && ids.has(row.parentId)) ids.add(row.id)
      }
      const rows = model.rows.filter((row) => !ids.has(row.id))
      return { model: changedRows(model, rows), outMessage: OutMessage.RowsChanged({ rows }) }
    },
    RowMoveCancelled: () => {
      return { model: { ...model, pendingMove: Option.none() } }
    },
    RowMoveConfirmed: () => {
      if (Option.isNone(model.pendingMove)) return { model }
      const move = model.pendingMove.value
      return dataTableMoveRows(
        { ...model, sorting: [], pendingMove: Option.none() },
        move.ids,
        move.targetId,
        move.place,
      )
    },
    RowMoved: (message) => {
      return dataTableMoveRows(
        model,
        model.selectedIds.includes(message.id)
          ? dataTableRows(model)
              .filter(({ row }) => model.selectedIds.includes(row.id))
              .map(({ row }) => row.id)
          : [message.id],
        message.targetId,
        'before',
      )
    },
    RowsMoved: (message) => {
      return dataTableMoveRows(model, message.ids, message.targetId, message.place ?? 'before')
    },
    ColumnPinChanged: (message) => {
      const left = model.pinnedColumns.left.filter((id) => id !== message.id),
        right = model.pinnedColumns.right.filter((id) => id !== message.id)
      return {
        model: {
          ...model,
          pinnedColumns: {
            left: message.side === 'left' ? [...left, message.id] : left,
            right: message.side === 'right' ? [...right, message.id] : right,
          },
        },
      }
    },
    ColumnsFrozenThrough: (message) => {
      const index = model.columnOrder.indexOf(message.id)
      return {
        model: {
          ...model,
          pinnedColumns: {
            left: model.columnOrder.slice(0, index + 1),
            right: model.pinnedColumns.right.filter(
              (id) => !model.columnOrder.slice(0, index + 1).includes(id),
            ),
          },
        },
      }
    },
    ViewSelected: (message) => {
      const view = model.views.find((entry) => entry.id === message.id)
      return !view
        ? { model }
        : {
            model: applySavedView(model, view),
            outMessage: OutMessage.ViewChanged({ id: view.id }),
          }
    },
    ViewNameChanged: ({ name }) => ({ model: { ...model, viewName: name } }),
    ViewRenamed: ({ id, name }) => ({
      model: {
        ...model,
        viewName: '',
        views: model.views.map((view) =>
          view.id === id && name.trim() ? { ...view, name: name.trim() } : view,
        ),
      },
    }),
    ViewSaved: (message) => {
      return {
        model: {
          ...model,
          viewName: '',
          views: [
            ...model.views.filter((view) => view.id !== message.id),
            {
              id: message.id,
              name: message.name,
              search: model.search,
              sorting: model.sorting,
              filters: model.filters,
              hiddenColumns: model.hiddenColumns,
              columnOrder: model.columnOrder,
            },
          ],
          activeViewId: Option.some(message.id),
        },
      }
    },
    ViewDeleted: (message) => {
      const views = model.views.filter((view) => view.id !== message.id)
      const next = { ...model, views }
      if (!Option.contains(model.activeViewId, message.id)) return { model: next }
      const fallback = views[0]
      return fallback === undefined
        ? { model: { ...next, activeViewId: Option.none() } }
        : {
            model: applySavedView(next, fallback),
            outMessage: OutMessage.ViewChanged({ id: fallback.id }),
          }
    },
    FiltersVisibilityChanged: () => {
      return { model: { ...model, filtersHidden: !model.filtersHidden } }
    },
    MenuChanged: (message) => {
      return {
        model: {
          ...model,
          menu: Option.fromNullishOr(message.menu),
          headerColumnId:
            message.menu?.kind === 'column' ? Option.some(message.menu.id) : model.headerColumnId,
        },
      }
    },
    FocusChanged: (message) => {
      return {
        model: {
          ...model,
          focusedCell: Option.some({ rowId: message.rowId, columnId: message.columnId }),
          focusedRowId: Option.some(message.rowId),
        },
      }
    },
  })
}

function dataTableMoveRows(
  model: DataTableModel,
  ids: ReadonlyArray<string>,
  targetId: string,
  place: 'before' | 'after',
) {
  const target = model.rows.find((row) => row.id === targetId)
  if (!target) return { model }
  const moving = new Set(
    model.rows
      .filter((row) => ids.includes(row.id) && row.parentId === target.parentId)
      .map((row) => row.id),
  )
  if (moving.size === 0 || moving.has(targetId)) return { model }
  let count = -1
  while (count !== moving.size) {
    count = moving.size
    for (const row of model.rows)
      if (row.parentId !== undefined && moving.has(row.parentId)) moving.add(row.id)
  }
  if (model.sorting.length > 0)
    return { model: { ...model, pendingMove: Option.some({ ids: [...moving], targetId, place }) } }
  const group = model.rows.filter((row) => moving.has(row.id)),
    rows = model.rows.filter((row) => !moving.has(row.id))
  let index = rows.findIndex((row) => row.id === targetId)
  if (place === 'after') {
    index++
    const descendants = new Set([targetId])
    let n = -1
    while (n !== descendants.size) {
      n = descendants.size
      for (const row of rows)
        if (row.parentId !== undefined && descendants.has(row.parentId)) descendants.add(row.id)
    }
    while (index < rows.length && descendants.has(rows[index]?.id ?? '')) index++
  }
  rows.splice(index, 0, ...group)
  return {
    model: changedRows(model, rows),
    outMessage: OutMessage.RowsMoved({ ids: group.map((row) => row.id), targetId }),
  }
}

const descendants: (model: DataTableModel, roots: ReadonlyArray<string>) => ReadonlyArray<string> =
  function descendants(model: DataTableModel, roots: ReadonlyArray<string>) {
    const ids = new Set(roots)
    let count = -1
    while (count !== ids.size) {
      count = ids.size
      for (const row of model.rows)
        if (row.parentId !== undefined && ids.has(row.parentId)) ids.add(row.id)
    }
    return model.rows.filter((row) => ids.has(row.id)).map((row) => row.id)
  }
