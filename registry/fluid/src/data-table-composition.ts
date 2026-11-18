import type { DataTableObservedMessage } from './data-table-observation.js'
import { Effect, Queue, Stream } from 'effect'
import {
  DataTableBlock,
  Table,
  HeaderMenu,
  ViewTabs,
  ViewMenu,
  Actions,
  Editors,
  Message,
} from './data-table-definition.js'
import { observeDataTable } from './data-table-dom.js'
export const ObserveDataTable = DataTableBlock.makeMountStream('ObserveDataTable', {
  messages: [
    Message.RowMoveConfirmed,
    Message.RowMoveCancelled,
    Message.SortDirectionChanged,
    Message.ColumnPinChanged,
    Message.ColumnsFrozenThrough,
    Message.RowsMoved,
    Message.SearchChanged,
    Message.SearchClosed,
    Message.FilterChanged,
    Message.SortChanged,
    Message.SelectionChanged,
    Message.PageSelectionChanged,
    Message.AllSelectionChanged,
    Message.PageChanged,
    Message.PageSizeChanged,
    Message.ExpansionChanged,
    Message.ColumnVisibilityChanged,
    Message.ColumnOrderChanged,
    Message.ColumnWidthChanged,
    Message.ColumnLinesChanged,
    Message.EditStarted,
    Message.EditDraftChanged,
    Message.EditCommitted,
    Message.EditCancelled,
    Message.UndoRequested,
    Message.RedoRequested,
    Message.RowsDeleted,
    Message.RowMoved,
    Message.ViewSelected,
    Message.ViewSaved,
    Message.ViewDeleted,
    Message.FiltersVisibilityChanged,
    Message.FocusChanged,
    Message.MenuChanged,
  ],
  *handler() {
    return ({ element, viewStateChanges }) =>
      viewStateChanges.pipe(
        Stream.switchMap((state) =>
          state === 'Live'
            ? Stream.callback<DataTableObservedMessage>((queue) =>
                Effect.acquireRelease(
                  Effect.sync(() =>
                    observeDataTable(
                      element,
                      (message) => {
                        Queue.offerUnsafe(queue, message)
                      },
                      Message,
                    ),
                  ),
                  (cleanup) => Effect.sync(cleanup),
                ),
              )
            : Stream.empty,
        ),
      )
  },
})
export const Composition = DataTableBlock.makeComposition({
  bindings: [Table, ViewTabs, HeaderMenu, ViewMenu, Actions, Editors],
  mounts: [ObserveDataTable],
})
