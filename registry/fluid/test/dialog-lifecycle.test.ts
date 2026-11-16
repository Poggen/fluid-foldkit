// @vitest-environment happy-dom -- physical focus, portals and scoped document policy
import { it } from '@effect/vitest'
import { Context, Effect, Layer, Schedule } from 'effect'
import { Program, Runtime } from 'foldkit'
import { expect } from 'vitest'
import { DialogResources, DialogResourcesLayer } from '../src/dialog.js'
import type { DialogCallbacks } from '../src/dialog.js'
import {
  DialogFixture,
  DialogFixtureImplementationLayer,
  DialogFixtureNestedImplementationLayer,
} from './dialog-parent.js'

const eventually = (assertion: () => void) =>
  Effect.try(assertion).pipe(Effect.retry({ times: 100, schedule: Schedule.spaced('20 millis') }))

const element = (selector: string) => {
  const node = document.querySelector<HTMLElement>(selector)

  if (node === null) {
    throw new Error(`Missing Dialog element: ${selector}`)
  }

  return node
}

let mountedPrograms = 0

const mountDialogs = (
  callbacks: DialogCallbacks = {},
  mode: 'ordinary' | 'stacked' | 'nested' = 'ordinary',
) =>
  Effect.gen(function* mountDialogParent() {
    const host = document.createElement('div')
    const container = document.createElement('div')
    mountedPrograms += 1
    container.id = `dialog-lifecycle-${mountedPrograms}`
    host.append(container)
    document.body.append(host)

    const services = yield* Layer.build(
      DialogResourcesLayer(document, {
        callbacks: (id) => (id === 'primary-dialog' ? callbacks : {}),
      }),
    )

    const handle = Runtime.embed(
      Program.make({
        block: DialogFixture,
        layer:
          mode === 'nested'
            ? DialogFixtureNestedImplementationLayer
            : DialogFixtureImplementationLayer,
        container,
      }).provide(Layer.succeedContext(services)),
    )

    yield* Effect.addFinalizer(() =>
      Effect.promise(handle.dispose).pipe(
        Effect.andThen(
          Effect.sync(() => {
            host.remove()
          }),
        ),
      ),
    )
    yield* eventually(() => {
      expect(document.querySelector('#peer-dialog')).not.toBeNull()
    })

    if (mode !== 'nested') {
      yield* eventually(() => {
        expect(document.querySelector('#peer-dialog [data-fluid-dialog-panel]')).not.toBeNull()
      })

      if (mode === 'ordinary') {
        element('#peer-dialog [data-fluid-dialog-close]').click()
        yield* eventually(() => {
          expect(element('#peer-dialog').dataset.dialogPhase).toBe('Closed')
        })
      }
    }

    return { resources: Context.get(services, DialogResources) }
  })

