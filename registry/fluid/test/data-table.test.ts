import { Effect, Schema, Layer, Option } from 'effect'
import { it } from '@effect/vitest'
import { describe, expect } from 'vitest'
import { Story } from 'foldkit'
import { TableBlock, test as tableTest } from '../src/table.js'
import { SelectionBackgroundsBlock, test as selectionTest } from '../src/selection-backgrounds.js'
import {
  DataTableBlock,
  DataTableLayer,
  dataTableRows,
  dataTableColumns,
  dataTablePageCount,
} from '../src/data-table.js'
import { DropdownResourcesServerLayer } from '../src/dropdown-resources.js'
const subject = {
  block: DataTableBlock,
  layer: DataTableLayer.pipe(Layer.provide(DropdownResourcesServerLayer)),
}
const { Message, InMessage, OutMessage } = DataTableBlock
const columns = [
  { id: 'name', header: 'Name', editor: { type: 'text' as const } },
  { id: 'amount', header: 'Amount', editor: { type: 'number' as const } },
]
const rows = [
  { id: 'a', values: { name: 'Ada', amount: 3 } },
  { id: 'b', values: { name: 'Bea', amount: 1 } },
  { id: 'c', values: { name: 'Cal', amount: 2 } },
]
const init = () => Story.init({ id: 'people', rows, columns, pageSize: 2 })

const settle = (...generations: ReadonlyArray<number>) =>
  Story.Command.resolveAllExact(
    ...generations.flatMap(
      (generation) =>
        [
          [tableTest.CompleteFrames, TableBlock.Message.CompletedRules({ generation })],
          [selectionTest.SynchronizeClock, SelectionBackgroundsBlock.Message.CompletedClock()],
        ] satisfies ReadonlyArray<readonly [unknown, unknown]>,
    ),
  )

