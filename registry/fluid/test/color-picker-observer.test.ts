// @vitest-environment happy-dom
import { constant } from 'effect/Function'
import { it } from '@effect/vitest'
import { Deferred, Effect, Fiber, Schema, Stream } from 'effect'
import { afterEach, expect, vi } from 'vitest'
import { createColorNumberEnvironment } from '../src/color-number-locale.js'
import { observeColorPicker } from '../src/color-picker-observer.js'
import { observeColorPopup } from '../src/color-picker-popup-observer.js'
import { ColorObservation } from '../src/color-picker-observation.js'

afterEach(() => {
  vi.restoreAllMocks()
})

it.effect(
  'mouse scrub focuses at the end and requests pointer lock before pointerdown returns',
  () =>
    Effect.gen(function* observesScrubAdmission() {
      const root = document.createElement('div')
      const field = document.createElement('div')
      field.dataset.colorChannel = 'r'
      const input = document.createElement('input')
      input.type = 'text'
      input.value = '107'
      field.append(input)
      root.append(field)
      document.body.append(root)
      yield* Effect.addFinalizer(() =>
        Effect.sync(() => {
          root.remove()
        }),
      )

      const mounted = yield* Deferred.make<boolean>()
      const scrubbed = yield* Deferred.make<boolean>()
      const edited = yield* Deferred.make<boolean>()
      const returned = vi.fn()
      const messages: Array<typeof ColorObservation.Type> = []
      const pointerCapture = Object.getOwnPropertyDescriptor(field, 'setPointerCapture')
      const pointerLock = Object.getOwnPropertyDescriptor(document.body, 'requestPointerLock')
      const hasCapture = Object.getOwnPropertyDescriptor(field, 'hasPointerCapture')
      const releaseCapture = Object.getOwnPropertyDescriptor(field, 'releasePointerCapture')
      const focus = vi.spyOn(input, 'focus')
      const blur = vi.spyOn(input, 'blur')
      const select = vi.spyOn(input, 'select')
      const view = document.defaultView

      if (view === null) {
        throw new Error('Color picker observation requires an owning window')
      }

      const css = view.CSS
      vi.spyOn(css, 'supports').mockReturnValue(false)
      vi.spyOn(view, 'CSS', 'get').mockReturnValue(css)
      expect(view.CSS.supports('-webkit-backdrop-filter:none')).toBe(false)
      Object.defineProperty(field, 'setPointerCapture', { configurable: true, value: vi.fn() })
      Object.defineProperty(field, 'hasPointerCapture', { configurable: true, value: () => true })
      Object.defineProperty(field, 'releasePointerCapture', { configurable: true, value: vi.fn() })

      const request = vi
        .fn<typeof document.body.requestPointerLock>()
        .mockRejectedValue(new Error('Pointer lock denied by external browser policy'))

      Object.defineProperty(document.body, 'requestPointerLock', {
        configurable: true,
        value: request,
      })
      yield* Effect.addFinalizer(() =>
        Effect.sync(() => {
          if (pointerCapture === undefined) {
            Reflect.deleteProperty(field, 'setPointerCapture')
          } else {
            Object.defineProperty(field, 'setPointerCapture', pointerCapture)
          }

          if (hasCapture === undefined) {
            Reflect.deleteProperty(field, 'hasPointerCapture')
          } else {
            Object.defineProperty(field, 'hasPointerCapture', hasCapture)
          }

          if (releaseCapture === undefined) {
            Reflect.deleteProperty(field, 'releasePointerCapture')
          } else {
            Object.defineProperty(field, 'releasePointerCapture', releaseCapture)
          }

          if (pointerLock === undefined) {
            Reflect.deleteProperty(document.body, 'requestPointerLock')
          } else {
            Object.defineProperty(document.body, 'requestPointerLock', pointerLock)
          }
        }),
      )

      yield* observeColorPicker(root, Stream.make('Live'), createColorNumberEnvironment()).pipe(
        Stream.runForEach((message) =>
          Effect.sync(() => {
            messages.push(message)
          }).pipe(
            Effect.andThen(
              Schema.is(ColorObservation.Mounted)(message)
                ? Deferred.succeed(mounted, true)
                : Effect.void,
            ),
            Effect.andThen(
              Schema.is(ColorObservation.ScrubDown)(message)
                ? Deferred.succeed(scrubbed, true)
                : Effect.void,
            ),
            Effect.andThen(
              Schema.is(ColorObservation.FieldFocus)(message)
                ? Deferred.succeed(edited, true)
                : Effect.void,
            ),
          ),
        ),
        Effect.forkScoped,
      )
      yield* Deferred.await(mounted)

      field.dispatchEvent(
        new PointerEvent('pointerdown', {
          bubbles: true,
          cancelable: true,
          button: 0,
          pointerId: 7,
          pointerType: 'mouse',
          clientX: 100,
          clientY: 20,
        }),
      )
      returned()

      expect(focus).toHaveBeenCalledOnce()
      expect(request).toHaveBeenCalledOnce()
      expect(focus.mock.invocationCallOrder[0]).toBeLessThan(
        request.mock.invocationCallOrder[0] ?? 0,
      )
      expect(request.mock.invocationCallOrder[0]).toBeLessThan(
        returned.mock.invocationCallOrder[0] ?? 0,
      )
      expect(document.activeElement).toBe(input)
      expect(input.selectionStart).toBe(3)
      expect(input.selectionEnd).toBe(3)
      expect(select).not.toHaveBeenCalled()
      expect(request).toHaveBeenCalledWith()
      expect(request.mock.contexts).toEqual([document.body])
      yield* Deferred.await(scrubbed)
      expect(messages.some(Schema.is(ColorObservation.ScrubDown))).toBe(true)
      expect(messages.some(Schema.is(ColorObservation.FieldFocus))).toBe(false)

      field.dispatchEvent(
        new PointerEvent('pointermove', {
          bubbles: true,
          pointerId: 7,
          pointerType: 'mouse',
          buttons: 1,
          clientX: 120,
          movementX: 20,
        }),
      )
      field.dispatchEvent(
        new PointerEvent('pointerup', {
          bubbles: true,
          pointerId: 7,
          pointerType: 'mouse',
          clientX: 120,
        }),
      )
      expect(blur).toHaveBeenCalledOnce()
      expect(document.activeElement).not.toBe(input)

      field.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
      expect(document.activeElement).toBe(input)
      expect(select).toHaveBeenCalledOnce()
      yield* Deferred.await(edited)
      expect(messages.some(Schema.is(ColorObservation.ScrubUp))).toBe(true)
    }),
)

