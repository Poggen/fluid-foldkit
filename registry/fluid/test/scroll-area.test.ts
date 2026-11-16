import { expect } from 'vitest'
import { it } from '@effect/vitest'
import { Block, Scene, Story } from 'foldkit'
import { Effect, Layer, Option, Schema } from 'effect'
import { childAttributes } from 'foldkit/html'
import { scrollAxisMetrics } from '../src/scroll-area-state.js'
import { ScrollAreaBlock, layer, test as scrollTest } from '../src/scroll-area.js'

const subject = { block: ScrollAreaBlock, layer }
const { Settle, Scroll, Observe } = scrollTest
const measured = {
  width: 100,
  height: 100,
  scrollWidth: 400,
  scrollHeight: 400,
  left: 0,
  top: 0,
  trackX: 100,
  trackY: 100,
  paddingX: 0,
  paddingY: 0,
  marginX: 8,
  marginY: 8,
}

it.effect('Base: scroll visibility and stale timer responses survive a model round trip', () =>
  Effect.gen(function* scrollRoundTrip() {
    const initial = yield* Story.story(subject, Story.init({ id: 'scroll', orientation: 'both' }))
    const codec = Schema.fromJsonString(ScrollAreaBlock.Model)
    const replay = yield* Schema.decodeEffect(codec)(yield* Schema.encodeEffect(codec)(initial))
    const firstX = Settle({ axis: 'x', generation: 1 })
    const firstY = Settle({ axis: 'y', generation: 1 })
    const secondY = Settle({ axis: 'y', generation: 2 })
    yield* Scene.scene(
      { ...subject, viewInputs: { children: [] } },
      Scene.given(replay),
      Scene.Mount.expectExact(Observe),
      Scene.Mount.resolve(Observe, ScrollAreaBlock.Message.Measured(measured)),
      Scene.Mount.emit(Observe, ScrollAreaBlock.Message.Scrolled({ left: 30, top: 40 })),
      Scene.Command.expectExactInOrder(firstX, firstY),
      Scene.Command.keepPending(firstX),
      Scene.Command.keepPending(firstY),
      Scene.expect(Scene.selector('[data-scroll-axis="x"]')).toHaveAttr('data-scrolling', ''),
      Scene.expect(Scene.selector('[data-scroll-axis="y"]')).toHaveAttr('data-scrolling', ''),
      Scene.Mount.emit(Observe, ScrollAreaBlock.Message.Scrolled({ left: 30, top: 80 })),
      Scene.Command.expectExactInOrder(firstX, firstY, secondY),
      Scene.Command.resolve(firstY, ScrollAreaBlock.Message.Settled({ axis: 'y', generation: 1 })),
      Scene.expect(Scene.selector('[data-scroll-axis="y"]')).toHaveAttr('data-scrolling', ''),
      Scene.Command.resolve(secondY, ScrollAreaBlock.Message.Settled({ axis: 'y', generation: 2 })),
      Scene.expect(Scene.selector('[data-scroll-axis="y"]')).not.toHaveAttr('data-scrolling'),
      Scene.Command.resolve(firstX, ScrollAreaBlock.Message.Settled({ axis: 'x', generation: 1 })),
      Scene.expect(Scene.selector('[data-scroll-axis="x"]')).not.toHaveAttr('data-scrolling'),
      Scene.Command.expectNone(),
    )
    yield* Story.story(
      subject,
      Story.given(replay),
      Story.message(ScrollAreaBlock.Message.Unmounted()),
      Story.model((model) => {
        expect(model.scrollingX).toBe(false)
        expect(model.scrollingY).toBe(false)
        expect(Option.isNone(model.drag)).toBe(true)
      }),
    )
  }),
)

it.effect('Base thumb preserves RTL direction and shrinks against the pinned overscroll edge', () =>
  Story.story(
    subject,
    Story.init({ id: 'geometry', direction: 'rtl', orientation: 'both' }),
    Story.message(ScrollAreaBlock.Message.Measured({ ...measured, left: -150, top: -80 })),
    Story.model((model) => {
      expect(scrollAxisMetrics(model, 'x').offset).toBe(-34.5)
      const padded = scrollAxisMetrics(
        { ...model, geometry: { ...model.geometry, trackX: 80, paddingX: 10 } },
        'x',
      )
      expect(padded.restingSize).toBe(20)
      const start = scrollAxisMetrics(model, 'y')
      expect(start.size).toBeCloseTo((23 * 400) / 480)
      expect(start.offset).toBe(0)
      const end = scrollAxisMetrics({ ...model, geometry: { ...model.geometry, top: 380 } }, 'y')
      expect(end.offset + end.size).toBe(92)
    }),
  ),
)

