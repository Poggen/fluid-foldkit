import { it } from '@effect/vitest'
import { expect } from 'vitest'
import { Story } from 'foldkit'
import { DataTableBlock, layer, dataTableRows, dataTablePageCount } from '../src/data-table.js'
import { dataset } from '../examples/src/data-table-example-data.js'

const subject = { block: DataTableBlock, layer }
it.effect(
  'the landing catalogue shows the newest eight components without editable or row-action chrome',
  () =>
    Story.story(
      subject,
      Story.init(dataset('home', 'showcase')),
      Story.model((model) => {
        expect(model.rows).toHaveLength(37)
        expect(model.rows.every((row) => row.parentId === undefined)).toBe(true)
        expect(model.columns.map((column) => column.header)).toEqual([
          'Component',
          'Primitives',
          'Props',
          'Added',
        ])
        expect(model.editable).toBe(false)
        expect(model.actions.rowActions).toEqual([])
        expect(model.pageSize).toBe(8)
        expect(dataTablePageCount(model)).toBe(5)
        expect(dataTableRows(model).map(({ row }) => row.values.name)).toEqual([
          'CodeBlock',
          'ContextMenu',
          'Breadcrumb',
          'DataTable',
          'Checkbox',
          'Field',
          'Input',
          'Textarea',
        ])
      }),
    ),
)
it.effect(
  'the documentation catalogue retains its ten-parent pages and expanded-capable data',
  () =>
    Story.story(
      subject,
      Story.init(dataset('docs', 'catalogue')),
      Story.model((model) => {
        expect(model.rows.filter((row) => row.parentId === undefined)).toHaveLength(37)
        expect(model.rows.some((row) => row.parentId !== undefined)).toBe(true)
        expect(model.pageSize).toBe(10)
        expect(dataTableRows(model)).toHaveLength(10)
      }),
    ),
)
it.effect('landing search scopes the catalogue to component names', () =>
  Story.story(
    subject,
    Story.init(dataset('home', 'showcase')),
    Story.message(
      DataTableBlock.Message.SearchChanged({ search: { column: 'name', query: 'Radix' } }),
    ),
    Story.model((model) => expect(dataTableRows(model)).toEqual([])),
    Story.message(
      DataTableBlock.Message.SearchChanged({ search: { column: 'name', query: 'CodeBlock' } }),
    ),
    Story.model((model) =>
      expect(dataTableRows(model).map(({ row }) => row.values.name)).toEqual(['CodeBlock']),
    ),
  ),
)
