import { acquireHover, eventually } from './companion-hover-program.js'
// @vitest-environment happy-dom
import { geometryFromArray } from '../src/lib/indexed-geometry.js'
import { expect } from 'vitest'
import { it } from '@effect/vitest'
import { Effect, Option, Schema } from 'effect'
import { Story } from 'foldkit'
import { HoverBlock, layer as HoverLayer, measureHoverItems } from '../src/hover.js'
import { acquireCarousel } from './carousel-program.js'
import { makeCarouselDotsResourcesLayer } from '../src/carousel-dots.js'
import { HoverHighlightBlock, layer as HighlightLayer } from '../src/hover-highlight.js'

const hover = { block: HoverBlock, layer: HoverLayer }

const highlight = { block: HoverHighlightBlock, layer: HighlightLayer }

const rects = [
  { left: 0, top: 0, width: 120, height: 60 },
  { left: 0, top: 60, width: 120, height: 60 },
]

it.live(
  'pointer-handler control defaults enabled and old JSON replay preserves that default without coercing false',
  () =>
    Effect.gen(function* pointerReplay() {
      const initial = yield* Story.story(hover, Story.init({ id: 'legacy' }))
      expect(initial.pointerHandlers).toBe(true)
      const codec = Schema.toCodecJson(HoverBlock.Model)

      const { pointerHandlers: _pointerHandlers, ...legacy } = yield* Schema.encodeEffect(
        HoverBlock.Model,
      )(initial)

      expect((yield* Schema.decodeEffect(codec)(legacy)).pointerHandlers).toBe(true)

      const disabled = yield* Effect.scoped(
        Effect.gen(function* disableLiveHover() {
          const app = yield* acquireHover
          yield* app.click('disable')
          yield* eventually(() => {
            expect(app.snapshot().hover.pointerHandlers).toBe(false)
          })

          return app.snapshot().hover
        }),
      )

      const encoded = yield* Schema.encodeEffect(codec)(disabled)
      expect((yield* Schema.decodeEffect(codec)(encoded)).pointerHandlers).toBe(false)
      expect(
        Option.isNone(Schema.decodeUnknownOption(codec)({ ...legacy, pointerHandlers: 'false' })),
      ).toBe(true)
    }),
)

it.live(
  'disabling source pointer handlers retains measurements, active state and an already captured move',
  () =>
    Effect.scoped(
      Effect.gen(function* livePointerControl() {
        const app = yield* acquireHover
        yield* app.click('measure')
        yield* eventually(() => {
          expect(app.snapshot().hover.itemRects).toEqual(geometryFromArray(rects))
          expect(app.snapshot().hover.isMeasured).toBe(true)
        })
        yield* app.click('activate')
        yield* eventually(() => {
          expect(app.snapshot().hover.activeIndex).toBe(0)
        })
        app.root.dispatchEvent(new MouseEvent('mouseenter', { clientX: 40, clientY: 20 }))
        const row = app.root.querySelector('#row-1')

        if (row === null) {
          throw new Error('Expected mounted second hover row')
        }

        row.dispatchEvent(
          new MouseEvent('mousemove', {
            clientX: 40,
            clientY: 80,
            bubbles: true,
          }),
        )
        yield* app.click('disable')
        yield* eventually(() => {
          expect(app.snapshot().hover.pointerHandlers).toBe(false)
          expect(app.snapshot().hover.activeIndex).toBe(1)
        })
        expect(app.snapshot().hover.isMeasured).toBe(true)
        expect(app.snapshot().hover.itemRects).toEqual(geometryFromArray(rects))
        yield* app.click('enable')
        yield* eventually(() => {
          expect(app.snapshot().hover.pointerHandlers).toBe(true)
        })
        expect(app.snapshot().hover.activeIndex).toBe(1)
        expect(app.snapshot().hover.isMeasured).toBe(true)
      }),
    ),
)

it.live(
  'CardGroup controls pointer handlers through its public binding operation and preserves the source hidden exit lifetime',
  () =>
    Effect.gen(function* retainedHover() {
      yield* Effect.scoped(
        Effect.gen(function* liveCardControls() {
          const app = yield* acquireHover
          expect(app.snapshot().cards.hover.pointerHandlers).toBe(false)
          yield* app.click('card-enable')
          yield* eventually(() => {
            expect(app.snapshot().cards.hover.pointerHandlers).toBe(true)
          })
          yield* app.click('card-disable')
          yield* eventually(() => {
            expect(app.snapshot().cards.hover.pointerHandlers).toBe(false)
          })
        }),
      )

      const snapshot = {
        activeIndex: 0,
        itemRects: geometryFromArray(rects),
        isMeasured: true,
        session: 1,
      }

      const closing = yield* Story.story(
        highlight,
        Story.init({ id: 'highlight' }),
        Story.inMessage(
          HoverHighlightBlock.InMessage.InformedOfSource({ snapshot, hidden: false }),
        ),
        Story.model((model) => {
          expect(model.slots[0]?.phase).toBe('Present')
        }),
        Story.inMessage(HoverHighlightBlock.InMessage.InformedOfSource({ snapshot, hidden: true })),
        Story.model((model) => {
          expect(model.slots[0]?.phase).toBe('Exiting')
        }),
      )

      const generation = closing.slots[0]?.generation

      if (generation === undefined) {
        throw new Error('Expected retained source exit')
      }

      yield* Story.story(
        highlight,
        Story.given(closing),
        Story.inMessage(
          HoverHighlightBlock.InMessage.InformedOfSource({ snapshot, hidden: false }),
        ),
        Story.model((model) => {
          expect(model.slots[0]?.phase).toBe('Present')
        }),
        Story.message(HoverHighlightBlock.Message.CompletedExit({ session: 1, generation })),
        Story.model((model) => {
          expect(model.slots[0]?.phase).toBe('Present')
        }),
      )
    }),
)

