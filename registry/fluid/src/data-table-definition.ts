// Derived from Fluid Functionalism f8014098. MIT, copyright 2026 Micka Touillaud.
import { Schema, Option } from 'effect'
import { Update } from 'foldkit'
import { DataTableActionsBlock, DataTableAction } from './data-table-actions.js'
import { DataTableEditorsBlock } from './data-table-editors-definition.js'
import type { DialogResources } from './dialog-resources.js'
import { applyDataTableResult, syncDataTableModel } from './data-table-transitions.js'
import { dataTableUpdate } from './data-table-update.js'
import { Block } from 'foldkit'
import type { Html } from 'foldkit/html'
import type { Composition } from './data-table-composition.js'
export type DataTableViewBuilder = Block.ViewBuilderFor<typeof Composition>
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import { TabsBlock } from './tabs.js'
import { TableBlock } from './table.js'
import { DropdownMenuBlock } from './dropdown.js'
import type { DropdownResources } from './dropdown-resources.js'
import { initialDataTable } from './data-table-initial.js'
import { dataTableRows } from './data-table-state.js'
import type { Presentation } from './presentation.js'

import { DataTableValue, DataTableEditor } from './data-table-editor-value.js'
export { DataTableValue, DataTableOption, DataTableEditor } from './data-table-editor-value.js'
export const DataTableRow = Schema.Struct({
  id: Schema.String,
  values: Schema.Record(Schema.String, DataTableValue),
  parentId: Schema.optionalKey(Schema.String),
})
export type DataTableRow = typeof DataTableRow.Type
export const DataTableLines = Schema.Union([Schema.Literals([1, 2]), Schema.Literal('wrap')])
export const DataTableColumn = Schema.Struct({
  id: Schema.String,
  header: Schema.String,
  editor: Schema.optionalKey(DataTableEditor),
  filter: Schema.optionalKey(
    Schema.Union([Schema.Literals(['text', 'number', 'date', 'options']), Schema.Boolean]),
  ),
  sortable: Schema.optionalKey(Schema.Boolean),
  hideable: Schema.optionalKey(Schema.Boolean),
  editable: Schema.optionalKey(Schema.Boolean),
  lines: Schema.optionalKey(DataTableLines),
  width: Schema.optionalKey(Schema.Finite),
})
export type DataTableColumn = typeof DataTableColumn.Type
export const DataTableSearch = Schema.Union([
  Schema.String,
  Schema.Struct({ column: Schema.String, query: Schema.String }),
])
export const DataTableFilterValue = Schema.Union([
  Schema.String,
  Schema.Struct({
    kind: Schema.Literal('text'),
    query: Schema.String,
    op: Schema.optionalKey(
      Schema.Literals([
        'is',
        'is not',
        'contains',
        'does not contain',
        'starts with',
        'ends with',
        'is empty',
        'is not empty',
      ]),
    ),
  }),
  Schema.Struct({
    kind: Schema.Literal('options'),
    values: Schema.Array(Schema.String),
    op: Schema.optionalKey(Schema.Literals(['is', 'is not'])),
  }),
  Schema.Struct({
    kind: Schema.Literal('number'),
    min: Schema.optionalKey(Schema.Finite),
    max: Schema.optionalKey(Schema.Finite),
  }),
  Schema.Struct({
    kind: Schema.Literal('date'),
    op: Schema.optionalKey(Schema.Literals(['between', 'before', 'after'])),
    from: Schema.optionalKey(Schema.String),
    to: Schema.optionalKey(Schema.String),
  }),
])
export type DataTableFilterValue = typeof DataTableFilterValue.Type
export const Sorting = Schema.Array(Schema.Struct({ id: Schema.String, desc: Schema.Boolean }))
export const Filters = Schema.Array(
  Schema.Struct({ id: Schema.String, value: DataTableFilterValue }),
)
export const DataTableView = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  search: DataTableSearch,
  sorting: Sorting,
  filters: Filters,
  hiddenColumns: Schema.Array(Schema.String),
  columnOrder: Schema.Array(Schema.String),
})
export type DataTableView = typeof DataTableView.Type
const Menu = Schema.Struct({
  kind: Schema.Literals(['column', 'row', 'columns', 'filters']),
  id: Schema.String,
})
const PinnedColumns = Schema.Struct({
  left: Schema.Array(Schema.String),
  right: Schema.Array(Schema.String),
})
const FocusedCell = Schema.OptionFromNullOr(
  Schema.Struct({ rowId: Schema.String, columnId: Schema.String }),
)
const HistoryEntry = Schema.Struct({
  rows: Schema.Array(DataTableRow),
  selectedIds: Schema.Array(Schema.String),
  focusedCell: FocusedCell,
})
const Config = Schema.Struct({
  rowActions: Schema.optionalKey(Schema.Array(DataTableAction)),
  selectionActions: Schema.optionalKey(Schema.Array(DataTableAction)),
  initialSelectedIds: Schema.optionalKey(Schema.Array(Schema.String)),
  initialExpandedIds: Schema.optionalKey(Schema.Array(Schema.String)),
  initialFilters: Schema.optionalKey(Filters),
  initialSorting: Schema.optionalKey(Sorting),
  initialPinnedColumns: Schema.optionalKey(PinnedColumns),
  id: Schema.String,
  rows: Schema.Array(DataTableRow),
  columns: Schema.Array(DataTableColumn),
  pageSize: Schema.optionalKey(Schema.Natural),
  disabled: Schema.optionalKey(Schema.Boolean),
  selectable: Schema.optionalKey(Schema.Boolean),
  editable: Schema.optionalKey(Schema.Boolean),
  views: Schema.optionalKey(Schema.Array(DataTableView)),
  filtersHidden: Schema.optionalKey(Schema.Boolean),
})
export type DataTableConfig = typeof Config.Type
const Model = Schema.Struct({
  pendingMove: Schema.OptionFromNullOr(
    Schema.Struct({
      ids: Schema.Array(Schema.String),
      targetId: Schema.String,
      place: Schema.Literals(['before', 'after']),
    }),
  ),
  actions: DataTableActionsBlock.Model,
  editors: DataTableEditorsBlock.Model,
  table: TableBlock.Model,
  viewTabs: TabsBlock.Model,
  viewName: Schema.String,
  headerMenu: DropdownMenuBlock.Model,
  viewMenu: DropdownMenuBlock.Model,
  headerColumnId: Schema.OptionFromNullOr(Schema.String),
  id: Schema.String,
  rows: Schema.Array(DataTableRow),
  columns: Schema.Array(DataTableColumn),
  pinnedColumns: PinnedColumns,
  selectedIds: Schema.Array(Schema.String),
  expandedIds: Schema.Array(Schema.String),
  sorting: Sorting,
  filters: Filters,
  search: DataTableSearch,
  searchOpen: Schema.Boolean,
  pageIndex: Schema.Natural,
  pageSize: Schema.Natural,
  columnOrder: Schema.Array(Schema.String),
  hiddenColumns: Schema.Array(Schema.String),
  columnWidths: Schema.Record(Schema.String, Schema.Finite),
  columnLines: Schema.Record(Schema.String, DataTableLines),
  editing: Schema.OptionFromNullOr(
    Schema.Struct({ rowId: Schema.String, columnId: Schema.String, draft: DataTableValue }),
  ),
  history: Schema.Array(HistoryEntry),
  future: Schema.Array(HistoryEntry),
  views: Schema.Array(DataTableView),
  activeViewId: Schema.OptionFromNullOr(Schema.String),
  filtersHidden: Schema.Boolean,
  disabled: Schema.Boolean,
  selectable: Schema.Boolean,
  editable: Schema.Boolean,
  focusedRowId: Schema.OptionFromNullOr(Schema.String),
  focusedCell: Schema.OptionFromNullOr(
    Schema.Struct({ rowId: Schema.String, columnId: Schema.String }),
  ),
  menu: Schema.OptionFromNullOr(Menu),
})
export const Message = defineMessageUnion({
  RowMoveConfirmed: {},
  RowMoveCancelled: {},
  SearchChanged: { search: DataTableSearch },
  SearchOpened: {},
  SearchBlurred: {},
  SearchClosed: {},
  SearchFocusCompleted: {},
  FilterChanged: { id: Schema.String, value: Schema.NullOr(DataTableFilterValue) },
  SortDirectionChanged: {
    id: Schema.String,
    direction: Schema.NullOr(Schema.Literals(['asc', 'desc'])),
  },
  SortChanged: { id: Schema.String, multi: Schema.Boolean },
  SelectionChanged: { id: Schema.String, selected: Schema.Boolean },
  AllSelectionChanged: { selected: Schema.Boolean },
  PageSelectionChanged: { selected: Schema.Boolean },
  PageChanged: { pageIndex: Schema.Natural },
  PageSizeChanged: { pageSize: Schema.Natural },
  ExpansionChanged: { id: Schema.String },
  ColumnPinChanged: { id: Schema.String, side: Schema.NullOr(Schema.Literals(['left', 'right'])) },
  ColumnsFrozenThrough: { id: Schema.String },
  RowsMoved: {
    ids: Schema.Array(Schema.String),
    targetId: Schema.String,
    place: Schema.optionalKey(Schema.Literals(['before', 'after'])),
  },
  ColumnVisibilityChanged: { id: Schema.String, visible: Schema.Boolean },
  ColumnOrderChanged: { ids: Schema.Array(Schema.String) },
  ColumnWidthChanged: { id: Schema.String, width: Schema.Finite },
  ColumnLinesChanged: { id: Schema.String, lines: DataTableLines },
  TextWrapChanged: { wrapped: Schema.Boolean },
  EditStarted: { rowId: Schema.String, columnId: Schema.String },
  EditDraftChanged: { value: DataTableValue },
  EditCommitted: {},
  EditCancelled: {},
  UndoRequested: {},
  RedoRequested: {},
  RowsDeleted: { ids: Schema.Array(Schema.String) },
  RowMoved: { id: Schema.String, targetId: Schema.String },
  ViewSelected: { id: Schema.String },
  ViewNameChanged: { name: Schema.String },
  ViewRenamed: { id: Schema.String, name: Schema.String },
  ViewSaved: { id: Schema.String, name: Schema.String },
  ViewDeleted: { id: Schema.String },
  FiltersVisibilityChanged: {},
  MenuChanged: { menu: Schema.NullOr(Menu) },
  FocusChanged: { rowId: Schema.String, columnId: Schema.String },
})
export const InMessage = defineInMessageUnion({
  RequestedRowsChange: { rows: Schema.Array(DataTableRow) },
  RequestedOptions: {
    lines: Schema.optionalKey(DataTableLines),
    searchColumn: Schema.optionalKey(Schema.NullOr(Schema.String)),
    pageSize: Schema.optionalKey(Schema.Natural),
    selectable: Schema.optionalKey(Schema.Boolean),
    editable: Schema.optionalKey(Schema.Boolean),
  },
  RequestedConfigure: {
    rows: Schema.Array(DataTableRow),
    columns: Schema.Array(DataTableColumn),
    disabled: Schema.Boolean,
  },
  RequestedClearSelection: {},
  RequestedUndo: {},
  RequestedRedo: {},
})
export const OutMessage = defineMessageUnion({
  RowsChanged: { rows: Schema.Array(DataTableRow) },
  CellEdited: { rowId: Schema.String, columnId: Schema.String, value: DataTableValue },
  SelectionChanged: { ids: Schema.Array(Schema.String) },
  RowMoved: { id: Schema.String, targetId: Schema.String },
  RowsMoved: { ids: Schema.Array(Schema.String), targetId: Schema.String },
  ViewChanged: { id: Schema.String },
  ActionSelected: { action: Schema.String, ids: Schema.Array(Schema.String) },
})
export interface DataTableViewInputs extends Presentation {
  readonly lines?: 1 | 2 | 'wrap'
  readonly empty?: boolean
  readonly searchColumn?: string
  readonly searchCollapsible?: boolean
  readonly searchWidth?: number
  readonly renderCell?: (cell: {
    readonly row: DataTableRow
    readonly column: DataTableColumn
    readonly value: DataTableValue | undefined
  }) => Html | undefined
  readonly editable?: boolean
  readonly resizableColumns?: boolean
  readonly reorderColumns?: boolean
  readonly cellAlignment?: 'auto' | 'top' | 'center'
  readonly savedViews?: boolean
  readonly className?: string
  readonly label?: string
  readonly emptyTitle?: string
  readonly emptyDescription?: string
  readonly loading?: boolean
  readonly searchPlaceholder?: string
  readonly title?: string
  readonly description?: string
  readonly draggable?: boolean
  readonly showSearch?: boolean
  readonly showFilters?: boolean
  readonly showViewOptions?: boolean
  readonly showSelectionBar?: boolean
  readonly showHistory?: boolean
  readonly showToolbar?: boolean
  /** Positive safe-integer page sizes. Empty hides the picker; the current size remains available. */
  readonly pageSizes?: ReadonlyArray<number>
  readonly showPagination?: boolean
}
const effects = Block.makeEffectsContract<
  never,
  | DropdownResources
  | DialogResources
  | Block.FactsOf<typeof DataTableEditorsBlock>['programRequirements']
