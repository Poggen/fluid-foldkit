// oxlint-disable-next-line landmines-style/no-comments -- Required Vitest environment directive.
// @vitest-environment happy-dom -- real public selection Program and nested lifecycle
import { renderSelectionContext } from './selection-context-parent.js'
import { describe, expect } from 'vitest'
import { it as test } from '@effect/vitest'
import { Story } from 'foldkit'
import { Effect, Option, Schema } from 'effect'
import { RadioGroupBlock, layer, test as radioTest } from '../src/radio-group.js'
import {
  radioHasSelection,
  radioItemSelected,
  radioSelectedIndex,
} from '../src/radio-group-state.js'

const block = RadioGroupBlock
const subject = { block, layer }
const items = [
  { index: 0, value: 'a' },
  { index: 1, value: 'b' },
  { index: 2, value: 'c' },
]

describe('Base radio group', () => {
  test.effect(
    'value wins over group index while explicit per-item state wins outside value mode',
    () =>
      Story.story(
        subject,
        Story.init({
          id: 'radio',
          value: 'b',
          selectedIndex: 0,
          items: [{ index: 0, value: 'a', selected: true }, ...items.slice(1)],
        }),
        Story.model((model) => {
          expect(radioSelectedIndex(model)).toBe(1)
          expect(model.values.map((item) => radioItemSelected(model, item))).toEqual([
            false,
            true,
            false,
          ])
        }),
        Story.inMessage(block.InMessage.RequestedSelection({ selectedIndex: 1 })),
        Story.model((model) => {
          expect(model.values.map((item) => radioItemSelected(model, item))).toEqual([
            true,
            true,
            false,
          ])
        }),
        Story.inMessage(block.InMessage.RequestedSelection({ value: 'missing' })),
        Story.model((model) => {
          expect(radioSelectedIndex(model)).toBe(-1)
          expect(radioHasSelection(model)).toBe(true)
          expect(model.values.map((item) => radioItemSelected(model, item))).toEqual([
            false,
            false,
            false,
          ])
        }),
        Story.inMessage(block.InMessage.RequestedItems({ items })),
        Story.model((model) => {
          expect(radioHasSelection(model)).toBe(false)
        }),
      ),
  )
  test.effect(
    'selection reports both item index and value while control stays parent-owned, including repeated selection',
    () =>
      Effect.gen(function* controlled() {
        for (const index of [0, 1]) {
          yield* Story.story(
            subject,
            Story.init({ id: 'radio', value: 'a', items }),
            Story.message(block.Message.CapturedClick({ index })),
            Story.expectOutMessage(
              block.OutMessage.Selected({ index, value: Option.some(index === 0 ? 'a' : 'b') }),
            ),
            Story.model((model) => {
              expect(Option.getOrNull(model.value)).toBe('a')
            }),
          )
        }
      }),
  )
  test.effect(
    'all arrows and endpoints use focus then click; Page keys leave radio selection alone',
    () =>
      Effect.gen(function* navigation() {
        for (const [key, index] of [
          ['ArrowDown', 0],
          ['ArrowUp', 1],
          ['ArrowLeft', 1],
          ['ArrowRight', 0],
          ['Home', 0],
          ['End', 2],
        ] as const) {
          yield* Story.story(
            subject,
            Story.init({ id: 'radio', items }),
            Story.message(
              block.Message.CapturedItems({ items: [{ index: 0 }, { index: 1 }, { index: 2 }] }),
            ),
            Story.message(block.Message.CapturedKey({ index: 2, key })),
            Story.expectNoOutMessage(),
            Story.Command.expectExact(radioTest.FocusRow({ id: 'radio', index })),
            Story.Command.resolve(radioTest.FocusRow, block.Message.CompletedFocus()),
          )
        }
        yield* Story.story(
          subject,
          Story.init({ id: 'radio', items }),
          Story.message(
            block.Message.CapturedItems({ items: [{ index: 0 }, { index: 1 }, { index: 2 }] }),
          ),
          Story.message(block.Message.CapturedKey({ index: 2, key: 'PageDown' })),
          Story.Command.expectNone(),
        )
      }),
  )
  test.effect(
    'dot interruption survives replay and rejects completion from the old exit generation',
    () =>
      Effect.gen(function* interruption() {
        const exiting = yield* Story.story(
          subject,
          Story.init({ id: 'radio', value: 'a', items }),
          Story.inMessage(block.InMessage.RequestedSelection({ value: 'b' })),
        )
        const old = exiting.marks.find((mark) => mark.index === 0)
        if (old === undefined) throw new Error('expected old radio dot')
        expect(old.present).toBe(false)
        const codec = Schema.fromJsonString(block.Model)
        const replayed = yield* Schema.decodeEffect(codec)(
          yield* Schema.encodeEffect(codec)(exiting),
        )
        yield* Story.story(
          subject,
          Story.given(replayed),
          Story.inMessage(block.InMessage.RequestedSelection({ value: 'a' })),
          Story.message(block.Message.CompletedMarkExit({ index: 0, generation: old.generation })),
          Story.model((model) => {
            expect(model.marks.find((mark) => mark.index === 0)?.present).toBe(true)
          }),
        )
      }),
  )
})

for (const variant of ['base'] as const) {
  test.live(
    `${variant} radio keeps group attributes on its root through public Elevated composition`,
    () =>
      Effect.gen(function* selectionContextComposition() {
        const { html } = yield* renderSelectionContext()
        const id = `${variant}-radio`

        for (const [label, checked] of [
          ['direct', 'true'],
          ['wrapped', 'false'],
        ] as const) {
          const row = new RegExp(`<div(?=[^>]*aria-label="${id} ${label}")[^>]*>`, 'u').exec(
            html,
          )?.[0]

          expect(row).toBeDefined()
          expect(row).toContain('role="radio"')
          expect(row).toContain(`aria-checked="${checked}"`)
          expect(row).toContain('h-7')
          expect(row).toContain('rounded-[20px]')
          expect(row).not.toContain(`root-${id}`)
          expect(row).not.toContain('data-root-owner')
        }

        const provider = new RegExp(
          `<span(?=[^>]*data-group-presentation="${id}")[^>]*>`,
          'u',
        ).exec(html)?.[0]

        expect(provider).toContain('data-size-provider="compact"')
        expect({
          rootIds: html.split(` id="${id}"`).length - 1,
          rootAttributes: html.split(`data-root-owner="${id}"`).length - 1,
          rootClasses: html.split(`root-${id}`).length - 1,
        }).toEqual({ rootIds: 1, rootAttributes: 1, rootClasses: 1 })
      }),
  )
}
