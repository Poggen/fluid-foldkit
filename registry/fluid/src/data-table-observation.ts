import { Option, Schema } from 'effect'
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

const decodeIds = Schema.decodeUnknownOption(Schema.fromJsonString(Schema.Array(Schema.String)))

export const gridIds = (root: Element, name: 'data-grid-selected' | 'data-grid-columns') => [
  ...Option.getOrElse(decodeIds(root.getAttribute(name)), () => []),
]