>()
export const DataTableKey = Symbol('DataTable')
export const DataTableBlock = Block.make('DataTable', {
  key: DataTableKey,
  Model,
  Message,
  InMessage,
  OutMessage,
  InitArgs: Schema.Tuple([Config]),
  ChildInitContext: Config,
  view: { kind: 'Element', Inputs: Block.makeInputContract<DataTableViewInputs>() },
  effects,
  inMessageOutputs: {
    RequestedRowsChange: { outMessage: OutMessage.RowsChanged },
    RequestedUndo: { outMessage: OutMessage.RowsChanged },
    RequestedRedo: { outMessage: OutMessage.RowsChanged },
  },
})
export const Definition = DataTableBlock
export const Table = DataTableBlock.makeRequiredFieldBinding(TableBlock, {
  field: 'table',
  init: {
    contextToArgs: (config: DataTableConfig) => [
      {
        id: `${config.id}-table`,
        selectedIndices: dataTableRows(initialDataTable(config)).flatMap(({ row }, index) =>
          config.initialSelectedIds?.includes(row.id) ? [index] : [],
        ),
      },
    ],
  },
})
export type DataTableModel = typeof Model.Type

export const HeaderMenu = DataTableBlock.makeRequiredFieldBinding(DropdownMenuBlock, {
  field: 'headerMenu',
  init: {
    contextToArgs: (config: DataTableConfig) => [{ id: `${config.id}-header-menu`, open: false }],
  },
}).withOutMessagePolicy({
  fold: DataTableBlock.makeOutMessageFold(DropdownMenuBlock, {
    Events: ({ events }) =>
      DataTableBlock.makeStep((model) => ({
        model:
          events.some((event) => event._tag === 'OpenChanged' && !event.open) &&
          Option.getOrNull(model.menu)?.kind === 'column'
            ? { ...model, menu: Option.none() }
            : events.some((event) => event._tag === 'OpenChanged' && event.open) &&
                Option.isSome(model.headerColumnId)
              ? { ...model, menu: Option.some({ kind: 'column', id: model.headerColumnId.value }) }
              : model,
      })),
  }),
})

