// oxlint-disable-next-line landmines-style/no-comments -- Required Vitest environment directive.
// @vitest-environment happy-dom
import { it } from '@effect/vitest'
import { Effect, Layer, Schedule, Schema } from 'effect'
import { Block, Program, Runtime, Update } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { expect } from 'vitest'
import { DataTableEditorsBlock, layer as EditorsLayer } from '../src/data-table-editors.js'
import { DataTableValue } from '../src/data-table-editor-value.js'
import { createSelectLayer } from '../src/select.js'
import { inputFileResourcesLayer } from '../src/input.js'
import { PopupAuthorityLayer } from '../src/date-picker-popup-authority.js'
import { DefaultCalendarEnvironment } from '../src/calendar-environment.js'

const Message = defineMessageUnion({
  Began: { kind: Schema.Literals(['number', 'select', 'tags', 'date']) },
})
const key = Symbol('EditorConsumer')
const Consumer = Block.make('EditorConsumer', {
  key,
  InitArgs: Schema.Tuple([]),
  Message,
  Model: Schema.Struct({
    editors: DataTableEditorsBlock.Model,
    committed: DataTableValue,
    draft: DataTableValue,
    cancelled: Schema.Natural,
  }),
  effects: Block.makeEffectsContract<
    never,
    Block.FactsOf<typeof DataTableEditorsBlock>['programRequirements']
  >(),
  view: { kind: 'Element' },
})
const Requests = Consumer.makeRequiredFieldBinding(DataTableEditorsBlock, {
  field: 'editors',
  init: { contextToArgs: () => ['cell-editor-test'] },
})
const Editors = Requests.withOutMessagePolicy({
  fold: Consumer.makeOutMessageFold(DataTableEditorsBlock, {
    DraftChanged: ({ value }) => Consumer.makeFieldsStep(() => ({ draft: () => value })),
    Committed: ({ value }) =>
      Consumer.makeStep(() =>
        Update.combineSteps([
          Consumer.makeFieldsStep(() => ({ committed: () => value })),
          Requests.requestClear(),
        ]),
      ),
    Cancelled: () =>
      Consumer.makeStep(() =>
        Update.combineSteps([
          Consumer.makeFieldsStep(() => ({ cancelled: (count) => count + 1 })),
          Requests.requestClear(),
        ]),
      ),
  }),
})
const Composition = Consumer.makeComposition({ bindings: [Editors] })
const layer = Consumer.makeLayer({
  init: Composition.makeInit(() => ({ model: { committed: null, draft: null, cancelled: 0 } })),
  update: Composition.makeUpdate({
    Began: Consumer.makeStep.fromMessage(({ kind }) =>
      Editors.requestEdit({
        rowId: 'record',
        columnId: kind,
        editor: {
          type: kind,
          options: [
            ...(kind === 'tags' ? [] : [{ value: 'draft', label: 'Draft' }]),
            { value: 'published', label: 'Published' },
          ],
          creatable: true,
        },
        value:
          kind === 'number'
            ? 12
            : kind === 'tags'
              ? ['draft']
              : kind === 'date'
                ? '2026-11-18'
                : 'draft',
      }),
    ),
  }),
  view: Composition.makeView((model, h) =>
    h.div(
      [],
      [
        ...(['number', 'select', 'tags', 'date'] as const).map((kind) =>
          h.button([h.Id(`open-${kind}`), h.OnClick(Message.Began({ kind }))], [kind]),
        ),
        h.block(
          Editors.embedView({
            slotId: 'editors',
            model: model.editors,
            viewInputs: {
              animate: (node) => node,
              highlight: (node) => node,
              ariaLabel: 'Active cell',
            },
          }),
        ),
        h.output([h.Id('committed-value')], [JSON.stringify(model.committed)]),
        h.output([h.Id('draft-value')], [JSON.stringify(model.draft)]),
        h.output([h.Id('cancelled-count')], [String(model.cancelled)]),
      ],
    ),
  ),
}).pipe(Layer.provide(EditorsLayer))
const eventually = (assertion: () => void) =>
  Effect.try(assertion).pipe(Effect.retry({ times: 100, schedule: Schedule.spaced('15 millis') }))
