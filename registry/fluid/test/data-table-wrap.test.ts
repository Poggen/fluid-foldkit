import { FocusSearch } from '../src/data-table-search-focus.js'
import { it } from '@effect/vitest'
import { Effect, Layer } from 'effect'
import { Story } from 'foldkit'
import { expect } from 'vitest'
import {
  DataTableBlock,
  DataTableLayer,
  dataTableRows,
  dataTableColumns,
} from '../src/data-table.js'
import { DropdownResourcesServerLayer } from '../src/dropdown-resources.js'

it.effect(
  'wraps hidden text columns too, then restores their defaults without changing other columns',
  () =>
    Effect.gen(function* () {
      yield* Story.story(
        {
          block: DataTableBlock,
          layer: DataTableLayer.pipe(Layer.provide(DropdownResourcesServerLayer)),
        },
        Story.init({
          id: 'wrap-columns',
          rows: [{ id: 'a', values: { name: 'Ada', notes: 'Long note', amount: 3 } }],
          columns: [
            { id: 'name', header: 'Name', lines: 2 },
            { id: 'notes', header: 'Notes', lines: 'wrap' },
            { id: 'amount', header: 'Amount' },
          ],
        }),
        Story.message(
          DataTableBlock.Message.ColumnVisibilityChanged({ id: 'notes', visible: false }),
        ),
        Story.message(DataTableBlock.Message.ColumnLinesChanged({ id: 'amount', lines: 2 })),
        Story.message(DataTableBlock.Message.TextWrapChanged({ wrapped: true })),
        Story.model((model) =>
          expect(model.columnLines).toEqual({ name: 'wrap', notes: 'wrap', amount: 2 }),
        ),
        Story.message(DataTableBlock.Message.TextWrapChanged({ wrapped: false })),
        Story.model((model) => {
          expect(model.columnLines).toEqual({ name: 2, notes: 1, amount: 2 })
          expect(model.hiddenColumns).toEqual(['notes'])
        }),
      )
    }),
)

it.effect('keeps a nonempty search expanded on blur and clears its result on Escape', () =>
  Effect.gen(function* () {
    yield* Story.story(
      {
        block: DataTableBlock,
        layer: DataTableLayer.pipe(Layer.provide(DropdownResourcesServerLayer)),
      },
      Story.init({
        id: 'search-state',
        rows: [
          { id: 'a', values: { name: 'Ada' } },
          { id: 'b', values: { name: 'Bea' } },
        ],
        columns: [{ id: 'name', header: 'Name' }],
        pageSize: 1,
      }),
      Story.message(DataTableBlock.Message.PageChanged({ pageIndex: 1 })),
      Story.message(DataTableBlock.Message.SearchOpened()),
      Story.Command.resolve(FocusSearch, DataTableBlock.Message.SearchFocusCompleted()),
      Story.message(DataTableBlock.Message.SearchChanged({ search: 'Ada' })),
      Story.message(DataTableBlock.Message.SearchBlurred()),
      Story.model((model) => {
        expect(model.searchOpen).toBe(true)
        expect(model.pageIndex).toBe(0)
        expect(dataTableRows(model).map(({ row }) => row.id)).toEqual(['a'])
      }),
      Story.message(DataTableBlock.Message.SearchClosed()),
      Story.Command.resolve(FocusSearch, DataTableBlock.Message.SearchFocusCompleted()),
      Story.model((model) => {
        expect(model.searchOpen).toBe(false)
        expect(model.search).toBe('')
        expect(model.rows).toHaveLength(2)
      }),
    )
  }),
)

it.effect(
  'retains frozen positions while reordered columns take their places and hidden pins survive',
  () =>
    Effect.gen(function* () {
      yield* Story.story(
        {
          block: DataTableBlock,
          layer: DataTableLayer.pipe(Layer.provide(DropdownResourcesServerLayer)),
        },
        Story.init({
          id: 'frozen-positions',
          rows: [
            {
              id: 'a',
              values: { name: 'Ada', email: 'ada@example.com', notes: 'Note', status: 'Active' },
            },
          ],
          columns: [
            { id: 'name', header: 'Name' },
            { id: 'email', header: 'Email' },
            { id: 'notes', header: 'Notes' },
            { id: 'status', header: 'Status' },
          ],
          initialPinnedColumns: { left: ['name', 'notes'], right: ['status'] },
        }),
        Story.message(
          DataTableBlock.Message.ColumnVisibilityChanged({ id: 'notes', visible: false }),
        ),
        Story.message(
          DataTableBlock.Message.ColumnOrderChanged({ ids: ['email', 'status', 'notes', 'name'] }),
        ),
        Story.model((model) => {
          expect(model.pinnedColumns).toEqual({ left: ['email', 'notes'], right: ['status'] })
          expect(dataTableColumns(model).map((column) => column.id)).toEqual([
            'email',
            'name',
            'status',
          ])
        }),
      )
    }),
)
