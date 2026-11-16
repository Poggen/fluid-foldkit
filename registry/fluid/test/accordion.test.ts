import { describe, expect } from 'vitest'
import { it as test } from '@effect/vitest'
import { Effect, Schema } from 'effect'
import { Story } from 'foldkit'
import {
  AccordionBlock,
  AccordionGroupBlock,
  AccordionLayer,
  AccordionGroupLayer,
} from '@foldkit-visuals/fluid/accordion'
import { items } from './accordion-subjects.js'

const subject = { block: AccordionBlock, layer: AccordionLayer }
const group = { block: AccordionGroupBlock, layer: AccordionGroupLayer }
const disclose = (value: string, isOpen: boolean) =>
  Story.message(AccordionBlock.Message.RequestedDisclosure({ value, isOpen }))

describe('Base Accordion', () => {
  test.effect(
    'finite fractional public item indices initialize and survive the Model JSON codec',
    () =>
      Effect.forEach([0, 1.5, -1], (index) =>
        Effect.all([
          Story.story(
            subject,
            Story.init({ id: 'numeric-index', items: [{ value: 'entry', index }] }),
            Story.model((model) => {
              const codec = Schema.fromJsonString(AccordionBlock.Model)
              expect(
                Schema.decodeSync(codec)(Schema.encodeSync(codec)(model)).items[0]?.index,
              ).toBe(index)
            }),
          ),
          Story.story(
            group,
            Story.init({ id: 'numeric-index', items: [{ value: 'entry', index }] }),
            Story.model((model) => {
              const codec = Schema.fromJsonString(AccordionGroupBlock.Model)
              expect(
                Schema.decodeSync(codec)(Schema.encodeSync(codec)(model)).items[0]?.index,
              ).toBe(index)
            }),
          ),
        ]),
      ),
  )
  test.effect(
    'single selection, same-item collapse and disabled activation preserve the public value contract',
    () =>
      Effect.gen(function* selection() {
        yield* Story.story(
          subject,
          Story.init({ id: 'accordion', items, defaultValue: 'alpha' }),
          disclose('omega', true),
          Story.expectOutMessage(AccordionBlock.OutMessage.ValueChanged({ values: ['omega'] })),
          Story.model((model) => {
            expect(model.values).toEqual(['omega'])
          }),
          disclose('disabled', true),
          Story.expectNoOutMessage(),
          Story.model((model) => {
            expect(model.values).toEqual(['omega'])
          }),
          disclose('omega', false),
          Story.model((model) => {
            expect(model.values).toEqual([])
          }),
        )
        yield* Story.story(
          subject,
          Story.init({ id: 'fixed', items, defaultValue: 'alpha', collapsible: false }),
          disclose('alpha', false),
          Story.model((model) => {
            expect(model.values).toEqual([])
          }),
        )
        yield* Story.story(
          group,
          Story.init({ id: 'group', items }),
          Story.model((model) => {
            expect(model.grouped).toBe(true)
          }),
        )
      }),
  )
  test.effect('a repeated accepted disclosure intent does not toggle the group twice', () =>
    Story.story(
      subject,
      Story.init({ id: 'idempotent', items }),
      disclose('alpha', true),
      Story.model((model) => {
        expect(model.values).toEqual(['alpha'])
      }),
      disclose('alpha', true),
      Story.model((model) => {
        expect(model.values).toEqual(['alpha'])
      }),
      Story.expectNoOutMessage(),
    ),
  )
  test.effect(
    'controlled and callback-only roots emit requests without advancing their own values',
    () =>
      Effect.gen(function* controlled() {
        for (const config of [{ value: 'alpha' }, { defaultValue: 'alpha', onValueChange: true }]) {
          yield* Story.story(
            subject,
            Story.init({ id: 'controlled', items, ...config }),
            disclose('omega', true),
            Story.model((model) => {
              expect(model.values).toEqual(['alpha'])
            }),
            Story.expectOutMessage(AccordionBlock.OutMessage.ValueChanged({ values: ['omega'] })),
            Story.inMessage(AccordionBlock.InMessage.InformedOfValue({ value: 'omega' })),
            Story.model((model) => {
              expect(model.values).toEqual(['omega'])
              expect(model.items.find((row) => row.value === 'omega')?.hidden).toBe(false)
            }),
          )
        }
      }),
  )
  test.effect(
    'multiple mode appends values in activation order and removes only the activated item',
    () =>
      Story.story(
        subject,
        Story.init({ id: 'multi', type: 'multiple', items, defaultValue: ['omega'] }),
        disclose('alpha', true),
        Story.model((model) => {
          expect(model.values).toEqual(['omega', 'alpha'])
        }),
        disclose('omega', false),
        Story.model((model) => {
          expect(model.values).toEqual(['alpha'])
        }),
      ),
  )
  test.effect(
    'closing content stays visible until matching completion; replayed stale close cannot hide a reopening',
    () =>
      Effect.gen(function* interrupted() {
        const closing = yield* Story.story(
          subject,
          Story.init({ id: 'retained', items, defaultValue: 'alpha' }),
          disclose('alpha', false),
          Story.model((model) => {
            expect(model.items.find((item) => item.value === 'alpha')?.hidden).toBe(false)
          }),
        )
        const first = closing.items.find((item) => item.value === 'alpha')
        if (!first) throw new Error('missing closing content')
        const codec = Schema.fromJsonString(AccordionBlock.Model)
        const current = yield* Story.story(
          subject,
          Story.given(
            yield* Schema.decodeEffect(codec)(yield* Schema.encodeEffect(codec)(closing)),
          ),
          disclose('alpha', true),
          Story.message(
            AccordionBlock.Message.CompletedPanel({ value: 'alpha', generation: first.generation }),
          ),
          Story.model((model) => {
            expect(model.items.find((item) => item.value === 'alpha')?.hidden).toBe(false)
          }),
          disclose('alpha', false),
        )
        const live = current.items.find((item) => item.value === 'alpha')
        if (!live) throw new Error('missing current close')
        yield* Story.story(
          subject,
          Story.given(current),
          Story.message(
            AccordionBlock.Message.CompletedPanel({ value: 'alpha', generation: live.generation }),
          ),
          Story.model((model) => {
            expect(model.items.find((item) => item.value === 'alpha')?.hidden).toBe(true)
          }),
        )
      }),
  )
  test.effect('a rapid opening and closing retires only on its current completion', () =>
    Effect.gen(function* rapidToggle() {
      const opening = yield* Story.story(
        subject,
        Story.init({ id: 'rapid-toggle', items }),
        disclose('alpha', true),
      )
      const opened = opening.items.find((item) => item.value === 'alpha')
      if (!opened) throw new Error('missing opening item')
      const closing = yield* Story.story(subject, Story.given(opening), disclose('alpha', false))
      const closed = closing.items.find((item) => item.value === 'alpha')
      if (!closed) throw new Error('missing closing item')
      yield* Story.story(
        subject,
        Story.given(closing),
        Story.message(
          AccordionBlock.Message.CompletedPanel({ value: 'alpha', generation: opened.generation }),
        ),
        Story.model((model) => {
          expect(model.items.find((item) => item.value === 'alpha')?.hidden).toBe(false)
        }),
        Story.message(
          AccordionBlock.Message.CompletedPanel({ value: 'alpha', generation: closed.generation }),
        ),
        Story.model((model) => {
          expect(model.items.find((item) => item.value === 'alpha')?.hidden).toBe(true)
        }),
      )
    }),
  )
  test.effect('DOM reordering preserves value-keyed open content', () =>
    Story.story(
      subject,
      Story.init({ id: 'reorder', items, defaultValue: 'alpha' }),
      Story.inMessage(
        AccordionBlock.InMessage.InformedOfItems({
          items: [
            { value: 'omega', index: 9, disabled: false, highlight: 'item' },
            { value: 'disabled', index: 7, disabled: true, highlight: 'item' },
            { value: 'alpha', index: 3, disabled: false, highlight: 'item' },
          ],
        }),
      ),
      Story.model((model) => {
        expect(model.items.map((item) => item.value)).toEqual(['omega', 'disabled', 'alpha'])
        expect(model.items.at(-1)?.open).toBe(true)
      }),
      Story.Command.expectNone(),
    ),
  )
})