const element: <T extends HTMLElement>(selector: string) => T = <T extends HTMLElement>(
  selector: string,
) => {
  const node = document.querySelector<T>(selector)
  if (node === null) throw new Error(`Missing ${selector}`)
  return node
}
const action = (label: string) => {
  const button = Array.from(
    document.querySelectorAll<HTMLButtonElement>('[data-grid-rich-editor] button'),
  ).find((node) => node.textContent === label)
  if (button === undefined) throw new Error(`Missing editor action ${label}`)
  button.click()
}
const option = (label: string) => {
  const item = Array.from(document.querySelectorAll<HTMLElement>('[role="option"]')).find(
    (node) => node.textContent?.trim() === label,
  )
  if (item === undefined) throw new Error(`Missing editor option ${label}`)
  item.click()
}
it.live(
  'native editors preserve typed values and tags drafts, and commit or cancel calendar dates',
  () =>
    Effect.gen(function* () {
      const fonts = Object.getOwnPropertyDescriptor(document, 'fonts')
      Object.defineProperty(document, 'fonts', { configurable: true, value: new EventTarget() })
      const container = document.createElement('div')
      container.id = 'editor-consumer'
      document.body.append(container)
      const runtime = Runtime.embed(
        Program.makeElement({ block: Consumer, layer, container }).provide(
          Layer.mergeAll(
            createSelectLayer(document),
            inputFileResourcesLayer,
            PopupAuthorityLayer,
            DefaultCalendarEnvironment,
          ),
        ),
      )
      try {
        yield* eventually(() => expect(document.querySelector('#open-number')).not.toBeNull())
        element('#open-number').click()
        yield* eventually(() =>
          expect(
            document.querySelector('[data-grid-rich-editor] input[type=number]'),
          ).not.toBeNull(),
        )
        const number = element<HTMLInputElement>('[data-grid-rich-editor] input[type=number]')
        number.focus()
        number.value = '42.5'
        number.dispatchEvent(new Event('input', { bubbles: true }))
        yield* eventually(() => expect(element('#draft-value').textContent).toBe('42.5'))
        expect(document.activeElement).toBe(number)
        number.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
        yield* eventually(() => expect(element('#committed-value').textContent).toBe('42.5'))
        element('#open-number').click()
        yield* eventually(() =>
          expect(
            document.querySelector('[data-grid-rich-editor] input[type=number]'),
          ).not.toBeNull(),
        )
        const escaped = element<HTMLInputElement>('[data-grid-rich-editor] input[type=number]')
        escaped.focus()
        escaped.value = '63'
        escaped.dispatchEvent(new Event('input', { bubbles: true }))
        yield* eventually(() => expect(element('#draft-value').textContent).toBe('63'))
        escaped.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
        yield* eventually(() => expect(element('#committed-value').textContent).toBe('63'))
        element('#open-select').click()
        yield* eventually(() =>
          expect(document.querySelector('[data-grid-rich-editor] [role=combobox]')).not.toBeNull(),
        )
        element('[data-grid-rich-editor] [role=combobox]').click()
        yield* eventually(() =>
          expect(document.querySelectorAll('[role=option]').length).toBeGreaterThan(0),
        )
        option('Published')
        yield* eventually(() => expect(element('#committed-value').textContent).toBe('"published"'))
        element('#open-tags').click()
        yield* eventually(() =>
          expect(
            document.querySelector('[data-grid-rich-editor] input[role=combobox]'),
          ).not.toBeNull(),
        )
        const tags = element<HTMLInputElement>('[data-grid-rich-editor] input[role=combobox]')
        expect(document.querySelector('[data-combo-chip="draft"]')).not.toBeNull()
        tags.focus()
        tags.click()
        tags.value = 'Published'
        tags.dispatchEvent(new Event('input', { bubbles: true }))
        yield* eventually(() =>
          expect(
            Array.from(document.querySelectorAll('[role=option]')).some(
              (node) => node.textContent?.trim() === 'Published',
            ),
          ).toBe(true),
        )
        option('Published')
        yield* eventually(() =>
          expect(document.querySelector('[data-grid-rich-editor]')?.textContent).toContain(
            'Published',
          ),
        )
        expect(element('#committed-value').textContent).toBe('"published"')
        action('Apply')
        yield* eventually(() =>
          expect(element('#committed-value').textContent).toBe('["draft","published"]'),
        )
        element('#open-date').click()
        yield* eventually(() =>
          expect(document.querySelector('#cell-editor-test-date')).not.toBeNull(),
        )
        element('#cell-editor-test-date').click()
        yield* eventually(() => expect(document.querySelector('[role=grid]')).not.toBeNull())
        action('Cancel')
        yield* eventually(() => expect(element('#cancelled-count').textContent).toBe('1'))
        expect(element('#committed-value').textContent).toBe('["draft","published"]')
        yield* eventually(() => expect(document.querySelector('[role=grid]')).toBeNull())
        element('#open-date').click()
        yield* eventually(() =>
          expect(document.querySelector('#cell-editor-test-date')).not.toBeNull(),
        )
        element('#cell-editor-test-date').click()
        yield* eventually(() =>
          expect(
            document.querySelector('[data-day="2026-11-20"] [data-calendar-button]'),
          ).not.toBeNull(),
        )
        element('[data-day="2026-11-20"] [data-calendar-button]').click()
        yield* eventually(() =>
          expect(element('#committed-value').textContent).toBe('"2026-11-20"'),
        )
      } finally {
        yield* Effect.promise(runtime.dispose)
        container.remove()
        if (fonts === undefined) Reflect.deleteProperty(document, 'fonts')
        else Object.defineProperty(document, 'fonts', fonts)
      }
    }),
)