it.effect(
  'physical highlight identity distinguishes reflow from row replacement and keeps legacy springs',
  () =>
    Effect.gen(function* highlightReflow() {
      const snapshot = {
        activeIndex: 0,
        itemRects: geometryFromArray(rects),
        isMeasured: true,
        session: 1,
      }

      const receive = (targetKey: string, top: number) =>
        HoverHighlightBlock.InMessage.InformedOfSource({
          snapshot: {
            ...snapshot,
            itemRects: geometryFromArray([{ left: 0, width: 120, height: 60, top }]),
          },
          hidden: false,
          targetKey,
        })

      const reflowed = yield* Story.story(
        highlight,
        Story.init({ id: 'physical-highlight' }),
        Story.inMessage(receive('first-physical-row', 0)),
        Story.model((model) => {
          expect(model.slots[0]?.hasRowChanged).toBe(true)
        }),
        Story.inMessage(receive('first-physical-row', 0)),
        Story.model((model) => {
          expect(model.slots[0]?.hasRowChanged).toBe(true)
        }),
        Story.inMessage(receive('first-physical-row', 64)),
        Story.model((model) => {
          expect(model.slots[0]?.hasRowChanged).toBe(false)
        }),
        Story.inMessage(receive('first-physical-row', 64)),
        Story.model((model) => {
          expect(model.slots[0]?.hasRowChanged).toBe(false)
        }),
      )

      const codec = Schema.toCodecJson(HoverHighlightBlock.Model)
      const encoded = yield* Schema.encodeEffect(HoverHighlightBlock.Model)(reflowed)

      const legacy = yield* Schema.decodeEffect(codec)({
        ...encoded,
        slots: encoded.slots.map(
          ({ maybeTargetKey: _maybeTargetKey, hasRowChanged: _hasRowChanged, ...slot }) => slot,
        ),
      })

      expect(legacy.slots[0]?.hasRowChanged).toBe(true)
      expect(Option.isNone(legacy.slots[0]?.maybeTargetKey ?? Option.none())).toBe(true)
      yield* Story.story(
        highlight,
        Story.given(reflowed),
        Story.inMessage(receive('replacement-physical-row', 64)),
        Story.model((model) => {
          expect(model.slots[0]?.hasRowChanged).toBe(true)
        }),
        Story.inMessage(HoverHighlightBlock.InMessage.RequestedHide()),
        Story.inMessage(receive('replacement-physical-row', 64)),
        Story.model((model) => {
          expect(model.slots[0]?.hasRowChanged).toBe(true)
        }),
        Story.inMessage(
          HoverHighlightBlock.InMessage.InformedOfSource({ snapshot, hidden: false }),
        ),
        Story.model((model) => {
          expect(model.slots[0]?.hasRowChanged).toBe(true)
          expect(Option.isNone(model.slots[0]?.maybeTargetKey ?? Option.none())).toBe(true)
        }),
      )
    }),
)

const acquireMouseCarousel = Effect.gen(function* mouseCarouselProgram() {
  // happy-dom eagerly rejects canceled WAAPI finished promises; exercise Motion's real JS fallback.
  yield* Effect.acquireRelease(
    Effect.sync(() => {
      const descriptor = Object.getOwnPropertyDescriptor(Element.prototype, 'animate')
      if (descriptor === undefined || !Reflect.deleteProperty(Element.prototype, 'animate')) {
        throw new Error('Carousel mouse test requires scoped WAAPI capability removal')
      }
      return descriptor
    }),
    (descriptor) =>
      Effect.sync(() => Object.defineProperty(Element.prototype, 'animate', descriptor)),
  )
  const app = yield* acquireCarousel(
    { id: 'mouse-carousel', count: 3, value: 0, reducedMotion: true },
    [],
    makeCarouselDotsResourcesLayer(() => ({})),
  )
  const root = app.root()
  Object.defineProperties(root, {
    offsetWidth: { value: 72 },
    offsetHeight: { value: 18 },
    getBoundingClientRect: { value: () => new DOMRect(0, 0, 72, 18) },
  })
  const dots = [...root.querySelectorAll('button')]
  for (const [index, dot] of dots.entries()) {
    Object.defineProperties(dot, {
      offsetWidth: { value: 18 },
      offsetHeight: { value: 18 },
      offsetLeft: { value: index * 24 },
      offsetTop: { value: 0 },
      offsetParent: { value: root },
    })
  }
  measureHoverItems(root)
  yield* eventually(() => expect(app.snapshot().carousel.hover.itemRects.length).toBe(3))
  return {
    ...app,
    enter: () => root.dispatchEvent(new MouseEvent('mouseenter')),
    leave: () => root.dispatchEvent(new MouseEvent('mouseleave')),
    move: (index: number) => {
      const dot = dots[index]
      if (dot === undefined) throw new Error('Missing carousel dot')
      dot.dispatchEvent(
        new MouseEvent('mousemove', { bubbles: true, clientX: index * 24 + 9, clientY: 9 }),
      )
    },
  }
})