export const RawViewTabs = DataTableBlock.makeRequiredFieldBinding(TabsBlock, {
  field: 'viewTabs',
  init: {
    contextToArgs: (config: DataTableConfig) => [
      { id: config.id + '-saved-views', selectedIndex: 0 },
    ],
  },
})
export const ViewTabs = RawViewTabs.withOutMessagePolicy({
  fold: DataTableBlock.makeOutMessageFold(TabsBlock, {
    Selected: ({ index }) =>
      DataTableBlock.makeStep((model) => {
        const selected = model.views[index]
        return selected === undefined
          ? { model }
          : applyDataTableResult(dataTableUpdate(model, Message.ViewSelected({ id: selected.id })))
      }),
  }),
})
export const RawActions = DataTableBlock.makeRequiredFieldBinding(DataTableActionsBlock, {
  field: 'actions',
  init: {
    contextToArgs: (config: DataTableConfig) => [
      {
        id: `${config.id}-actions`,
        selectedIds: config.initialSelectedIds ?? [],
        disabled: config.disabled ?? false,
        selectable: config.selectable ?? true,
        ...(config.rowActions === undefined ? {} : { rowActions: config.rowActions }),
        ...(config.selectionActions === undefined
          ? {}
          : { selectionActions: config.selectionActions }),
      },
    ],
  },
})
export const Actions = RawActions.withOutMessagePolicy({
  fold: DataTableBlock.makeOutMessageFold(DataTableActionsBlock, {
    MoveConfirmed: () =>
      DataTableBlock.makeStep((model) =>
        applyDataTableResult(dataTableUpdate(model, Message.RowMoveConfirmed())),
      ),
    MoveCancelled: () =>
      DataTableBlock.makeStep((model) =>
        applyDataTableResult(dataTableUpdate(model, Message.RowMoveCancelled())),
      ),
    ActionSelected: ({ action, ids }) =>
      DataTableBlock.makeStep((model) => {
        if (action === 'delete')
          return applyDataTableResult(dataTableUpdate(model, Message.RowsDeleted({ ids })))
        if (action === 'select')
          return applyDataTableResult(
            dataTableUpdate(
              model,
              Message.SelectionChanged({
                id: ids[0] ?? '',
                selected: !model.selectedIds.includes(ids[0] ?? ''),
              }),
            ),
          )
        if (action === 'clear-selection') {
          const steps = syncDataTableModel({ ...model, selectedIds: [] })
          return (registered: Parameters<typeof steps>[0]) =>
            Update.withOutMessage(steps(registered), OutMessage.SelectionChanged({ ids: [] }))
        }
        return { model, outMessage: OutMessage.ActionSelected({ action, ids }) }
      }),
  }),
})
export const RawEditors = DataTableBlock.makeRequiredFieldBinding(DataTableEditorsBlock, {
  field: 'editors',
  init: { contextToArgs: (config: DataTableConfig) => [`${config.id}-editors`] },
})
export const Editors = RawEditors.withOutMessagePolicy({
  fold: DataTableBlock.makeOutMessageFold(DataTableEditorsBlock, {
    DraftChanged: ({ value }) =>
      DataTableBlock.makeStep((model) =>
        applyDataTableResult(dataTableUpdate(model, Message.EditDraftChanged({ value }))),
      ),
    Committed: ({ value }) =>
      DataTableBlock.makeStep((model) => {
        const draft = dataTableUpdate(model, Message.EditDraftChanged({ value }))
        return applyDataTableResult(dataTableUpdate(draft.model, Message.EditCommitted()))
      }),
    Cancelled: () =>
      DataTableBlock.makeStep((model) =>
        applyDataTableResult(dataTableUpdate(model, Message.EditCancelled())),
      ),
  }),
})

export const ViewMenu = DataTableBlock.makeRequiredFieldBinding(DropdownMenuBlock, {
  field: 'viewMenu',
  init: {
    contextToArgs: (config: DataTableConfig) => [{ id: `${config.id}-view-menu` }],
  },
}).withOutMessagePolicy({
  fold: DataTableBlock.makeOutMessageFold(DropdownMenuBlock, {
    Events: () => DataTableBlock.makeNoopStep(),
  }),
})