it.live('opening a color popover focuses its own saturation control after positioning', () =>
  Effect.gen(function* focusesOpenedColorPopover() {
    const host = document.createElement('div')
    const outside = document.createElement('div')
    outside.dataset.colorSquare = ''
    outside.tabIndex = 0
    const trigger = document.createElement('button')
    trigger.id = 'focus-picker-trigger'
    const popup = document.createElement('div')
    popup.id = 'focus-picker'
    const square = document.createElement('div')
    square.dataset.colorSquare = ''
    square.setAttribute('role', 'application')
    square.setAttribute('aria-label', 'Saturation and brightness')
    square.tabIndex = 0
    popup.append(square)
    host.append(outside, trigger, popup)
    document.body.append(host)
    trigger.focus()

    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        host.remove()
      }),
    )
    yield* observeColorPopup({
      element: popup,
      id: popup.id,
      generation: 0,
      portalContainerId: '',
      initialOpen: false,
      kind: 'popover',
      openingIndex: -1,
      viewStateChanges: Stream.make('Live'),
    }).pipe(Stream.runDrain, Effect.forkScoped)

    yield* Effect.promise(
      constant(
        Promise.resolve(expect.poll(() => document.activeElement, { timeout: 1500 }).toBe(square)),
      ),
    )
  }),
)

it.effect('ignores unrelated window releases and pairs its own mouse press with one release', () =>
  Effect.gen(function* observesOnlyOwnedPresses() {
    const root = document.createElement('div')
    document.body.append(root)
    yield* Effect.addFinalizer(() => Effect.sync(() => root.remove()))
    const mounted = yield* Deferred.make<boolean>()
    const released = yield* Deferred.make<boolean>()
    const messages: Array<typeof ColorObservation.Type> = []
    yield* observeColorPicker(root, Stream.make('Live'), createColorNumberEnvironment()).pipe(
      Stream.runForEach((message) =>
        Effect.sync(() => messages.push(message)).pipe(
          Effect.andThen(
            Schema.is(ColorObservation.Mounted)(message)
              ? Deferred.succeed(mounted, true)
              : Schema.is(ColorObservation.Pressed)(message) && !message.pressed
                ? Deferred.succeed(released, true)
                : Effect.void,
          ),
        ),
      ),
      Effect.forkScoped,
    )
    yield* Deferred.await(mounted)
    window.dispatchEvent(new MouseEvent('mouseup', { button: 0 }))
    root.dispatchEvent(new MouseEvent('mousedown', { button: 0, bubbles: true }))
    window.dispatchEvent(new MouseEvent('mouseup', { button: 0 }))
    window.dispatchEvent(new MouseEvent('mouseup', { button: 0 }))
    yield* Deferred.await(released)
    expect(
      messages.filter(Schema.is(ColorObservation.Pressed)).map((message) => message.pressed),
    ).toEqual([true, false])
  }).pipe(Effect.scoped),
)

it.effect('numeric field listeners validate input and stop intercepting keys after disposal', () =>
  Effect.gen(function* observesNumericFieldLifetime() {
    const root = document.createElement('div')
    const field = document.createElement('div')
    field.dataset.colorChannel = 'r'
    const input = document.createElement('input')
    input.type = 'text'
    input.value = '107'
    field.append(input)
    root.append(field)
    document.body.append(root)
    yield* Effect.addFinalizer(() => Effect.sync(() => root.remove()))

    const mounted = yield* Deferred.make<void>()
    const drafted = yield* Deferred.make<typeof ColorObservation.FieldDraft.Type>()
    const observer = yield* observeColorPicker(
      root,
      Stream.make('Live'),
      createColorNumberEnvironment(),
    ).pipe(
      Stream.runForEach((message) => {
        if (Schema.is(ColorObservation.Mounted)(message)) {
          return Deferred.succeed(mounted, undefined)
        }
        if (Schema.is(ColorObservation.FieldDraft)(message)) {
          return Deferred.succeed(drafted, message)
        }
        return Effect.void
      }),
      Effect.forkScoped,
    )
    yield* Deferred.await(mounted)

    input.value = '109'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    expect(yield* Deferred.await(drafted)).toEqual(
      ColorObservation.FieldDraft({ channel: 'r', value: '109' }),
    )
    const invalid = new KeyboardEvent('keydown', {
      key: 'q',
      bubbles: true,
      cancelable: true,
    })
    input.dispatchEvent(invalid)
    expect(invalid.defaultPrevented).toBe(true)

    yield* Fiber.interrupt(observer)
    const afterDisposal = new KeyboardEvent('keydown', {
      key: 'q',
      bubbles: true,
      cancelable: true,
    })
    input.dispatchEvent(afterDisposal)
    expect(afterDisposal.defaultPrevented).toBe(false)
  }).pipe(Effect.scoped),
)