it.effect('an unchanged touch observation preserves an active pointer drag', () =>
  Effect.gen(function* touchDrag() {
    const dragging = yield* Story.story(
      subject,
      Story.init({ id: 'drag', orientation: 'horizontal' }),
      Story.message(
        ScrollAreaBlock.Message.Measured({
          ...measured,
          height: 30,
          scrollWidth: 300,
          scrollHeight: 30,
          trackY: 0,
        }),
      ),
      Story.message(
        ScrollAreaBlock.Message.PointerDown({
          pointer: 1,
          axis: 'x',
          start: 20,
          position: 0,
          trackStart: 0,
          thumbOffset: 5,
        }),
      ),
      Story.Command.expectExact(Scroll({ id: 'drag', left: 0, top: 0 })),
      Story.Command.resolve(Scroll, ScrollAreaBlock.Message.CompletedScroll()),
      Story.model((model) => {
        expect(Option.isSome(model.drag)).toBe(true)
      }),
    )
    yield* Story.story(
      subject,
      Story.given(dragging),
      Story.message(ScrollAreaBlock.Message.TouchChanged({ touch: false })),
      Story.model((model) => {
        expect(model).toBe(dragging)
        expect(Option.isSome(model.drag)).toBe(true)
      }),
      Story.message(ScrollAreaBlock.Message.TouchChanged({ touch: true })),
      Story.model((model) => {
        expect(Option.isNone(model.drag)).toBe(true)
      }),
    )
  }),
)

const orientations: ReadonlyArray<'vertical' | 'horizontal' | 'both'> = [
  'vertical',
  'horizontal',
  'both',
]

for (const orientation of orientations) {
  it.effect(`touch ${orientation} viewport remains tabbable without overflow`, () =>
    Scene.scene(
      { ...subject, viewInputs: { children: [] } },
      Scene.init({ id: `touch-${orientation}`, orientation }),
      Scene.Mount.expectExact(Observe),
      Scene.Mount.resolve(
        Observe,
        ScrollAreaBlock.Message.Measured({ ...measured, scrollWidth: 100, scrollHeight: 100 }),
      ),
      Scene.expect(Scene.selector('[data-slot="scroll-area-viewport"]')).toHaveAttr(
        'tabIndex',
        '-1',
      ),
      Scene.Mount.emit(Observe, ScrollAreaBlock.Message.TouchChanged({ touch: true })),
      Scene.expect(Scene.selector('[data-slot="scroll-area-viewport"]')).toHaveAttr(
        'tabIndex',
        '0',
      ),
      Scene.Mount.emit(Observe, ScrollAreaBlock.Message.Measured(measured)),
      Scene.expect(Scene.selector('[data-slot="scroll-area-viewport"]')).toHaveAttr(
        'tabIndex',
        '0',
      ),
      Scene.Mount.emit(Observe, ScrollAreaBlock.Message.TouchChanged({ touch: false })),
      Scene.expect(Scene.selector('[data-slot="scroll-area-viewport"]')).toHaveAttr(
        'tabIndex',
        '0',
      ),
      Scene.Mount.emit(
        Observe,
        ScrollAreaBlock.Message.Measured({ ...measured, scrollWidth: 100, scrollHeight: 100 }),
      ),
      Scene.expect(Scene.selector('[data-slot="scroll-area-viewport"]')).toHaveAttr(
        'tabIndex',
        '-1',
      ),
      Scene.Command.expectNone(),
    ),
  )
}

const ViewportOverrideKey = Symbol('ViewportOverride')
const ViewportOverrideBlock = Block.make('ViewportOverride', {
  key: ViewportOverrideKey,
  Model: Schema.Struct({ scroll: ScrollAreaBlock.Model }),
  Message: Schema.Never,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Element' },
})
const ScrollBinding = ViewportOverrideBlock.makeRequiredFieldBinding(ScrollAreaBlock, {
  field: 'scroll',
  init: { contextToArgs: () => [{ id: 'touch-override' }] },
}).withOutMessagePolicy({
  fold: ViewportOverrideBlock.makeOutMessageFold(ScrollAreaBlock, {
    Scrolled: ViewportOverrideBlock.makeNoopStep,
  }),
})
const OverrideComposition = ViewportOverrideBlock.makeComposition({ bindings: [ScrollBinding] })
const overrideLayer = ViewportOverrideBlock.makeLayer({
  init: OverrideComposition.makeInit(() => ({ model: {} })),
  update: OverrideComposition.makeUpdate({}),
  view: OverrideComposition.makeView((model, h) =>
    h.block(
      ScrollBinding.embedView({
        slotId: 'scroll',
        model: model.scroll,
        viewInputs: {
          children: [],
          viewportAttributes: childAttributes([h.Tabindex(-1)]),
        },
      }),
    ),
  ),
}).pipe(Layer.provide(layer))

it.effect('caller viewport tabindex still overrides touch and desktop defaults', () =>
  Scene.scene(
    { block: ViewportOverrideBlock, layer: overrideLayer },
    Scene.init(),
    Scene.Mount.expectExact(Observe),
    Scene.Mount.resolve(Observe, ScrollAreaBlock.Message.Measured(measured)),
    Scene.expect(Scene.selector('[data-slot="scroll-area-viewport"]')).toHaveAttr('tabIndex', '-1'),
    Scene.Mount.emit(Observe, ScrollAreaBlock.Message.TouchChanged({ touch: true })),
    Scene.expect(Scene.selector('[data-slot="scroll-area-viewport"]')).toHaveAttr('tabIndex', '-1'),
    Scene.Command.expectNone(),
  ),
)
