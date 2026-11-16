import { it } from '@effect/vitest'
import { Effect } from 'effect'
import { Story } from 'foldkit'
import { expect } from 'vitest'
import { InMessage, SliderBlock, layer, sliderSettings } from '../src/slider.js'

const subject = { block: SliderBlock, layer }
const { Message, OutMessage } = SliderBlock
const configure = (config: Parameters<typeof sliderSettings>[0]) =>
  Story.inMessage(InMessage.RequestedSettings({ settings: sliderSettings(config) }))

it.effect(
  'publishes appearance without restarting targets and still accepts real geometry changes',
  () =>
    Story.story(
      subject,
      Story.init({ id: 'alpha', value: 100, size: 'compact' }),
      Story.message(Message.CapturedMount({ width: 220 })),
      configure({ id: 'alpha', value: 100, size: 'compact', thumbColor: 'red' }),
      configure({
        id: 'alpha',
        value: 100,
        size: 'compact',
        thumbColor: 'blue',
        trackStyle: { background: 'navy' },
      }),
      Story.model((model) => {
        expect(model.settings.appearance).toMatchObject({
          thumbColor: 'blue',
          trackStyle: { background: 'navy' },
        })
        expect(model).toMatchObject({
          x0: 200,
          x1: 0,
          fill: 1,
          zero: 0,
          revision: 1,
          immediate: false,
        })
      }),
      configure({ id: 'alpha', value: 100, max: 200, size: 'compact' }),
      Story.model((model) => {
        expect(model).toMatchObject({ x0: 100, fill: 0.5, revision: 2, immediate: false })
      }),
      configure({ id: 'alpha', value: 100, min: 100, max: 100, size: 'compact' }),
      Story.model((model) => {
        expect(model).toMatchObject({ x0: 0, x1: 0, fill: 0, zero: 8, revision: 3 })
      }),
      configure({
        id: 'alpha',
        value: 100,
        min: 100,
        max: 100,
        size: 'compact',
        variant: 'scrubber',
      }),
      Story.model((model) => {
        expect(model).toMatchObject({ zero: 17, revision: 4 })
      }),
      Story.expectNoOutMessage(),
    ),
)

it.effect('retunes an equal-target compact policy change', () =>
  Story.story(
    subject,
    Story.init({ id: 'mode', value: 50 }),
    Story.message(Message.CapturedMount({ width: 220 })),
    configure({ id: 'mode', value: 50, size: 'compact' }),
    Story.model((model) => {
      expect(model.settings.compact).toBe(true)
      expect(model).toMatchObject({ x0: 100, fill: 0.5, revision: 2, immediate: false })
    }),
    configure({ id: 'mode', value: 50 }),
    Story.model((model) => {
      expect(model.settings.compact).toBe(false)
      expect(model).toMatchObject({ x0: 100, fill: 0.5, revision: 3 })
    }),
    Story.expectNoOutMessage(),
  ),
)

it.effect(
  'corrects rejected controlled release from physical targets even when settings are equal',
  () =>
    Effect.gen(function* () {
      const metrics = {
        clientX: 190,
        left: 0,
        visualWidth: 220,
        width: 220,
        clientWidth: 220,
        x0: 100,
        x1: 0,
        fill: 0.5,
        zero: 0,
        handle: false,
        primary: true,
      }
      const dragging = yield* Story.story(
        subject,
        Story.init({ id: 'release', value: 50, size: 'compact' }),
        Story.message(Message.CapturedMount({ width: 220 })),
        Story.message(Message.CapturedPointer({ ...metrics, phase: 'down' })),
        Story.expectOutMessage(OutMessage.Changed({ value: 90 })),
      )
      const released = yield* Story.story(
        subject,
        Story.given(dragging),
        configure({ id: 'release', value: 50, size: 'compact' }),
        Story.model((model) => {
          expect(model.x0).toBe(dragging.x0)
          expect(model.revision).toBe(dragging.revision)
        }),
        Story.message(Message.CapturedResize({ width: 440 })),
        Story.message(Message.CapturedPointer({ ...metrics, phase: 'up' })),
        Story.model((model) => {
          expect(model).toMatchObject({ x0: 378, drag: 'idle' })
        }),
        Story.expectNoOutMessage(),
      )
      yield* Story.story(
        subject,
        Story.given(released),
        configure({ id: 'release', value: 50, size: 'compact' }),
        Story.model((model) => {
          expect(model).toMatchObject({ x0: 210, fill: 0.5, immediate: false })
          expect(model.revision).toBe(released.revision + 1)
        }),
        Story.expectNoOutMessage(),
      )
    }),
)
