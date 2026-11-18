import { acquireCarousel as acquireCarouselProgram, eventually } from './carousel-program.js'
// oxlint-disable-next-line landmines-style/no-comments -- Required Vitest environment directive.
// @vitest-environment happy-dom
import { expect } from 'vitest'
import { motionValue } from 'motion-dom'
import { it as test } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import { Story } from 'foldkit'
import {
  CarouselDotsBlock,
  CarouselDotsResources,
  CarouselDotsResourcesServerLayer,
  makeCarouselDotsResourcesLayer,
  layer as CarouselLayer,
} from '../src/carousel-dots.js'
import { Paint } from '../src/carousel-dots-native.js'
import type { CarouselDotsConfig } from '../src/carousel-dots.js'
import { CardGroupBlock, CardGroupRefsServerLayer, layer as CardLayer } from '../src/card.js'

const acquireCarousel = (config: CarouselDotsConfig) => {
  const notifications: Array<number> = []

  return acquireCarouselProgram(
    config,
    notifications,
    makeCarouselDotsResourcesLayer(() => ({
      onValueChange: (value) => {
        notifications.push(value)
      },
    })),
  )
}

const carousel = {
  block: CarouselDotsBlock,
  layer: CarouselLayer.pipe(Layer.provide(CarouselDotsResourcesServerLayer)),
}

const cards = {
  block: CardGroupBlock,
  layer: CardLayer.pipe(Layer.provide(CardGroupRefsServerLayer)),
}

const painted = () => Story.Command.resolveAll([Paint, CarouselDotsBlock.Message.Painted()])
const frame = (elapsed: number) => Story.message(CarouselDotsBlock.Message.Frame({ elapsed }))

test.live(
  'autoplay ignores stalls, pauses, completes once, and waits for the controlled parent',
  () =>
    Effect.scoped(
      Effect.gen(function* autoplayProgram() {
        const config = { id: 'slides', count: 3, value: 0, autoplay: { duration: 200 } }
        const app = yield* acquireCarousel(config)
        yield* app.frame(99)
        yield* eventually(() => {
          expect(app.snapshot().carousel.clock.progress).toBeCloseTo(0.495)
        })
        yield* app.frame(100)
        yield* app.frame(99)
        yield* eventually(() => {
          expect(app.snapshot().carousel.clock.progress).toBeCloseTo(0.99)
        })
        yield* app.frame(10)
        yield* eventually(() => {
          expect(app.notifications).toEqual([1])
          expect(app.snapshot().outputs).toEqual([1])
        })
        expect(app.snapshot().carousel.clock.value).toBe(0)
        yield* app.frame(90)
        yield* app.configure({ ...config, value: 1, autoplay: { duration: 200, paused: true } })
        yield* eventually(() => {
          expect(app.snapshot().carousel.clock.value).toBe(1)
        })
        yield* app.frame(99)
        yield* eventually(() => {
          expect(app.snapshot().carousel.clock.progress).toBe(0)
        })
        expect(app.notifications).toEqual([1])
      }),
    ),
)

for (const loop of [false, true]) {
  test.live(`single-slide autoplay paints the mounted fill without notifying (loop ${loop})`, () =>
    Effect.scoped(
      Effect.gen(function* singleSlideFill() {
        const app = yield* acquireCarousel({
          id: 'single-slide',
          count: 1,
          value: 0,
          autoplay: { duration: 100, loop },
        })
        yield* eventually(() => expect(app.fill()).toContain('calc(-1 *'))
        yield* app.frame(50)
        yield* eventually(() => {
          expect(app.snapshot().carousel.clock.progress).toBe(0.5)
          expect(app.fill()).toContain('calc(-0.5 *')
        })
        expect(app.notifications).toEqual([])
        expect(app.snapshot().outputs).toEqual([])
        yield* app.frame(50)
        yield* eventually(() => {
          expect(app.snapshot().carousel.clock.progress).toBe(1)
          expect(app.fill()).toContain('calc(0 *')
        })
        expect(app.snapshot().carousel.clock.waiting).toBe(false)
        expect(app.snapshot().carousel.clock.value).toBe(0)
        expect(app.notifications).toEqual([])
        expect(app.snapshot().outputs).toEqual([])
      }),
    ),
  )
}

