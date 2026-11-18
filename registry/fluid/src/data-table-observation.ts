import type { Message } from './data-table-definition.js'

export type DataTableObservedMessage = Extract<
  typeof Message.Type,
  {
    readonly _tag:
      | 'SearchClosed'
      | 'SortChanged'
      | 'MenuChanged'
      | 'SelectionChanged'
      | 'AllSelectionChanged'
      | 'EditStarted'
      | 'FocusChanged'
      | 'ColumnWidthChanged'
      | 'UndoRequested'
      | 'RedoRequested'
      | 'RowsMoved'
      | 'ColumnOrderChanged'
  }
>
