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
import { HoverBlock, test as hoverTest } from '../src/hover.js'
import { items } from './accordion-subjects.js'

const subject = { block: AccordionBlock, layer: AccordionLayer }
const group = { block: AccordionGroupBlock, layer: AccordionGroupLayer }

describe('Base root property changes', () => {
  test.effect(
    'controlled clicks retain internal defaults and callback-only clicks do not replace them on control release',
    () =>
      Effect.gen(function* controlRelease() {
        for (const callback of [false, true]) {
          const model = yield* Story.story(
            subject,
            Story.init({
              id: 'control-release',
              items,
              value: 'alpha',
              defaultValue: 'disabled',
              onValueChange: callback,
            }),
            Story.message(
              AccordionBlock.Message.RequestedDisclosure({ value: 'omega', isOpen: true }),
            ),
            Story.model((model) => {
              expect(model.values).toEqual(['alpha'])
            }),
            Story.inMessage(
              AccordionBlock.InMessage.InformedOfRoot({ config: { onValueChange: callback } }),
            ),
            Story.model((model) => {
              expect(model.values).toEqual(callback ? ['disabled'] : ['omega'])
            }),
            Story.message(
              AccordionBlock.Message.RequestedDisclosure({ value: 'alpha', isOpen: true }),
            ),
            Story.inMessage(
              AccordionBlock.InMessage.InformedOfRoot({
                config: { value: 'omega', onValueChange: callback },
              }),
            ),
            Story.inMessage(
              AccordionBlock.InMessage.InformedOfRoot({ config: { onValueChange: callback } }),
            ),
            Story.model((model) => {
              expect(model.values).toEqual(callback ? ['disabled'] : ['alpha'])
            }),
          )
          const codec = Schema.fromJsonString(AccordionBlock.Model)
          expect(
            (yield* Schema.decodeEffect(codec)(yield* Schema.encodeEffect(codec)(model))).values,
          ).toEqual(model.values)
        }
      }),
  )
  test.effect(
    'single and multiple internal values survive type changes as separate source-owned stores',
    () =>
      Story.story(
        subject,
        Story.init({ id: 'type-switch', items, defaultValue: 'alpha' }),
        Story.inMessage(AccordionBlock.InMessage.InformedOfRoot({ config: { type: 'multiple' } })),
        Story.model((model) => {
          expect(model.values).toEqual([])
        }),
        Story.message(AccordionBlock.Message.RequestedDisclosure({ value: 'omega', isOpen: true })),
        Story.inMessage(AccordionBlock.InMessage.InformedOfRoot({ config: { type: 'single' } })),
        Story.model((model) => {
          expect(model.values).toEqual(['alpha'])
        }),
        Story.inMessage(AccordionBlock.InMessage.InformedOfRoot({ config: { type: 'multiple' } })),
        Story.model((model) => {
          expect(model.values).toEqual(['omega'])
        }),
      ),
  )
})

describe('Base retained expansion geometry', () => {
  test.effect(
    'open backgrounds use layout coordinates and reject an old exit after a replayed interruption',
    () =>
      Effect.gen(function* tintLifetime() {
        const closing = yield* Story.story(
          group,
          Story.init({ id: 'expanded-backgrounds', items, defaultValue: 'alpha' }),
          Story.message(
            AccordionGroupBlock.Message.ObservedLayout({
              layout: [
                { value: 'alpha', rect: { top: 0, left: 0, width: 288, height: 96 } },
                { value: 'omega', rect: { top: 96, left: 0, width: 288, height: 36 } },
              ],
            }),
          ),
          Story.Command.expectExact(hoverTest.ControlHover),
          Story.Command.resolve(hoverTest.ControlHover, HoverBlock.Message.CompletedControl()),
          Story.model((model) => {
            expect(model.tints[0]?.rect).toEqual({ top: 0, left: 0, width: 288, height: 96 })
          }),
          Story.inMessage(AccordionGroupBlock.InMessage.InformedOfValue({ value: '' })),
          Story.model((model) => {
            expect(model.tints[0]?.present).toBe(false)
          }),
        )
        const [oldTint] = closing.tints
        if (!oldTint) throw new Error('missing retained expansion tint')
        const codec = Schema.fromJsonString(AccordionGroupBlock.Model)
        const current = yield* Story.story(
          group,
          Story.given(
            yield* Schema.decodeEffect(codec)(yield* Schema.encodeEffect(codec)(closing)),
          ),
          Story.inMessage(AccordionGroupBlock.InMessage.InformedOfValue({ value: 'alpha' })),
          Story.message(
            AccordionGroupBlock.Message.CompletedTint({
              value: 'alpha',
              generation: oldTint.generation,
              hover: false,
            }),
          ),
          Story.model((model) => {
            expect(model.tints[0]?.present).toBe(true)
          }),
          Story.inMessage(AccordionGroupBlock.InMessage.InformedOfValue({ value: '' })),
        )
        const [live] = current.tints
        if (!live) throw new Error('missing live expansion exit')
        yield* Story.story(
          group,
          Story.given(current),
          Story.message(
            AccordionGroupBlock.Message.CompletedTint({
              value: 'alpha',
              generation: live.generation,
              hover: false,
            }),
          ),
          Story.model((model) => {
            expect(model.tints).toEqual([])
          }),
        )
      }),
  )
})

describe('Base disabled trigger observations', () => {
  test.effect(
    'a transient DOM trigger disable never overwrites the item declaration or survives re-enabling',
    () =>
      Story.story(
        subject,
        Story.init({ id: 'temporary-disabled', items }),
        Story.message(AccordionBlock.Message.ObservedTriggers({ disabledValues: ['alpha'] })),
        Story.message(AccordionBlock.Message.RequestedDisclosure({ value: 'alpha', isOpen: true })),
        Story.expectNoOutMessage(),
        Story.model((model) => {
          expect(model.items.find((item) => item.value === 'alpha')?.disabled).toBe(false)
        }),
        Story.message(AccordionBlock.Message.ObservedTriggers({ disabledValues: [] })),
        Story.message(AccordionBlock.Message.RequestedDisclosure({ value: 'alpha', isOpen: true })),
        Story.model((model) => {
          expect(model.values).toEqual(['alpha'])
        }),
        Story.Command.expectNone(),
      ),
  )
})