test.live(
  'manual progress overrides autoplay, reduced motion never advances, and final non-loop slide emits nothing',
  () =>
    Effect.gen(function* manualCases() {
      for (const config of [
        { autoplay: true, progress: 0.4 },
        { autoplay: true, reducedMotion: true },
        { value: 2, autoplay: { duration: 1, loop: false } },
      ]) {
        yield* Story.story(
          carousel,
          Story.init({ id: 'slides', count: 3, ...config, value: config.value ?? 0 }),
          frame(99),
          painted(),
          Story.expectNoOutMessage(),
          Story.model((model) => {
            expect(model.clock.value).toBe(config.value ?? 0)
          }),
        )
      }

      yield* Effect.scoped(
        Effect.gen(function* manualClick() {
          const app = yield* acquireCarousel({
            id: 'slides',
            count: 3,
            value: 0,
            progress: 0.4,
            autoplay: true,
          })

          yield* app.frame(90)
          expect(app.snapshot().carousel.clock.progress).toBe(0.4)
          yield* app.click(2)
          yield* eventually(() => {
            expect(app.notifications).toEqual([2])
            expect(app.snapshot().outputs).toEqual([2])
          })
        }),
      )
    }),
)

test.effect('removing manual progress restores a solid static pill', () =>
  Story.story(
    carousel,
    Story.init({ id: 'slides', count: 2, value: 0, progress: 0.35 }),
    Story.inMessage(
      CarouselDotsBlock.InMessage.RequestedConfigure({
        config: { id: 'slides', count: 2, value: 0 },
      }),
    ),
    painted(),
    Story.model((model) => {
      expect(model.clock.progress).toBe(1)
    }),
  ),
)

test.effect(
  'carousel remount starts a fresh autoplay lifetime while preserving the controlled slide',
  () =>
    Story.story(
      carousel,
      Story.init({ id: 'slides', count: 3, value: 1, autoplay: { duration: 200 } }),
      frame(99),
      painted(),
      Story.message(CarouselDotsBlock.Message.Unmounted()),
      Story.model((model) => {
        expect(model.clock.value).toBe(1)
        expect(model.clock.progress).toBe(0)
        expect(model.clock.waiting).toBe(false)
        expect(model.preferenceReady).toBe(false)
      }),
    ),
)

test.effect(
  'CardGroup and external-progress Carousel states roundtrip through their public JSON codecs',
  () =>
    Effect.gen(function* companionCodec() {
      const card = yield* Story.story(
        cards,
        Story.init({ id: 'cards' }),
        Story.inMessage(CardGroupBlock.InMessage.RequestedRef({ identity: 'second-original-ref' })),
      )

      const cardCodec = Schema.fromJsonString(CardGroupBlock.Model)
      expect(
        yield* Schema.decodeEffect(cardCodec)(yield* Schema.encodeEffect(cardCodec)(card)),
      ).toEqual(card)

      const slides = yield* Story.story(
        carousel,
        Story.init({
          id: 'slides',
          count: 3,
          value: 1,
          externalProgress: true,
          resourceIdentity: 'original-motion-value',
        }),
      )

      const slideCodec = Schema.fromJsonString(CarouselDotsBlock.Model)
      expect(
        yield* Schema.decodeEffect(slideCodec)(yield* Schema.encodeEffect(slideCodec)(slides)),
      ).toEqual(slides)
    }),
)

test.live(
  'empty autoplay never emits an invalid slide and keeps controlled boundary values serializable',
  () =>
    Effect.scoped(
      Effect.gen(function* () {
        const config = { id: 'empty', count: 0, value: 0, autoplay: { duration: 1 } }
        const app = yield* acquireCarousel(config)
        yield* app.frame(16)
        yield* app.configure({ ...config, value: Number.NaN })
        yield* eventually(() =>
          expect(Number.isNaN(app.snapshot().carousel.clock.value)).toBe(true),
        )
        yield* app.frame(16)
        yield* app.configure(config)
        yield* eventually(() => expect(app.snapshot().carousel.clock.value).toBe(0))
        expect(app.notifications).toEqual([])
        expect(app.snapshot().outputs).toEqual([])
        expect(app.snapshot().carousel.clock.waiting).toBe(false)
        expect(app.snapshot().carousel.clock.count).toBe(0)
      }),
    ),
)