it.live(
  'cancellable focus and dismiss callbacks preserve the physical panel through live modality changes',
  () =>
    Effect.gen(function* dialogCallbackLifecycle() {
      let cancelDismiss = true
      let opened = 0
      let closed = 0
      const focusTargets: Array<EventTarget | null> = []
      const pointerTargets: Array<EventTarget | null> = []
      const interactionPreventions: Array<boolean> = []
      const callbackRefs: Array<HTMLElement | null> = []
      yield* mountDialogs({
        contentRef: (node) => {
          callbackRefs.push(node)
        },
        onOpenAutoFocus: (event) => {
          opened += 1
          focusTargets.push(event.target)
          event.preventDefault()
        },
        onCloseAutoFocus: (event) => {
          closed += 1
          focusTargets.push(event.target)
          event.preventDefault()
        },
        onPointerDownOutside: (event) => {
          pointerTargets.push(event.target)

          if (cancelDismiss) {
            event.preventDefault()
          }
        },
        onInteractOutside: (event) => {
          interactionPreventions.push(event.defaultPrevented)
        },
        onEscapeKeyDown: (event) => {
          if (cancelDismiss) {
            event.preventDefault()
          }
        },
      })
      const trigger = element('#primary-dialog-trigger')
      trigger.focus()
      trigger.click()
      yield* eventually(() => {
        expect(element('#primary-dialog').dataset.dialogPhase).toBe('Open')
      })
      const panel = element('#primary-dialog [data-fluid-dialog-panel]')
      expect(document.activeElement).toBe(trigger)
      expect(opened).toBe(1)
      expect(focusTargets).toEqual([panel])
      document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }))
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
      )
      expect(element('#primary-dialog').dataset.state).toBe('open')
      expect(pointerTargets).toEqual([document.body])
      expect(document.body.style.overflow).toBe('hidden')
      element('#toggle-dialog-modal').click()
      yield* eventually(() => {
        expect(element('#primary-dialog').dataset.dialogModal).toBe('false')
      })
      expect(element('#primary-dialog [data-fluid-dialog-panel]')).toBe(panel)
      expect(document.body.style.overflow).toBe('')
      expect(opened).toBe(1)
      cancelDismiss = false
      document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 2 }))
      expect(pointerTargets).toEqual([document.body, document.body])
      expect(interactionPreventions).toEqual([true, true])
      cancelDismiss = true
      expect(callbackRefs).toEqual([panel])
      cancelDismiss = false
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
      )
      yield* eventually(() => {
        expect(element('#primary-dialog').dataset.dialogPhase).toBe('Closed')
      })
      expect(closed).toBe(1)
      expect(focusTargets).toEqual([panel, panel])
      expect(callbackRefs).toEqual([panel, null])
      expect(document.body.style.pointerEvents).toBe('')
    }).pipe(Effect.scoped),
)

it.live(
  'controlled acknowledgement and descendant portals share one scoped isolation lifetime',
  () =>
    Effect.gen(function* dialogControlledPortalLifetime() {
      const beforeOverflow = document.body.style.overflow
      const beforePointer = document.body.style.pointerEvents
      const { resources } = yield* mountDialogs()
      element('#accept-dialog-close').click()
      element('#primary-dialog-trigger').click()
      yield* eventually(() => {
        expect(element('[data-dialog-notifications]').dataset.dialogNotifications).toBe('1')
      })
      expect(element('#primary-dialog').dataset.state).toBe('closed')
      element('#accept-dialog-open').click()
      yield* eventually(() => {
        expect(element('#primary-dialog').dataset.dialogPhase).toBe('Open')
      })
      const host = document.createElement('div')
      const panel = document.createElement('button')
      panel.textContent = 'Portalled option'
      host.append(panel)
      document.body.append(host)
      yield* Effect.addFinalizer(() =>
        Effect.sync(() => {
          host.remove()
        }),
      )
      let dismissals = 0
      yield* resources.registerBranch({
        id: 'dialog-descendant',
        rootId: 'primary-dialog',
        parentId: 'primary-dialog',
        host,
        panel,
        trigger: null,
        isOpen: () => true,
        requestClose: () => {
          dismissals += 1
        },
      })
      panel.focus()
      expect(document.activeElement).toBe(panel)
      expect(host.getAttribute('aria-hidden')).not.toBe('true')
      panel.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }))
      expect(dismissals).toBe(0)
      element('#accept-dialog-close').click()
      yield* eventually(() => {
        expect(element('#primary-dialog').dataset.dialogPhase).toBe('Closed')
      })
      expect(document.body.style.overflow).toBe(beforeOverflow)
      expect(document.body.style.pointerEvents).toBe(beforePointer)
      expect(element('#accept-dialog-open').closest('[aria-hidden=true]')).toBeNull()
      expect(document.activeElement).toBe(element('#primary-dialog-trigger'))
    }).pipe(Effect.scoped),
)

