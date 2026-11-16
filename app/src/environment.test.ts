import { it } from '@effect/vitest'
import { Effect, Fiber, Layer, Schema, Stream } from 'effect'
import { Block, Program, Runtime } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { expect, vi } from 'vitest'
import { SiteEnvironment, presentationEffects } from './environment'
import { suppressTransitionStyles, themeTransitionStyles } from './theme'

const Message = defineMessageUnion({ ClickedShape: {}, Finished: {} })
const TransitionFixtureKey = Symbol('TransitionFixture')
const TransitionFixture = Block.make('TransitionFixture', {
  key: TransitionFixtureKey,
  Model: Schema.Struct({ radius: Schema.Natural }),
  Message,
  InitArgs: Schema.Tuple([]),
  effects: Block.makeEffectsContract<never, SiteEnvironment>(),
  view: { kind: 'Document' },
})
const Finish = TransitionFixture.makeCommand('Finish', {
  messages: [Message.Finished],
  *handler() {
    const environment = yield* SiteEnvironment
    return () => (environment.transitionShape ?? Effect.void).pipe(Effect.as(Message.Finished()))
  },
})
const Composition = TransitionFixture.makeComposition({})
const fixtureLayer = TransitionFixture.makeLayer({
  init: Composition.makeInit(() => ({ model: { radius: 8 } })),
  update: Composition.makeUpdate({
    ClickedShape: (model) => ({ model: { radius: model.radius + 1 }, commands: [Finish()] }),
    Finished: (model) => ({ model }),
  }),
  view: Composition.makeView((model, h) => ({
    title: 'Transition guard ordering',
    body: h.button(
      [
        h.Id('change-shape'),
        h.DataAttribute('radius', String(model.radius)),
        h.OnClick(Message.ClickedShape()),
      ],
      ['Change shape'],
    ),
  })),
  EffectsLayer: Finish.layer,
})

const themeStyles = () =>
  [...document.head.querySelectorAll('style')].filter(
    (style) => style.textContent === themeTransitionStyles + suppressTransitionStyles,
  )

it.live(
  'installs and flushes the source root class before the installed runtime patches shape',
  () =>
    Effect.gen(function* () {
      const host = document.createElement('div')
      const container = document.createElement('div')
      container.id = 'transition-runtime-order'
      host.append(container)
      document.body.append(host)
      const flushed: Array<{ guard: boolean; radius: string | undefined }> = []
      const flush = vi
        .spyOn(document.documentElement, 'offsetHeight', 'get')
        .mockImplementation(() => {
          flushed.push({
            guard: document.documentElement.classList.contains('transitioning'),
            radius: host.querySelector<HTMLElement>('button')?.dataset.radius,
          })
          return 0
        })
      const runtime = Runtime.embed(
        Program.make({ block: TransitionFixture, layer: fixtureLayer, container }).provide(
          Layer.succeed(SiteEnvironment, {
            ...presentationEffects(document, window),
            isMac: false,
            columnsChanges: Stream.empty,
            apply: () => Effect.void,
            copy: () => Effect.succeed(true),
          }),
        ),
      )
      try {
        yield* Effect.promise(() =>
          vi.waitFor(() => expect(host.querySelector('button')).not.toBeNull()),
        )
        const button = host.querySelector('button')
        if (button === null) throw new Error('Missing transition fixture button')
        button.click()
        yield* Effect.promise(() => vi.waitFor(() => expect(button.dataset.radius).toBe('9')))
        expect(flushed).toContainEqual({ guard: true, radius: '8' })
        expect(document.documentElement.classList.contains('transitioning')).toBe(true)
        yield* Effect.promise(() =>
          vi.waitFor(() =>
            expect(document.documentElement.classList.contains('transitioning')).toBe(false),
          ),
        )
      } finally {
        yield* Effect.promise(runtime.dispose)
        flush.mockRestore()
        host.remove()
      }
    }),
)

it.live(
  'a repeated shape keeps its guard when the older command expires and releases on interruption',
  () =>
    Effect.gen(function* () {
      const effects = presentationEffects(document, window)
      const first = yield* Effect.forkChild(effects.transitionShape)
      yield* Effect.sleep('100 millis')
      const second = yield* Effect.forkChild(effects.transitionShape)
      yield* Fiber.join(first)
      expect(document.documentElement.classList.contains('transitioning')).toBe(true)
      yield* Fiber.interrupt(second)
      expect(document.documentElement.classList.contains('transitioning')).toBe(false)
    }),
)

