import { expect, test } from 'vitest'
import { it } from '@effect/vitest'
import { Layer } from 'effect'
import { Story } from 'foldkit'
import { Paint } from '../src/carousel-dots-native.js'
import {
  CarouselDotsBlock,
  CarouselDotsResourcesServerLayer,
  advanceCarousel,
  carouselClock,
  layer,
} from '../src/carousel-dots.js'

const carousel = {
  block: CarouselDotsBlock,
  layer: layer.pipe(Layer.provide(CarouselDotsResourcesServerLayer)),
}

it.effect('empty autoplay never requests a selection or waits for a parent', () =>
  Story.story(
    carousel,
    Story.init({ id: 'slides', count: 0, value: 0, autoplay: { duration: 1 } }),
    Story.message(CarouselDotsBlock.Message.Frame({ elapsed: 16 })),
    Story.expectNoOutMessage(),
    Story.Command.expectNone(),
    Story.model((model) => {
      expect(model.clock.progress).toBe(0)
      expect(model.clock.waiting).toBe(false)
      expect(model.clock.value).toBe(0)
    }),
  ),
)

for (const loop of [false, true]) {
  it.effect(
    `single-slide autoplay fills once without requesting the same slide (loop ${loop})`,
    () =>
      Story.story(
        carousel,
        Story.init({ id: 'slides', count: 1, value: 0, autoplay: { duration: 100, loop } }),
        Story.message(CarouselDotsBlock.Message.Frame({ elapsed: 50 })),
        Story.expectNoOutMessage(),
        Story.Command.expectExact(Paint),
        Story.model((model) => {
          expect(model.clock.progress).toBe(0.5)
          expect(model.clock.waiting).toBe(false)
          expect(model.clock.value).toBe(0)
        }),
        Story.Command.resolveAll([Paint, CarouselDotsBlock.Message.Painted()]),
        Story.message(CarouselDotsBlock.Message.Frame({ elapsed: 50 })),
        Story.expectNoOutMessage(),
        Story.Command.expectExact(Paint),
        Story.model((model) => {
          expect(model.clock.progress).toBe(1)
          expect(model.clock.waiting).toBe(false)
          expect(model.clock.value).toBe(0)
        }),
        Story.Command.resolveAll([Paint, CarouselDotsBlock.Message.Painted()]),
        Story.message(CarouselDotsBlock.Message.Frame({ elapsed: 50 })),
        Story.expectNoOutMessage(),
        Story.Command.expectNone(),
        Story.model((model) => {
          expect(model.clock.progress).toBe(1)
          expect(model.clock.waiting).toBe(false)
          expect(model.clock.value).toBe(0)
        }),
      ),
  )
}

test.each([
  { count: 1.5, value: 1 },
  { count: 3, value: -1 },
  { count: 3, value: 3 },
  { count: 3, value: Number.NaN },
])('autoplay cannot derive a slide from invalid controlled selection %j', (selection) => {
  const clock = carouselClock({ id: 'slides', ...selection, autoplay: { duration: 1 } })
  const advanced = advanceCarousel(clock, 16)
  expect(advanced.requested).toBeNull()
  expect(advanced.clock.waiting).toBe(false)
})

test.each([
  { value: 0, loop: true, expected: 1 },
  { value: 2, loop: true, expected: 0 },
  { value: 2, loop: false, expected: null },
])('autoplay respects the final valid slide and loop setting %j', ({ value, loop, expected }) => {
  const clock = carouselClock({ id: 'slides', count: 3, value, autoplay: { duration: 1, loop } })
  expect(advanceCarousel(clock, 16).requested).toBe(expected)
})

for (const selection of [
  { count: 0, index: 0 },
  { count: 3, index: -1 },
  { count: 3, index: 3 },
  { count: 1.5, index: 1 },
]) {
  it.effect(`click ${selection.index} cannot select outside a count of ${selection.count}`, () =>
    Story.story(
      carousel,
      Story.init({ id: 'slides', count: selection.count, value: 0 }),
      Story.message(CarouselDotsBlock.Message.Clicked({ index: selection.index })),
      Story.expectNoOutMessage(),
      Story.Command.expectNone(),
      Story.model((model) => expect(model.clock.value).toBe(0)),
    ),
  )
}