describe('DataTable', () => {
  it.effect('sorts ascending first, resets result pages, and retains selection across pages', () =>
    Effect.gen(function* () {
      yield* Story.story(
        subject,
        init(),
        Story.message(Message.PageChanged({ pageIndex: 1 })),
        Story.message(Message.SelectionChanged({ id: 'c', selected: true })),
        Story.expectOutMessage(OutMessage.SelectionChanged({ ids: ['c'] })),
        Story.message(Message.SortChanged({ id: 'amount', multi: false })),
        Story.model((model) => {
          expect(model.pageIndex).toBe(0)
          expect(dataTableRows(model).map(({ row }) => row.id)).toEqual(['b', 'c'])
          expect(model.table.selectedIndices).toEqual([1])
        }),
        Story.message(Message.SortChanged({ id: 'amount', multi: false })),
        Story.model((model) =>
          expect(dataTableRows(model).map(({ row }) => row.id)).toEqual(['a', 'c']),
        ),
        Story.message(Message.SortChanged({ id: 'amount', multi: false })),
        Story.model((model) =>
          expect(dataTableRows(model).map(({ row }) => row.id)).toEqual(['a', 'b']),
        ),
        settle(1, 2, 3),
      )
    }),
  )
  it.effect('edits numbers, survives replay and preserves page through undo and redo', () =>
    Effect.gen(function* () {
      const edited = yield* Story.story(
        subject,
        init(),
        Story.message(Message.PageChanged({ pageIndex: 1 })),
        Story.message(Message.EditStarted({ rowId: 'c', columnId: 'amount' })),
        Story.message(Message.EditDraftChanged({ value: '17' })),
        Story.message(Message.EditCommitted()),
        Story.expectOutMessage(
          OutMessage.CellEdited({ rowId: 'c', columnId: 'amount', value: 17 }),
        ),
        Story.model((model) => {
          expect(model.rows[2]?.values.amount).toBe(17)
          expect(model.pageIndex).toBe(1)
        }),
      )
      const codec = Schema.fromJsonString(DataTableBlock.Model)
      const encoded = yield* Schema.encodeEffect(codec)(edited)
      const replay = yield* Schema.decodeEffect(codec)(encoded)
      yield* Story.story(
        subject,
        Story.given(replay),
        Story.inMessage(InMessage.RequestedUndo()),
        Story.expectOutMessage(OutMessage.RowsChanged({ rows })),
        Story.model((model) => {
          expect(model.rows[2]?.values.amount).toBe(2)
          expect(model.pageIndex).toBe(1)
        }),
        Story.inMessage(InMessage.RequestedRedo()),
        Story.model((model) => expect(model.rows[2]?.values.amount).toBe(17)),
      )
    }),
  )
  it.effect(
    'filters child rows through ancestors, pages parents, and expands matching descendants',
    () =>
      Effect.gen(function* () {
        yield* Story.story(
          subject,
          Story.init({
            id: 'tree',
            columns,
            rows: [
              { id: 'a', values: { name: 'Parent', amount: 0 } },
              { id: 'child', parentId: 'a', values: { name: 'Needle', amount: 2 } },
              { id: 'b', values: { name: 'Other', amount: 1 } },
            ],
            pageSize: 1,
          }),
          Story.message(Message.SearchChanged({ search: 'needle' })),
          Story.message(Message.ExpansionChanged({ id: 'a' })),
          Story.model((model) => {
            expect(dataTablePageCount(model)).toBe(1)
            expect(dataTableRows(model).map(({ row, depth }) => [row.id, depth])).toEqual([
              ['a', 0],
              ['child', 1],
            ])
          }),
        )
      }),
  )
  it.effect('keeps filter chips stable and reveals newly added filters', () =>
    Effect.gen(function* () {
      yield* Story.story(
        subject,
        init(),
        Story.message(Message.FilterChanged({ id: 'name', value: { kind: 'text', query: 'a' } })),
        Story.message(Message.FilterChanged({ id: 'amount', value: { kind: 'number', min: 2 } })),
        Story.message(Message.FilterChanged({ id: 'name', value: { kind: 'text', query: 'ad' } })),
        Story.model((model) => {
          expect(model.filters.map((filter) => filter.id)).toEqual(['name', 'amount'])
          expect(dataTableRows(model).map(({ row }) => row.id)).toEqual(['a'])
        }),
        Story.message(Message.FiltersVisibilityChanged()),
        Story.message(Message.FilterChanged({ id: 'name', value: null })),
        Story.message(Message.FilterChanged({ id: 'name', value: 'a' })),
        Story.model((model) => expect(model.filtersHidden).toBe(false)),
      )
    }),
  )
  it.effect('clamps the final page after deletion and restores deleted descendants with undo', () =>
    Effect.gen(function* () {
      yield* Story.story(
        subject,
        init(),
        Story.message(Message.PageChanged({ pageIndex: 1 })),
        Story.message(Message.RowsDeleted({ ids: ['c'] })),
        Story.model((model) => {
          expect(model.pageIndex).toBe(0)
          expect(model.rows.map((row) => row.id)).toEqual(['a', 'b'])
        }),
        Story.message(Message.UndoRequested()),
        Story.model((model) => expect(model.rows.map((row) => row.id)).toEqual(['a', 'b', 'c'])),
      )
    }),
  )
  it.effect('applies saved views and keeps utility columns at their edges', () =>
    Effect.gen(function* () {
      yield* Story.story(
        subject,
        Story.init({
          id: 'views',
          columns: [
            { id: 'drag', header: '' },
            { id: 'select', header: '' },
            ...columns,
            { id: 'actions', header: '' },
          ],
          rows,
        }),
        Story.message(Message.ColumnOrderChanged({ ids: ['actions', 'amount', 'name', 'select'] })),
        Story.message(Message.SearchChanged({ search: 'Ada' })),
        Story.message(Message.ViewSaved({ id: 'ada', name: 'Ada only' })),
        Story.message(Message.SearchChanged({ search: '' })),
        Story.message(Message.ViewSelected({ id: 'ada' })),
        Story.expectOutMessage(OutMessage.ViewChanged({ id: 'ada' })),
        Story.model((model) => {
          expect(model.columnOrder).toEqual(['drag', 'select', 'amount', 'name', 'actions'])
          expect(dataTableRows(model).map(({ row }) => row.id)).toEqual(['a'])
        }),
      )
    }),
  )
  it.effect('moves selected peers together and undo restores deleted selection and focus', () =>
    Effect.gen(function* () {
      yield* Story.story(
        subject,
        Story.init({ id: 'mutations', rows, columns, initialSelectedIds: ['a', 'c'] }),
        Story.message(Message.FocusChanged({ rowId: 'a', columnId: 'name' })),
        Story.message(Message.RowMoved({ id: 'a', targetId: 'b' })),
        Story.model((model) => expect(model.rows.map((row) => row.id)).toEqual(['a', 'c', 'b'])),
        Story.message(Message.RowsDeleted({ ids: ['a', 'c'] })),
        Story.model((model) => {
          expect(model.selectedIds).toEqual([])
          expect(Option.isNone(model.focusedCell)).toBe(true)
        }),
        Story.message(Message.UndoRequested()),
        Story.model((model) => {
          expect(model.rows.map((row) => row.id)).toEqual(['a', 'c', 'b'])
          expect(model.selectedIds).toEqual(['a', 'c'])
          expect(Option.getOrNull(model.focusedCell)).toEqual({ rowId: 'a', columnId: 'name' })
        }),
        settle(1, 2, 3),
      )
    }),
  )
  it.effect('pins independent edges and freezes all visible columns through a column', () =>
    Effect.gen(function* () {
      yield* Story.story(
        subject,
        Story.init({ id: 'pins', rows, columns: [...columns, { id: 'role', header: 'Role' }] }),
        Story.message(Message.ColumnPinChanged({ id: 'amount', side: 'right' })),
        Story.model((model) => {
          expect(model.pinnedColumns).toEqual({ left: ['name'], right: ['amount'] })
          expect(dataTableColumns(model).map((column) => column.id)).toEqual([
            'name',
            'role',
            'amount',
          ])
        }),
        Story.message(Message.ColumnsFrozenThrough({ id: 'amount' })),
        Story.model((model) =>
          expect(model.pinnedColumns).toEqual({ left: ['name', 'amount'], right: [] }),
        ),
        Story.message(Message.ColumnPinChanged({ id: 'name', side: null })),
        Story.model((model) => expect(model.pinnedColumns.left).toEqual(['amount'])),
      )
    }),
  )
  it.effect('rejects invalid numeric drafts and prevents destructive input when disabled', () =>
    Effect.gen(function* () {
      yield* Story.story(
        subject,
        init(),
        Story.message(Message.EditStarted({ rowId: 'a', columnId: 'amount' })),
        Story.message(Message.EditDraftChanged({ value: 'twelve' })),
        Story.message(Message.EditCommitted()),
        Story.model((model) => {
          expect(model.rows[0]?.values.amount).toBe(3)
          expect(Option.getOrNull(model.editing)?.draft).toBe('twelve')
        }),
        Story.inMessage(InMessage.RequestedConfigure({ rows, columns, disabled: true })),
        Story.message(Message.RowsDeleted({ ids: ['a'] })),
        Story.model((model) => expect(model.rows.map((row) => row.id)).toEqual(['a', 'b', 'c'])),
      )
    }),
  )
  it.effect('keeps sorting after a cancelled row move and only clears it after confirmation', () =>
    Effect.gen(function* () {
      yield* Story.story(
        subject,
        init(),
        Story.message(Message.SortChanged({ id: 'amount', multi: false })),
        Story.message(Message.RowMoved({ id: 'a', targetId: 'c' })),
        Story.model((model) => {
          expect(model.sorting).toEqual([{ id: 'amount', desc: false }])
          expect(Option.isSome(model.pendingMove)).toBe(true)
          expect(model.rows.map((row) => row.id)).toEqual(['a', 'b', 'c'])
        }),
        Story.message(Message.RowMoveCancelled()),
        Story.model((model) => {
          expect(model.sorting).toEqual([{ id: 'amount', desc: false }])
          expect(Option.isNone(model.pendingMove)).toBe(true)
        }),
        Story.message(Message.RowsMoved({ ids: ['a'], targetId: 'c', place: 'after' })),
        Story.message(Message.RowMoveConfirmed()),
        Story.model((model) => {
          expect(model.sorting).toEqual([])
          expect(Option.isNone(model.pendingMove)).toBe(true)
          expect(model.rows.map((row) => row.id)).toEqual(['b', 'c', 'a'])
        }),
      )
    }),
  )
  it.effect(
    'records parent-authored row actions in history and keeps drafts through unrelated options',
    () =>
      Effect.gen(function* () {
        const promoted = rows.map((row) =>
          row.id === 'a' ? { ...row, values: { ...row.values, name: 'Admin Ada' } } : row,
        )
        yield* Story.story(
          subject,
          init(),
          Story.inMessage(InMessage.RequestedRowsChange({ rows: promoted })),
          Story.expectOutMessage(OutMessage.RowsChanged({ rows: promoted })),
          Story.message(Message.UndoRequested()),
          Story.model((model) => expect(model.rows[0]?.values.name).toBe('Ada')),
          Story.message(Message.EditStarted({ rowId: 'b', columnId: 'name' })),
          Story.message(Message.EditDraftChanged({ value: 'Beatrice' })),
          Story.inMessage(InMessage.RequestedOptions({ pageSize: 25, selectable: false })),
          Story.model((model) => {
            expect(Option.getOrNull(model.editing)?.draft).toBe('Beatrice')
            expect(model.pageSize).toBe(25)
            expect(model.selectable).toBe(false)
          }),
        )
      }),
  )
})
