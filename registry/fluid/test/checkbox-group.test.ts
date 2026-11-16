// @vitest-environment happy-dom -- real public selection Program and nested lifecycle
import { renderSelectionContext } from './selection-context-parent.js'
import { describe, expect } from 'vitest'
import { it as test } from '@effect/vitest'
import { Story } from 'foldkit'
import { Effect, Option, Schema } from 'effect'
import { CheckboxGroupBlock, layer, test as checkboxTest } from '../src/checkbox-group.js'
import { SelectionBackgroundsBlock, test as selectionTest } from '../src/selection-backgrounds.js'

const block = CheckboxGroupBlock
const subject = { block, layer }
const initial = {
  id: 'checks',
  checkedIndices: [1],
  items: [
    { index: 1, checked: true },
    { index: 3, checked: false },
    { index: 7, checked: false },
  ],
}

describe('Base checkbox group', () => {
  test.effect(
    'row activation reports once and leaves controlled checks and merged backgrounds parent-owned',
    () =>
      Effect.gen(function* controlled() {
        for (const key of [' ', 'Enter']) {
          yield* Story.story(
            subject,
            Story.init(initial),
            Story.message(block.Message.CapturedKey({ index: 3, key })),
            Story.expectOutMessage(block.OutMessage.Toggled({ index: 3 })),
            Story.model((model) => {
              expect(model.checkedIndices).toEqual([1])
              expect(model.checkedItems.find((item) => item.index === 3)?.checked).toBe(false)
            }),
          )
        }
        yield* Story.story(
          subject,
          Story.init(initial),
          Story.message(block.Message.CapturedClick({ index: 3 })),
          Story.expectOutMessage(block.OutMessage.Toggled({ index: 3 })),
          Story.inMessage(block.InMessage.RequestedSelection({ indices: [1, 3] })),
          Story.Command.expectExact(selectionTest.SynchronizeClock),
          Story.Command.resolve(
            selectionTest.SynchronizeClock,
            SelectionBackgroundsBlock.Message.CompletedClock(),
          ),
          Story.model((model) => {
            expect(model.checkedIndices).toEqual([1, 3])
            expect(model.selection.runs.map((run) => [run.start, run.end])).toEqual([
              [1, 1],
              [3, 3],
            ])
          }),
        )
      }),
  )
  test.effect(
    'arrows move focus without selecting; checkboxes ignore horizontal and Page keys',
    () =>
      Effect.gen(function* navigation() {
        for (const [key, index] of [
          ['ArrowDown', 1],
          ['ArrowUp', 3],
          ['Home', 1],
          ['End', 7],
        ] as const) {
          yield* Story.story(
            subject,
            Story.init(initial),
            Story.message(
              block.Message.CapturedItems({ items: [{ index: 1 }, { index: 3 }, { index: 7 }] }),
            ),
            Story.message(block.Message.CapturedKey({ index: 7, key })),
            Story.expectNoOutMessage(),
            Story.Command.expectExact(checkboxTest.FocusRow({ id: 'checks', index })),
            Story.Command.resolve(checkboxTest.FocusRow, block.Message.CompletedFocus()),
          )
        }
        for (const key of ['ArrowLeft', 'ArrowRight', 'PageUp', 'PageDown']) {
          yield* Story.story(
            subject,
            Story.init(initial),
            Story.message(
              block.Message.CapturedItems({ items: [{ index: 1 }, { index: 3 }, { index: 7 }] }),
            ),
            Story.message(block.Message.CapturedKey({ index: 7, key })),
            Story.Command.expectNone(),
          )
        }
      }),
  )
  test.effect(
    'interrupted check re-entry rejects stale exit acknowledgement after a JSON replay',
    () =>
      Effect.gen(function* interrupted() {
        const closing = yield* Story.story(
          subject,
          Story.init(initial),
          Story.inMessage(
            block.InMessage.RequestedItems({ items: [{ index: 1, checked: false }] }),
          ),
        )
        const [old] = closing.marks
        if (!old) throw new Error('expected retained retracting mark')
        expect(old.present).toBe(false)
        const codec = Schema.fromJsonString(block.Model)
        const restored = yield* Schema.decodeEffect(codec)(
          yield* Schema.encodeEffect(codec)(closing),
        )
        const closedAgain = yield* Story.story(
          subject,
          Story.given(restored),
          Story.inMessage(block.InMessage.RequestedItems({ items: [{ index: 1, checked: true }] })),
          Story.message(block.Message.CompletedMarkExit({ index: 1, generation: old.generation })),
          Story.model((model) => {
            expect(model.marks.map((mark) => mark.present)).toEqual([true])
          }),
          Story.inMessage(
            block.InMessage.RequestedItems({ items: [{ index: 1, checked: false }] }),
          ),
        )
        const [live] = closedAgain.marks
        if (!live) throw new Error('expected current exit')
        yield* Story.story(
          subject,
          Story.given(closedAgain),
          Story.message(block.Message.CompletedMarkExit({ index: 1, generation: live.generation })),
          Story.model((model) => {
            expect(model.marks).toEqual([])
          }),
        )
      }),
  )
  test.effect('form reset leaves controlled selection parent-owned', () =>
    Story.story(
      subject,
      Story.init(initial),
      Story.inMessage(
        block.InMessage.RequestedItems({
          items: [
            { index: 1, checked: false },
            { index: 3, checked: true },
          ],
        }),
      ),
      Story.message(block.Message.CapturedReset({ index: 1 })),
      Story.expectNoOutMessage(),
      Story.message(block.Message.CapturedReset({ index: 3 })),
      Story.expectNoOutMessage(),
      Story.inMessage(
        block.InMessage.RequestedItems({
          items: [
            { index: 1, checked: true },
            { index: 3, checked: false },
          ],
        }),
      ),
      Story.message(block.Message.CapturedReset({ index: 1 })),
      Story.expectNoOutMessage(),
    ),
  )
  test.effect(
    'pointer focus suppresses ring while keyboard focus retains and safely retires the shared ring',
    () =>
      Effect.gen(function* ringLifetime() {
        const blurred = yield* Story.story(
          subject,
          Story.init(initial),
          Story.message(block.Message.CapturedFocus({ index: 1, visible: false })),
          Story.model((model) => {
            expect(Option.isNone(model.focusSlot)).toBe(true)
          }),
          Story.message(block.Message.CapturedFocus({ index: 3, visible: true })),
          Story.model((model) => {
            expect(Option.getOrNull(model.focusSlot)?.present).toBe(true)
          }),
          Story.message(block.Message.CapturedBlur({ inside: true })),
          Story.model((model) => {
            expect(Option.getOrNull(model.focusSlot)?.present).toBe(true)
          }),
          Story.message(block.Message.CapturedBlur({ inside: false })),
        )
        const exit = Option.getOrThrow(blurred.focusSlot)
        yield* Story.story(
          subject,
          Story.given(blurred),
          Story.message(block.Message.CapturedFocus({ index: 1, visible: true })),
          Story.message(block.Message.CompletedFocusExit({ generation: exit.generation })),
          Story.model((model) => {
            expect(Option.getOrNull(model.focusSlot)?.index).toBe(1)
          }),
        )
      }),
  )
})

for (const variant of ['base'] as const) {
  test.live(
    `${variant} checkbox keeps group attributes on its root through public Elevated composition`,
    () =>
      Effect.gen(function* selectionContextComposition() {
        const { html } = yield* renderSelectionContext()
        const id = `${variant}-checkbox`

        for (const [label, checked] of [
          ['direct', 'true'],
          ['wrapped', 'false'],
        ] as const) {
          const row = new RegExp(`<div(?=[^>]*aria-label="${id} ${label}")[^>]*>`, 'u').exec(
            html,
          )?.[0]

          expect(row).toBeDefined()
          expect(row).toContain('role="checkbox"')
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