test.live(
  'clearing a running carousel preserves its clock while fractional counts and nonlooping empty states never advance',
  () =>
    Effect.gen(function* numericSourceCases() {
      const config = { id: 'slides', count: 3, value: 0, autoplay: { duration: 200 } }
      yield* Story.story(
        carousel,
        Story.init(config),
        frame(99),
        painted(),
        Story.inMessage(
          CarouselDotsBlock.InMessage.RequestedConfigure({ config: { ...config, count: 0 } }),
        ),
        painted(),
        Story.model((model) => {
          expect(model.clock.progress).toBeCloseTo(0.495)
        }),
      )
      yield* Story.story(
        carousel,
        Story.init({ id: 'empty', count: 0, value: 0, autoplay: { duration: 1, loop: false } }),
        frame(16),
        painted(),
        Story.expectNoOutMessage(),
      )
      yield* Effect.scoped(
        Effect.gen(function* fractionalCarousel() {
          const app = yield* acquireCarousel({
            id: 'fractional',
            count: 1.5,
            value: 1,
            autoplay: { duration: 1 },
          })

          yield* app.frame(16)
          yield* app.configure({
            id: 'fractional',
            count: 1.5,
            value: 0,
            autoplay: { duration: 1 },
          })
          yield* eventually(() => expect(app.snapshot().carousel.clock.value).toBe(0))
          expect(app.notifications).toEqual([])
          expect(app.snapshot().outputs).toEqual([])
          expect(app.snapshot().carousel.clock.waiting).toBe(false)
        }),
      )
    }),
)

test.effect(
  'captured carousel callbacks remain isolated by instance and logical identity, including NaN payloads',
  () =>
    Effect.gen(function* callbackIsolation() {
      const first: Array<number> = []
      const second: Array<number> = []
      const replacement: Array<number> = []

      const onFirst = (value: number) => {
        first.push(value)
      }

      const onSecond = (value: number) => {
        second.push(value)
      }

      const onReplacement = (value: number) => {
        replacement.push(value)
      }

      const layer = makeCarouselDotsResourcesLayer((id, identity) => {
        if (id !== 'one') {
          return { onValueChange: onSecond }
        }

        return { onValueChange: identity === 'first' ? onFirst : onReplacement }
      })

      return yield* Effect.gen(function* notifyInstances() {
        const resources = yield* CarouselDotsResources
        yield* resources.notify('one', 'first', Number.NaN)
        yield* resources.notify('two', 'first', 0.5)
        yield* resources.notify('one', 'replacement', 2)
        expect(first).toHaveLength(1)
        expect(Number.isNaN(first[0])).toBe(true)
        expect(second).toEqual([0.5])
        expect(replacement).toEqual([2])
      }).pipe(Effect.provide(layer))
    }),
)

test.effect(
  'Carousel captures reduced motion once per mount and keeps it across controlled configuration',
  () =>
    Story.story(
      carousel,
      Story.init({ id: 'slides', count: 3, value: 0, autoplay: true }),
      Story.message(CarouselDotsBlock.Message.Reduced({ value: false })),
      Story.message(CarouselDotsBlock.Message.Reduced({ value: true })),
      Story.model((model) => {
        expect(model.clock.reducedMotion).toBe(false)
      }),
      Story.inMessage(
        CarouselDotsBlock.InMessage.RequestedConfigure({
          config: {
            id: 'slides',
            count: 3,
            value: 1,
            autoplay: true,
            resourceIdentity: 'replacement',
            reducedMotion: true,
          },
        }),
      ),
      painted(),
      Story.model((model) => {
        expect(model.preferenceReady).toBe(true)
        expect(model.clock.reducedMotion).toBe(false)
      }),
      frame(50),
      painted(),
      Story.model((model) => {
        expect(model.clock.progress).toBeGreaterThan(0)
      }),
      Story.message(CarouselDotsBlock.Message.Unmounted()),
      Story.model((model) => {
        expect(model.preferenceReady).toBe(false)
      }),
      Story.message(CarouselDotsBlock.Message.Reduced({ value: true })),
      Story.model((model) => {
        expect(model.clock.reducedMotion).toBe(true)
      }),
      frame(50),
      painted(),
      Story.model((model) => {
        expect(model.clock.progress).toBe(0)
      }),
    ),
)

