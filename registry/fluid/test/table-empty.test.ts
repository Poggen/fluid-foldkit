import { defineMessageUnion } from 'foldkit/message'
import { expect } from 'vitest'
import { it } from '@effect/vitest'
import { Effect, Schema } from 'effect'
import { Block, Story } from 'foldkit'
import { renderToString } from 'foldkit/experimental/server'
import { TableBlock, layer as TableLayer } from '../src/table.js'
import { TableBody, TableEmpty, tableClassName } from '../src/table-parts.js'

const TableDocumentKey = Symbol('TableEmptyDocument')
const effects = Block.makeEffectsContract()
const TableDocument = Block.make('TableEmptyDocument', {
  key: TableDocumentKey,
  InitArgs: Schema.Tuple([]),
  Model: Schema.Struct({}),
  Message: defineMessageUnion({ Submitted: {} }),
  effects,
  view: { kind: 'Document' },
})
const Composition = TableDocument.makeComposition({})
const layer = TableDocument.makeLayer({
  init: Composition.makeInit(() => ({ model: {} })),
  update: Composition.makeUpdate({ Submitted: TableDocument.makeNoopStep() }),
  view: Composition.makeView((_model, h) => ({
    title: 'Empty table',
    body: h.table(
      [h.Class(tableClassName('default'))],
      [
        TableBody(
          {
            children: [
              TableEmpty(
                {
                  columns: 4,
                  title: 'No projects',
                  description: 'Create a project to start.',
                  action: h.button([], ['Create project']),
                  children: [h.span([], ['Extra guidance'])],
                },
                h,
              ),
            ],
          },
          h,
        ),
      ],
    ),
  })),
})

it.effect(
  'empty table spans all columns and exposes guidance and an action without becoming a hover row',
  () =>
    Effect.gen(function* () {
      const { html } = yield* renderToString(
        { block: TableDocument, layer },
        {},
        { isHydratable: false },
      )
      expect(html).toContain('colspan="4"')
      expect(html).toContain('--table-empty-rows: 3')
      expect(html).toContain('sticky left-0 flex w-(--table-view-w,100%)')
      expect(html).toContain('1lh+2*var(--table-cell-py)+1px')
      expect(html).toContain('No projects')
      expect(html).toContain('Create a project to start.')
      expect(html).toContain('Create project')
      expect(html).toContain('Extra guidance')
      expect(html).not.toContain('data-fluid-hover-index')
    }),
)

it.effect('table changes hover modes through public owner operations', () =>
  Story.story(
    { block: TableBlock, layer: TableLayer },
    Story.init({ id: 'table', hoverMode: 'standard' }),
    Story.model((model) => {
      expect(model.hover.mode).toBe('standard')
    }),
    Story.inMessage(TableBlock.InMessage.RequestedHoverMode({ mode: 'fluid' })),
    Story.model((model) => {
      expect(model.hover.mode).toBe('fluid')
      expect(model.highlight.mode).toBe('fluid')
    }),
  ),
)
