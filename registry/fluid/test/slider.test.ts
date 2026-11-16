import { describe, expect } from 'vitest'
import { it } from '@effect/vitest'
import { Scene, Story } from 'foldkit'
import { Effect, Option, Schema } from 'effect'
import {
  SliderBlock,
  layer as sliderLayer,
  InMessage,
  sliderSettings,
  test as sliderTest,
} from '../src/slider.js'

const subject = { block: SliderBlock, layer: sliderLayer }
const { Message, OutMessage } = SliderBlock
const { HoverDelay, SelectEdit, Observe } = sliderTest
const metrics = {
  clientX: 150,
  left: 0,
  visualWidth: 220,
  width: 220,
  clientWidth: 220,
  x0: 40,
  x1: 120,
  fill: 0.5,
  zero: 0,
  handle: false,
  primary: true,
}
const key = (key: string) =>
  Message.CapturedKey({ index: 0, key, shift: false, alt: false, ctrl: false, meta: false })
const editFocus = () =>
  Story.steps(
    Story.Command.expectExact(SelectEdit({ id: 'slider' })),
    Story.Command.resolve(SelectEdit, Message.CompletedEditFocus()),
  )

describe('Slider', () => {
  it.effect(
    'compact release settles the last emitted value after resize without waiting for controlled acknowledgment',
    () =>
      Story.story(
        subject,
        Story.init({ id: 'release', value: 50, size: 'compact' }),
        Story.message(Message.CapturedMount({ width: 220 })),
        Story.message(Message.CapturedPointer({ ...metrics, clientX: 190, phase: 'down' })),
        Story.expectOutMessage(OutMessage.Changed({ value: 90 })),
        Story.message(Message.CapturedResize({ width: 440 })),
        Story.message(Message.CapturedPointer({ ...metrics, x0: 10, phase: 'up' })),
        Story.model((model) => {
          expect(model.settings.value).toBe(50)
          expect(model.x0).toBe(378)
          expect(model.drag).toBe('idle')
          expect(Option.isNone(model.preview)).toBe(true)
        }),
        Story.expectNoOutMessage(),
      ),
  )
  it.effect(
    'engine selection follows source presence rules, including explicit false and list fallback',
    () =>
      Effect.gen(function* engineSelection() {
        yield* Story.story(
          subject,
          Story.init({ id: 's', value: 40 }),
          Story.model((model) => {
            expect(model.settings.compact).toBe(false)
          }),
        )
        for (const option of [
          { showSteps: false },
          { showValue: false },
          { hideFill: false },
          { steps: [] },
          { fillStyle: {} },
        ]) {
          yield* Story.story(
            subject,
            Story.init({ id: 's', value: 40, ...option }),
            Story.model((model) => {
              expect(model.settings.compact).toBe(true)
            }),
          )
        }
        expect(
          sliderSettings({ id: 's', value: 0.5, steps: [1.3, 0.1, 0.7, 0.1, 0.5] }),
        ).toMatchObject({ min: 0.1, max: 1.3, steps: [0.1, 0.5, 0.7, 1.3] })
        expect(sliderSettings({ id: 's', value: 5, min: 2, max: 9, steps: [7] })).toMatchObject({
          min: 2,
          max: 9,
          steps: [],
        })
      }),
  )
  it.effect('controlled keyboard and editing request changes without taking value ownership', () =>
    Effect.gen(function* controlledEditing() {
      const initial = yield* Story.story(
        subject,
        Story.init({ id: 'slider', value: 50, size: 'compact' }),
        Story.message(key('ArrowRight')),
        Story.expectOutMessage(OutMessage.Changed({ value: 51 })),
        Story.model((model) => {
          expect(model.settings.value).toBe(50)
        }),
      )
      const codec = Schema.fromJsonString(SliderBlock.Model)
      const replayed = yield* Schema.decodeEffect(codec)(yield* Schema.encodeEffect(codec)(initial))
      const accepted = yield* Story.story(
        subject,
        Story.given(replayed),
        Story.inMessage(
          InMessage.RequestedSettings({
            settings: sliderSettings({ id: 'slider', value: 77, size: 'compact' }),
          }),
        ),
        Story.model((model) => {
          expect(model.settings.value).toBe(77)
        }),
      )
      for (const [draft, expected] of [
        ['42.4', 42],
        ['', undefined],
        ['42suffix', 42],
      ] as const) {
        yield* Story.story(
          subject,
          Story.given(accepted),
          Story.message(Message.StartedEdit({ index: 0 })),
          editFocus(),
          Story.message(Message.EditedDraft({ value: draft })),
          Story.message(Message.CommittedEdit()),
          ...(expected === undefined
            ? [Story.expectNoOutMessage()]
            : [Story.expectOutMessage(OutMessage.Changed({ value: expected }))]),
          Story.model((model) => {
            expect(Option.isNone(model.editingIndex)).toBe(true)
            expect(model.settings.value).toBe(77)
          }),
        )
      }
    }),
  )
  it.effect(
    'list midpoint goes lower, key navigation follows indices, and drag suppresses primitive changes',
    () =>
      Effect.gen(function* listNavigation() {
        yield* Story.story(
          subject,
          Story.init({ id: 's', value: 0.1, steps: [0.1, 0.5, 1.3] }),
          Story.message(Message.CapturedPointer({ ...metrics, clientX: 60, phase: 'down' })),
          Story.expectOutMessage(OutMessage.Changed({ value: 0.5 })),
          Story.message(key('End')),
          Story.expectNoOutMessage(),
          Story.message(Message.CapturedPointer({ ...metrics, phase: 'cancel' })),
          Story.model((model) => {
            expect(model.drag).toBe('idle')
          }),
          Story.message(key('ArrowRight')),
          Story.expectOutMessage(OutMessage.Changed({ value: 0.5 })),
        )
        yield* Story.story(
          subject,
          Story.init({ id: 's', value: 0, steps: [0, 100] }),
          Story.message(Message.CapturedPointer({ ...metrics, clientX: 110, phase: 'down' })),
          Story.expectOutMessage(OutMessage.Changed({ value: 0 })),
        )
      }),
  )
  it.effect('range clamp uses the actual moving neighbour and emits its resnapped position', () =>
    Effect.gen(function* rangeClamp() {
      const pressed = yield* Story.story(
        subject,
        Story.init({ id: 'slider', value: [20, 60], size: 'compact' }),
        Story.message(Message.CapturedPointer({ ...metrics, clientX: 80, phase: 'down' })),
        Story.model((model) => {
          expect(model.activeThumb).toBe(0)
        }),
      )
      const codec = Schema.fromJsonString(SliderBlock.Model)
      const replayed = yield* Schema.decodeEffect(codec)(yield* Schema.encodeEffect(codec)(pressed))
      yield* Story.story(
        subject,
        Story.given(replayed),
        Story.message(
          Message.CapturedPointer({ ...metrics, clientX: 210, x1: 100, phase: 'move' }),
        ),
        Story.model((model) => {
          expect(model.x0).toBe(90)
          expect(model.immediate).toBe(true)
        }),
        Story.expectOutMessage(OutMessage.Changed({ value: [45, 60] })),
      )
      yield* Story.story(
        subject,
        Story.init({ id: 'slider', value: [20, 60], size: 'compact' }),
        Story.inMessage(
          InMessage.RequestedSettings({
            settings: sliderSettings({ id: 's', value: [20, 60], disabled: true }),
          }),
        ),
        Story.message(Message.CapturedPointer({ ...metrics, phase: 'down' })),
        Story.expectNoOutMessage(),
      )
    }),
  )
  it.effect(
    'fractional resize width survives pointer observations using rounded layout width',
    () =>
      Story.story(
        subject,
        Story.init({ id: 'slider', value: 50, size: 'compact' }),
        Story.message(Message.CapturedResize({ width: 220.75 })),
        Story.message(Message.CapturedPointer({ ...metrics, phase: 'down' })),
        Story.model((model) => {
          expect(model.width).toBe(220.75)
        }),
      ),
  )
  it.effect('hover delay generations and unmount reject late publication', () =>
    Effect.gen(function* hoverLifetime() {
      const delay = HoverDelay({ generation: 1 })
      yield* Scene.scene(
        {
          ...subject,
          viewInputs: {
            animate: (node) => node,
            motionValues: (node) => node,
          },
        },
        Scene.init({ id: 'slider', value: 50, size: 'compact' }),
        Scene.Mount.resolve(Observe, Message.CapturedMount({ width: 220 })),
        Scene.Mount.emit(Observe, Message.CapturedHover({ hovered: true })),
        Scene.Command.expectExact(delay),
        Scene.Command.keepPending(delay),
        Scene.Mount.emit(Observe, Message.CapturedHover({ hovered: false })),
        Scene.Command.resolve(delay, Message.CompletedHoverDelay({ generation: 1 })),
        Scene.expect(Scene.role('slider')).toHaveAttr('aria-valuenow', '50'),
      )
      yield* Story.story(
        subject,
        Story.init({ id: 'slider', value: 50, size: 'compact' }),
        Story.message(Message.CapturedMount({ width: 220 })),
        Story.message(Message.CapturedHover({ hovered: true })),
        Story.Command.expectExact(delay),
        Story.Command.resolve(delay, Message.CompletedHoverDelay({ generation: 1 })),
        Story.model((model) => expect(model.hoverDelayDone).toBe(true)),
        Story.message(Message.CapturedHover({ hovered: false })),
        Story.message(Message.CompletedHoverDelay({ generation: 1 })),
        Story.model((model) => expect(model.hoverDelayDone).toBe(false)),
        Story.message(Message.CapturedPointer({ ...metrics, phase: 'down' })),
        Story.message(Message.Unmounted()),
        Story.model((model) => {
          expect(model.ready).toBe(false)
          expect(model.drag).toBe('idle')
        }),
      )
    }),
  )
  it.effect('pips spring per snap while scrubber/handle drags set directly', () =>
    Effect.gen(function* motionPolicy() {
      for (const variant of ['pips', 'scrubber'] as const) {
        yield* Story.story(
          subject,
          Story.init({ id: 's', value: 0, min: 0, max: 10, step: 1, variant }),
          Story.message(Message.CapturedPointer({ ...metrics, phase: 'down' })),
          Story.model((model) => {
            expect(model.immediate).toBe(false)
          }),
          Story.message(Message.CapturedPointer({ ...metrics, phase: 'move' })),
          Story.model((model) => {
            expect(model.immediate).toBe(variant === 'scrubber')
          }),
          Story.expectOutMessage(OutMessage.Changed({ value: 7 })),
        )
      }
    }),
  )
})