test.live(
  'mounted autoplay restarts only after actual remount and preserves the accepted slide',
  () =>
    Effect.scoped(
      Effect.gen(function* mountedAutoplay() {
        const config = { id: 'lifetime', count: 3, value: 1, autoplay: { duration: 200 } }
        const app = yield* acquireCarousel(config)
        yield* app.frame(50)
        yield* eventually(() => {
          expect(app.snapshot().carousel.clock.progress).toBe(0.25)
          expect(app.fill()).toContain('-0.75')
        })
        yield* app.configure({ ...config, autoplay: { duration: 300, paused: true } })
        yield* eventually(() => {
          expect(app.snapshot().carousel.clock.duration).toBe(300)
          expect(app.snapshot().carousel.clock.paused).toBe(true)
          expect(app.fill()).toContain('-0.75')
        })
        yield* app.configure({ ...config, value: 2, autoplay: { duration: 300 } })
        yield* eventually(() => {
          expect(app.snapshot().carousel.clock.value).toBe(2)
          expect(app.fill()).toContain('-1')
        })
        yield* app.frame(75)
        yield* eventually(() => expect(app.fill()).toContain('-0.75'))
        yield* app.toggleMount()
        yield* eventually(() => {
          expect(app.snapshot().mounted).toBe(false)
          expect(app.fill()).toBeUndefined()
          expect(app.snapshot().carousel.clock.progress).toBe(0)
        })
        yield* app.toggleMount()
        yield* eventually(() => {
          expect(app.snapshot().carousel.preferenceReady).toBe(true)
          expect(app.snapshot().carousel.clock.value).toBe(2)
          expect(app.fill()).toContain('-1')
        })
        yield* app.frame(75)
        yield* eventually(() => expect(app.snapshot().carousel.clock.progress).toBe(0.25))
        expect(app.notifications).toEqual([])
      }),
    ),
)

test.live('external MotionValue replacement and actual unmount release progress and refs', () =>
  Effect.gen(function* externalLifetime() {
    const first = motionValue(0.25)
    const second = motionValue(0.75)
    const refs: Array<HTMLDivElement | null> = []
    const resources = makeCarouselDotsResourcesLayer((_id, identity) => ({
      progress: identity === 'second' ? second : first,
      ref: (element) => {
        refs.push(element)
      },
    }))
    yield* Effect.scoped(
      Effect.gen(function* mountedExternal() {
        const config = {
          id: 'external',
          count: 4,
          value: 0,
          autoplay: true,
          externalProgress: true,
          resourceIdentity: 'first',
        }
        const app = yield* acquireCarouselProgram(config, [], resources)
        yield* eventually(() => {
          expect(app.snapshot().carousel.clock.autoplay).toBe(false)
          expect(app.fill()).toContain('-0.75')
          expect(refs.at(-1)).toBeInstanceOf(HTMLDivElement)
        })
        yield* Effect.sync(() => first.set(0.5))
        yield* eventually(() => expect(app.fill()).toContain('-0.5'))
        yield* app.configure({ ...config, resourceIdentity: 'second' })
        yield* eventually(() => expect(app.fill()).toContain('-0.25'))
        yield* Effect.sync(() => {
          first.set(0.1)
          second.set(0.9)
        })
        yield* eventually(() => expect(app.snapshot().carousel.clock.progress).toBe(0.9))
        yield* app.toggleMount()
        yield* eventually(() => {
          expect(app.snapshot().mounted).toBe(false)
          expect(refs.at(-1)).toBeNull()
        })
        yield* Effect.sync(() => second.set(0.6))
        expect(app.snapshot().carousel.clock.progress).toBe(0.9)
        yield* app.toggleMount()
        yield* eventually(() => {
          expect(app.snapshot().carousel.clock.progress).toBe(0.6)
          expect(refs.at(-1)).toBeInstanceOf(HTMLDivElement)
        })
      }),
    )
    expect(refs.at(-1)).toBeNull()
    first.destroy()
    second.destroy()
  }),
)
