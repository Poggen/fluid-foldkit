import { FocusSearch } from './data-table-search-focus.js'
/* @license Derived from Fluid Functionalism f8014098. MIT, copyright 2026 Micka Touillaud. */
import { Effect, Layer, Option } from 'effect'
import { Update } from 'foldkit'
import { DataTableBlock, Message } from './data-table-definition.js'
import type { DataTableConfig } from './data-table-definition.js'
import { syncDataTableModel, applyDataTableResult } from './data-table-transitions.js'
import { DataTableActionsLayer } from './data-table-actions.js'
import { layer as EditorsLayer } from './data-table-editors.js'
import { initialDataTable } from './data-table-initial.js'
import { Composition, ObserveDataTable } from './data-table-composition.js'
import { menuLayer as DropdownLayer } from './dropdown.js'
import { layer as TabsLayer } from './tabs.js'
import { layer as TableLayer } from './table.js'
import { reconcileDataTable } from './data-table-state.js'
import { dataTableUpdate, dataTableUndo, dataTableChangeRows } from './data-table-update.js'
import { makeDataTableView } from './data-table-view.js'
import { createMotionScope } from './motion.js'
export { DataTableBlock } from './data-table-definition.js'
export type {
  DataTableConfig,
  DataTableModel,
  DataTableViewInputs,
  DataTableColumn,
  DataTableRow,
  DataTableValue,
  DataTableEditor,
  DataTableFilterValue,
  DataTableView,
} from './data-table-definition.js'
export {
  dataTableRows,
  dataTableColumns,
  dataTablePageCount,
  dataTableFilteredRows,
  dataTableSelectedRows,
  dataTableMatches,
} from './data-table-state.js'
const init = Composition.makeInit((config: DataTableConfig) => ({
  childInitContext: config,
  model: initialDataTable(config),
}))
const handle = DataTableBlock.makeStep((model, message: typeof Message.Type) =>
  applyDataTableResult(dataTableUpdate(model, message)),
)
const searchFocus = DataTableBlock.makeStep(
  (model, message: typeof Message.SearchOpened.Type | typeof Message.SearchClosed.Type) =>
    Update.combineSteps([
      syncDataTableModel(dataTableUpdate(model, message).model),
      DataTableBlock.makeCommandsStep(() => [
        FocusSearch({ id: model.id, target: message._tag === 'SearchOpened' ? 'input' : 'button' }),
      ]),
    ]),
)
const update = Composition.makeUpdate({
  SearchChanged: handle,
  SearchOpened: searchFocus,
  SearchBlurred: handle,
  SearchClosed: searchFocus,
  SearchFocusCompleted: (model) => ({ model }),
  FilterChanged: handle,
  SortChanged: handle,
  SortDirectionChanged: handle,
  SelectionChanged: handle,
  PageSelectionChanged: handle,
  AllSelectionChanged: handle,
  PageChanged: handle,
  PageSizeChanged: handle,
  ExpansionChanged: handle,
  ColumnPinChanged: handle,
  ColumnsFrozenThrough: handle,
  RowsMoved: handle,
  ColumnVisibilityChanged: handle,
  ColumnOrderChanged: handle,
  ColumnWidthChanged: handle,
  ColumnLinesChanged: handle,
  TextWrapChanged: handle,
  EditStarted: handle,
  EditDraftChanged: handle,
  EditCommitted: handle,
  EditCancelled: handle,
  UndoRequested: handle,
  RedoRequested: handle,
  RowsDeleted: handle,
  RowMoved: handle,
  RowMoveConfirmed: handle,
  RowMoveCancelled: handle,
  ViewSelected: handle,
  ViewNameChanged: handle,
  ViewRenamed: handle,
  ViewSaved: handle,
  ViewDeleted: handle,
  FiltersVisibilityChanged: handle,
  MenuChanged: handle,
  FocusChanged: handle,
})
const inMessageUpdate = Composition.makeInMessageUpdate({
  RequestedRowsChange: DataTableBlock.makeStep((model, { rows }) => {
    const result = dataTableChangeRows(model, rows)
    const steps = syncDataTableModel(result.model)
    return (registered: Parameters<typeof steps>[0]) =>
      Update.withOutMessage(steps(registered), result.outMessage)
  }),
  RequestedOptions: DataTableBlock.makeStep((model, options) => {
    const pageSize = Math.max(1, options.pageSize ?? model.pageSize)
    const lines = options.lines
    return syncDataTableModel(
      reconcileDataTable({
        ...model,
        pageSize,
        columnLines:
          lines === undefined
            ? model.columnLines
            : Object.fromEntries(model.columns.map((column) => [column.id, lines])),
        search:
          options.searchColumn === undefined
            ? model.search
            : options.searchColumn === null
              ? typeof model.search === 'string'
                ? model.search
                : model.search.query
              : {
                  column: options.searchColumn,
                  query: typeof model.search === 'string' ? model.search : model.search.query,
                },
        pageIndex:
          options.searchColumn === undefined
            ? Math.floor((model.pageIndex * model.pageSize) / pageSize)
            : 0,
        selectable: options.selectable ?? model.selectable,
        editable: options.editable ?? model.editable,
        editing: options.editable === false ? Option.none() : model.editing,
      }),
    )
  }),
  RequestedConfigure: DataTableBlock.makeStep((model, { rows, columns, disabled }) =>
    syncDataTableModel(reconcileDataTable({ ...model, rows, columns, disabled })),
  ),
  RequestedClearSelection: DataTableBlock.makeStep((model) =>
    syncDataTableModel({ ...model, selectedIds: [] }),
  ),
  RequestedUndo: DataTableBlock.makeStep((model) => {
    const result = dataTableUndo(model)
    const steps = syncDataTableModel(result.model)
    return (registered: Parameters<typeof steps>[0]) =>
      Update.withOutMessage(steps(registered), result.outMessage)
  }),
  RequestedRedo: DataTableBlock.makeStep((model) => {
    const result = dataTableUndo(model, true)
    const steps = syncDataTableModel(result.model)
    return (registered: Parameters<typeof steps>[0]) =>
      Update.withOutMessage(steps(registered), result.outMessage)
  }),
})
export const DataTableLayer = DataTableBlock.makeLayer(
  Effect.gen(function* () {
    const children = yield* Composition.acquireChildren()
    const motion = createMotionScope('DataTableView')
    yield* Layer.build(motion.layer)
    return {
      children,
      init,
      update,
      inMessageUpdate,
      view: makeDataTableView(motion),
      EffectsLayer: Layer.merge(ObserveDataTable.layer, FocusSearch.layer),
    }
  }),
).pipe(
  Layer.provide(
    Layer.mergeAll(TabsLayer, TableLayer, DropdownLayer, DataTableActionsLayer, EditorsLayer),
  ),
)
export const layer = DataTableLayer
