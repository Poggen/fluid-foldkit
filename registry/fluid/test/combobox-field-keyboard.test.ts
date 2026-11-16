// @vitest-environment happy-dom
import { it } from '@effect/vitest'
import { Deferred, Effect, Fiber, Stream } from 'effect'
import { expect, vi } from 'vitest'
import { ComboboxFieldEvent, observeComboboxField } from '../src/combobox-field.js'

it.effect('native keyboard observation emits Entered before active descendant DOM is patched', () =>
  Effect.gen(function* () {
    const root = document.createElement('div')
    const input = document.createElement('input')
    input.setAttribute('role', 'combobox')
    input.setAttribute('aria-expanded', 'true')
    input.value = 'svel'
    root.append(input)
    document.body.append(root)

    const fonts = Object.getOwnPropertyDescriptor(document, 'fonts')
    Object.defineProperty(document, 'fonts', { configurable: true, value: new EventTarget() })
    const mounted = yield* Deferred.make<void>()
    const addEventListener = document.addEventListener.bind(document)
    const listener = vi
      .spyOn(document, 'addEventListener')
      .mockImplementation((type, callback, options) => {
        addEventListener(type, callback, options)
        if (type === 'reset') {
          Deferred.doneUnsafe(mounted, Effect.void)
        }
      })
    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        listener.mockRestore()
        root.remove()
        if (fonts === undefined) {
          Reflect.deleteProperty(document, 'fonts')
        } else {
          Object.defineProperty(document, 'fonts', fonts)
        }
      }),
    )

    const observed = yield* observeComboboxField(root, Stream.make('Live'), 'keyboard-field').pipe(
      Stream.take(2),
      Stream.runCollect,
      Effect.forkScoped,
    )
    yield* Deferred.await(mounted)
    const down = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true })
    const enter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
    input.dispatchEvent(down)
    input.dispatchEvent(enter)
    expect(input.getAttribute('aria-activedescendant')).toBeNull()
    expect(down.defaultPrevented).toBe(true)
    expect(enter.defaultPrevented).toBe(true)
    expect(yield* Fiber.join(observed)).toEqual([
      ComboboxFieldEvent.Navigated({ key: 'ArrowDown' }),
      ComboboxFieldEvent.Entered(),
    ])
  }),
)