it.live('opening order controls Escape ownership across retained sibling hosts', () =>
  Effect.gen(function* openOrderedDialogs() {
    yield* mountDialogs({}, 'stacked')
    element('#open-stacked-dialog').click()
    yield* eventually(() => {
      expect(element('#primary-dialog').dataset.dialogPhase).toBe('Open')
    })
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
    )
    yield* eventually(() => {
      expect(element('#primary-dialog').dataset.dialogPhase).toBe('Closed')
    })
    expect(element('#peer-dialog').dataset.state).toBe('open')
    expect(element('[data-dialog-notifications]').dataset.dialogNotifications).toBe('2')
  }).pipe(Effect.scoped),
)

it.live('a nonmodal child Dialog stays accessible inside its modal parent isolation', () =>
  Effect.gen(function* nestedDialogIsolation() {
    yield* mountDialogs({}, 'nested')
    element('#primary-dialog-trigger').click()
    yield* eventually(() => {
      expect(element('#primary-dialog').dataset.dialogPhase).toBe('Open')
    })
    element('#open-peer-dialog').click()
    yield* eventually(() => {
      expect(element('#peer-dialog').dataset.dialogPhase).toBe('Open')
    })
    const panel = element('#peer-dialog [data-fluid-dialog-panel]')
    expect(panel.closest('[aria-hidden=true]')).toBeNull()
    expect(document.body.style.overflow).toBe('hidden')
    element('#peer-dialog [data-fluid-dialog-close]').focus()
    expect(document.activeElement?.closest('#peer-dialog')).toBe(element('#peer-dialog'))
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
    )
    yield* eventually(() => {
      expect(element('#peer-dialog').dataset.dialogPhase).toBe('Closed')
    })
    expect(element('#primary-dialog').dataset.state).toBe('open')
    expect(document.body.style.overflow).toBe('hidden')
  }).pipe(Effect.scoped),
)

it.live(
  'logical close releases scrolling before the retained exit finishes and reopening reuses the panel',
  () =>
    Effect.gen(function* scrollLeaseLifetime() {
      const beforeOverflow = document.body.style.overflow
      const beforePadding = document.body.style.paddingRight
      yield* Effect.addFinalizer(() =>
        Effect.sync(() => {
          document.body.style.overflow = beforeOverflow
          document.body.style.paddingRight = beforePadding
        }),
      )
      document.body.style.overflow = 'scroll'
      document.body.style.paddingRight = '7px'
      yield* mountDialogs()
      const trigger = element('#primary-dialog-trigger')
      trigger.focus()
      trigger.click()
      const host = element('#primary-dialog')
      yield* eventually(() => {
        expect(host.dataset.dialogPhase).toBe('Open')
      })
      expect(getComputedStyle(host).position).toBe('fixed')
      const panel = element('#primary-dialog [data-fluid-dialog-panel]')
      const close = element('#primary-dialog [data-fluid-dialog-close]')
      close.focus()
      expect(document.body.style.overflow).toBe('hidden')
      close.click()
      yield* eventually(() => {
        expect(host.dataset.dialogPhase).toBe('Closing')
        expect(document.body.style.overflow).toBe('scroll')
      })
      expect(panel.isConnected).toBe(true)
      expect(document.activeElement).toBe(close)
      expect(document.body.style.paddingRight).toBe('7px')
      trigger.click()
      yield* eventually(() => {
        expect(host.dataset.dialogPhase).toBe('Open')
        expect(document.body.style.overflow).toBe('hidden')
      })
      expect(element('#primary-dialog [data-fluid-dialog-panel]')).toBe(panel)
      expect(getComputedStyle(host).position).toBe('fixed')
      close.click()
      yield* eventually(() => {
        expect(host.dataset.dialogPhase).toBe('Closed')
      })
      expect(document.body.style.overflow).toBe('scroll')
      expect(document.body.style.paddingRight).toBe('7px')
      expect(document.activeElement).toBe(trigger)
    }).pipe(Effect.scoped),
)
