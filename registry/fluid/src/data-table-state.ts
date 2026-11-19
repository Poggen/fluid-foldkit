import { Option } from 'effect'
import type {
  DataTableColumn,
  DataTableFilterValue,
  DataTableModel,
  DataTableRow,
  DataTableValue,
} from './data-table-definition.js'
type DataTableState = Omit<
  DataTableModel,
  'filterSelects' | 'table' | 'viewTabs' | 'headerMenu' | 'viewMenu' | 'actions' | 'editors'
>
export const dataTableText: (value: DataTableValue | undefined) => string = (
  value: DataTableValue | undefined,
) => (Array.isArray(value) ? value.join(' ') : String(value ?? ''))
export const dataTableMatches: (
  value: DataTableValue | undefined,
  filter: DataTableFilterValue,
) => boolean = function dataTableMatches(
  value: DataTableValue | undefined,
  filter: DataTableFilterValue,
) {
  const text = dataTableText(value).toLowerCase()
  if (typeof filter === 'string') return text.includes(filter.toLowerCase())
  switch (filter.kind) {
    case 'text': {
      const query = filter.query.toLowerCase()
      switch (filter.op ?? 'contains') {
        case 'is':
          return text === query
        case 'is not':
          return text !== query
        case 'contains':
          return text.includes(query)
        case 'does not contain':
          return !text.includes(query)
        case 'starts with':
          return text.startsWith(query)
        case 'ends with':
          return text.endsWith(query)
        case 'is empty':
          return text.length === 0
        case 'is not empty':
          return text.length > 0
      }
    }
    case 'options': {
      if (filter.values.length === 0) return true
      const values = Array.isArray(value) ? value : [String(value ?? '')]
      const matches = values.some((item) => filter.values.includes(item))
      return filter.op === 'is not' ? !matches : matches
    }
    case 'number': {
      if (value === null || value === undefined || value === '')
        return filter.min === undefined && filter.max === undefined
      const number = Number(value)
      return (
        Number.isFinite(number) &&
        (filter.min === undefined || number >= filter.min) &&
        (filter.max === undefined || number <= filter.max)
      )
    }
    case 'date': {
      const day = dataTableText(value).slice(0, 10)
      if (!day) return filter.from === undefined && filter.to === undefined
      if (filter.op === 'before') return !filter.to || day < filter.to
      if (filter.op === 'after') return !filter.from || day > filter.from
      return (!filter.from || day >= filter.from) && (!filter.to || day <= filter.to)
    }
  }
}
export const dataTableColumns: (model: DataTableState) => ReadonlyArray<DataTableColumn> =
  function dataTableColumns(model: DataTableState) {
    const byId = new Map(model.columns.map((column) => [column.id, column]))
    const hidden = new Set(model.hiddenColumns)
    const order = [...new Set([...model.columnOrder, ...model.columns.map((column) => column.id)])]
    const left = new Set(model.pinnedColumns.left),
      right = new Set(model.pinnedColumns.right)
    const ids = [
      ...model.pinnedColumns.left,
      ...order.filter((id) => !left.has(id) && !right.has(id)),
      ...model.pinnedColumns.right.filter((id) => !left.has(id)),
    ]
    return ids.flatMap((id) => {
      const column = byId.get(id)
      return column === undefined || hidden.has(id) ? [] : [column]
    })
  }