const mouseFrame = Effect.callback<void>((resume) => {
  const frame = window.requestAnimationFrame(() => resume(Effect.void))
  return Effect.sync(() => window.cancelAnimationFrame(frame))
})

it.live(
  'Carousel enter override routes the parent message while move and leave keep their defaults',
  () =>
    Effect.scoped(
      Effect.gen(function* selectiveEnter() {
        const app = yield* acquireMouseCarousel
        yield* app.mouseOverride('enter')
        app.enter()
        yield* eventually(() => expect(app.snapshot().mouseEvents).toEqual(['enter']))
        expect(app.snapshot().carousel.hover.sessionPending).toBe(false)
        app.move(1)
        yield* eventually(() => expect(app.snapshot().carousel.hover.activeIndex).toBe(1))
        expect(app.snapshot().carousel.hover.session).toBe(0)
        app.leave()
        yield* eventually(() => expect(app.snapshot().carousel.hover.activeIndex).toBeNull())
        yield* app.mouseOverride('none')
        app.enter()
        app.move(2)
        yield* eventually(() => {
          expect(app.snapshot().carousel.hover.activeIndex).toBe(2)
          expect(app.snapshot().carousel.hover.session).toBe(1)
        })
      }),
    ),
)

it.live(
  'Carousel leave override preserves an admitted move and restores ordinary clearing on removal',
  () =>
    Effect.scoped(
      Effect.gen(function* selectiveLeave() {
        const app = yield* acquireMouseCarousel
        yield* app.mouseOverride('leave')
        app.enter()
        app.move(1)
        app.leave()
        yield* eventually(() => {
          expect(app.snapshot().mouseEvents).toEqual(['leave'])
          expect(app.snapshot().carousel.hover.activeIndex).toBe(1)
        })
        yield* app.mouseOverride('none')
        app.leave()
        yield* eventually(() => expect(app.snapshot().carousel.hover.activeIndex).toBeNull())
      }),
    ),
)

it.live(
  'Carousel move override leaves enter and leave active and restores movement when removed',
  () =>
    Effect.scoped(
      Effect.gen(function* selectiveMove() {
        const app = yield* acquireMouseCarousel
        yield* app.mouseOverride('move')
        app.enter()
        app.move(1)
        yield* eventually(() => {
          expect(app.snapshot().mouseEvents).toEqual(['move'])
          expect(app.snapshot().carousel.hover.sessionPending).toBe(true)
        })
        yield* mouseFrame
        expect(app.snapshot().carousel.hover.activeIndex).toBeNull()
        yield* app.mouseOverride('none')
        app.move(1)
        yield* eventually(() => expect(app.snapshot().carousel.hover.activeIndex).toBe(1))
        app.leave()
        yield* eventually(() => expect(app.snapshot().carousel.hover.activeIndex).toBeNull())
      }),
    ),
)

it.live(
  'Carousel caller click receives the bubbled event without replacing the dot selection',
  () =>
    Effect.scoped(
      Effect.gen(function* selectiveClick() {
        const app = yield* acquireMouseCarousel
        yield* app.mouseOverride('click')
        yield* app.click(2)
        yield* eventually(() => {
          expect(app.snapshot().mouseEvents).toEqual(['click'])
          expect(app.snapshot().outputs).toEqual([2])
        })
        expect(app.snapshot().carousel.clock.value).toBe(0)
      }),
    ),
)

it.live('Carousel pointer-leave attributes do not replace the Source mouse-leave handler', () =>
  Effect.scoped(
    Effect.gen(function* pointerIsNotMouse() {
      const app = yield* acquireMouseCarousel
      yield* app.mouseOverride('pointerLeave')
      app.enter()
      app.move(1)
      yield* eventually(() => expect(app.snapshot().carousel.hover.activeIndex).toBe(1))
      app.root().dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'pen' }))
      yield* eventually(() => expect(app.snapshot().mouseEvents).toEqual(['pointerLeave']))
      expect(app.snapshot().carousel.hover.activeIndex).toBe(1)
      app.leave()
      yield* eventually(() => expect(app.snapshot().carousel.hover.activeIndex).toBeNull())
    }),
  ),
)
