import { Option } from 'effect'
import type { DataTableConfig, DataTableModel } from './data-table-definition.js'
export const initialDataTable = (
  config: DataTableConfig,
): Omit<
  DataTableModel,
  'table' | 'viewTabs' | 'headerMenu' | 'viewMenu' | 'actions' | 'editors'
> => ({
  id: config.id,
  viewName: '',
  pendingMove: Option.none(),
  headerColumnId: Option.none(),
  rows: config.rows,
  columns: config.columns,
  selectedIds: config.initialSelectedIds ?? [],
  expandedIds: config.initialExpandedIds ?? [],
  sorting: config.initialSorting ?? [],
  filters: config.initialFilters ?? [],
  search: '',
  searchOpen: false,
  pinnedColumns: config.initialPinnedColumns ?? {
    left: config.columns
      .filter((column) => ['drag', 'select'].includes(column.id))
      .map((column) => column.id)
      .concat(
        config.columns.find((column) => !['drag', 'select', 'actions'].includes(column.id))?.id ??
          [],
      ),
    right: config.columns.some((column) => column.id === 'actions') ? ['actions'] : [],
  },
  pageIndex: 0,
  pageSize: Math.max(1, config.pageSize ?? 10),
  columnOrder: config.columns.map((column) => column.id),
  hiddenColumns: [],
  columnWidths: {},
  columnLines: {},
  editing: Option.none(),
  history: [],
  future: [],
  views: config.views ?? [],
  activeViewId: Option.none(),
  filtersHidden: config.filtersHidden ?? false,
  disabled: config.disabled ?? false,
  selectable: config.selectable ?? true,
  editable: config.editable ?? true,
  focusedRowId: Option.none(),
  focusedCell: Option.none(),
  menu: Option.none(),
})