export const dataTableFilteredRows: (model: DataTableState) => ReadonlyArray<DataTableRow> =
  function dataTableFilteredRows(model: DataTableState) {
    const query = (typeof model.search === 'string' ? model.search : model.search.query)
      .trim()
      .toLowerCase()
    const searchColumn = typeof model.search === 'string' ? null : model.search.column
    const matches = (row: DataTableRow) =>
      model.filters.every((filter) => dataTableMatches(row.values[filter.id], filter.value)) &&
      (!query ||
        model.columns.some(
          (column) =>
            (searchColumn === null || searchColumn === column.id) &&
            dataTableText(row.values[column.id]).toLowerCase().includes(query),
        ))
    const byId = new Map(model.rows.map((row) => [row.id, row]))
    const accepted = new Set(model.rows.filter(matches).map((row) => row.id))
    const walked = new Set<string>()
    for (const row of model.rows) {
      if (!accepted.has(row.id)) continue
      let parent = row.parentId
      while (parent !== undefined && !walked.has(parent)) {
        walked.add(parent)
        accepted.add(parent)
        parent = byId.get(parent)?.parentId
      }
    }
    return model.rows
      .filter((row) => accepted.has(row.id))
      .toSorted((a, b) => {
        for (const sort of model.sorting) {
          const av = a.values[sort.id],
            bv = b.values[sort.id]
          const result =
            typeof av === 'number' && typeof bv === 'number'
              ? av - bv
              : dataTableText(av).localeCompare(dataTableText(bv), undefined, { numeric: true })
          if (result !== 0) return sort.desc ? -result : result
        }
        return 0
      })
  }
export const dataTableRoots = (model: DataTableState) => {
  const ids = new Set(model.rows.map((row) => row.id))
  return dataTableFilteredRows(model).filter(
    (row) => row.parentId === undefined || !ids.has(row.parentId),
  )
}
export const dataTablePageCount = (model: DataTableState) =>
  Math.max(1, Math.ceil(dataTableRoots(model).length / Math.max(1, model.pageSize)))
export const dataTableRows: (
  model: DataTableState,
) => ReadonlyArray<{ readonly row: DataTableRow; readonly depth: number }> = function dataTableRows(
  model: DataTableState,
) {
  const filtered = dataTableFilteredRows(model)
  const ids = new Set(model.rows.map((row) => row.id))
  const expanded = new Set(model.expandedIds)
  const children = new Map<string, Array<DataTableRow>>()
  for (const row of filtered) {
    if (row.parentId === undefined) continue
    const siblings = children.get(row.parentId)
    if (siblings === undefined) children.set(row.parentId, [row])
    else siblings.push(row)
  }
  const roots = filtered.filter((row) => row.parentId === undefined || !ids.has(row.parentId))
  const result: Array<{ row: DataTableRow; depth: number }> = []
  const seen = new Set<string>()
  const visit = (row: DataTableRow, depth: number) => {
    if (seen.has(row.id)) return
    seen.add(row.id)
    result.push({ row, depth })
    if (expanded.has(row.id))
      for (const child of children.get(row.id) ?? []) visit(child, depth + 1)
  }
  for (const row of roots.slice(
    model.pageIndex * model.pageSize,
    (model.pageIndex + 1) * model.pageSize,
  ))
    visit(row, 0)
  return result
}
export const reconcileDataTable: <Model extends DataTableState>(model: Model) => Model = <
  Model extends DataTableState,
>(
  model: Model,
) => {
  const ids = new Set(model.rows.map((row) => row.id))
  return {
    ...model,
    focusedCell: Option.filter(model.focusedCell, (cell) => ids.has(cell.rowId)),
    focusedRowId: Option.filter(model.focusedRowId, (id) => ids.has(id)),
    pageIndex: Math.min(model.pageIndex, dataTablePageCount(model) - 1),
    selectedIds: model.selectedIds.filter((id) => ids.has(id)),
  }
}

export const dataTableSelectedRows: (model: DataTableState) => ReadonlyArray<DataTableRow> =
  function dataTableSelectedRows(model: DataTableState) {
    const selected = new Set(model.selectedIds),
      byId = new Map(model.rows.map((row) => [row.id, row]))
    return model.rows.filter((row) => {
      if (!selected.has(row.id)) return false
      let parent = row.parentId
      const seen = new Set<string>()
      while (parent !== undefined && !seen.has(parent)) {
        if (selected.has(parent)) return false
        seen.add(parent)
        parent = byId.get(parent)?.parentId
      }
      return true
    })
  }