it.live(
  'theme owns the source stylesheet until finished and temporarily overrides a live shape guard',
  () =>
    Effect.gen(function* () {
      const completion = Promise.withResolvers<void>()
      const descriptor = Object.getOwnPropertyDescriptor(document, 'activeViewTransition')
      Object.defineProperty(document, 'activeViewTransition', {
        configurable: true,
        value: { finished: completion.promise },
      })
      const effects = presentationEffects(document, window)
      const shape = yield* Effect.forkChild(effects.transitionShape)
      yield* Effect.yieldNow
      const theme = yield* Effect.forkChild(effects.transitionTheme)
      try {
        yield* Effect.sleep('30 millis')
        expect(themeStyles()).toHaveLength(1)
        expect(document.documentElement.classList.contains('transitioning')).toBe(false)
        completion.resolve()
        yield* Fiber.join(theme)
        expect(themeStyles()).toHaveLength(0)
        expect(document.documentElement.classList.contains('transitioning')).toBe(true)
      } finally {
        yield* Fiber.interrupt(theme)
        yield* Fiber.interrupt(shape)
        if (descriptor) Object.defineProperty(document, 'activeViewTransition', descriptor)
        else Reflect.deleteProperty(document, 'activeViewTransition')
      }
      expect(document.documentElement.classList.contains('transitioning')).toBe(false)
    }),
)

it.live(
  'overlapping theme swaps retain suppression when one is interrupted and clean up rejected finished',
  () =>
    Effect.gen(function* () {
      const completion = Promise.withResolvers<void>()
      const descriptor = Object.getOwnPropertyDescriptor(document, 'activeViewTransition')
      Object.defineProperty(document, 'activeViewTransition', {
        configurable: true,
        value: { finished: completion.promise },
      })
      const effects = presentationEffects(document, window)
      const first = yield* Effect.forkChild(effects.transitionTheme)
      const second = yield* Effect.forkChild(effects.transitionTheme)
      try {
        yield* Effect.sleep('30 millis')
        expect(themeStyles()).toHaveLength(2)
        yield* Fiber.interrupt(first)
        expect(themeStyles()).toHaveLength(1)
        completion.reject(new Error('Skipped transition'))
        yield* Fiber.join(second)
        expect(themeStyles()).toHaveLength(0)
      } finally {
        yield* Fiber.interrupt(first)
        yield* Fiber.interrupt(second)
        if (descriptor) Object.defineProperty(document, 'activeViewTransition', descriptor)
        else Reflect.deleteProperty(document, 'activeViewTransition')
      }
    }),
)

it.live('fallback flushes and retains suppression for two frames after the pending commit', () =>
  Effect.gen(function* () {
    const callbacks: FrameRequestCallback[] = []
    const frame = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((callback) => callbacks.push(callback))
    const descriptor = Object.getOwnPropertyDescriptor(document, 'activeViewTransition')
    Object.defineProperty(document, 'activeViewTransition', {
      configurable: true,
      value: undefined,
    })
    const effects = presentationEffects(document, window)
    const theme = yield* Effect.forkChild(effects.transitionTheme)
    const advance = () =>
      Effect.gen(function* () {
        yield* Effect.yieldNow
        const callback = callbacks.shift()
        if (!callback) throw new Error('Missing animation frame')
        callback(0)
        yield* Effect.sleep('1 millis')
      })
    try {
      yield* Effect.yieldNow
      expect(themeStyles()).toHaveLength(1)
      yield* advance()
      expect(themeStyles()).toHaveLength(1)
      yield* advance()
      expect(themeStyles()).toHaveLength(1)
      yield* advance()
      yield* Fiber.join(theme)
      expect(themeStyles()).toHaveLength(0)
    } finally {
      yield* Fiber.interrupt(theme)
      frame.mockRestore()
      if (descriptor) Object.defineProperty(document, 'activeViewTransition', descriptor)
      else Reflect.deleteProperty(document, 'activeViewTransition')
    }
  }),
)
