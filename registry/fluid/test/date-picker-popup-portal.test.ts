// @vitest-environment happy-dom -- real Foldkit mount and handler Layer lifetimes
import { it } from '@effect/vitest'
import { Effect, Schedule } from 'effect'
import { Program, Runtime } from 'foldkit'
import { expect, vi } from 'vitest'
import { PopupAuthorityLayer } from '../src/date-picker-popup-authority.js'
import { acquireDefaultPortalHost } from '../src/default-portal-host.js'
import { mountPopupPortal } from '../src/date-picker-popup-portal.js'
import { DialogResourcesLayer } from '../src/dialog.js'
import { DialogFixture, DialogFixtureNestedImplementationLayer } from './dialog-parent.js'
import { PopupFixture, popupFixtureLayer } from './date-picker-popup-fixture.js'

const eventually = (assertion: () => void) =>
  Effect.try(assertion).pipe(Effect.retry({ times: 100, schedule: Schedule.spaced('10 millis') }))

const host = (owner = document) =>
  owner.querySelector<HTMLElement>('[data-fluid-dialog-portal-root]')

const element = (id: string, owner = document) => {
  const node = owner.querySelector<HTMLElement>(`#${id}`)

  if (node === null) {
    throw new Error(`Missing popup fixture element ${id}`)
  }

  return node
}

const finish = (id: string, generation?: number) => {
  const popup = element(`${id}-popup`)
  const motion = popup.querySelector('[data-popup-motion]')

  if (motion === null) {
    throw new Error('Missing popup motion surface')
  }

  motion.dispatchEvent(
    new CustomEvent('fluid-date-picker-exit', {
      bubbles: true,
      detail: generation ?? Number(popup.dataset.popupGeneration),
    }),
  )
}

const mount = (id: string, parent = document.body) => {
  const container = parent.ownerDocument.createElement('div')
  container.id = id
  parent.append(container)

  const handle = Runtime.embed(
    Program.makeElement({ block: PopupFixture, layer: popupFixtureLayer(id), container }).provide(
      PopupAuthorityLayer,
    ),
  )

  return {
    ...handle,
    container,
    dispose: () =>
      Effect.promise(handle.dispose).pipe(Effect.tap(() => Effect.sync(() => container.remove()))),
  }
}

const open = (id: string, owner = document) =>
  Effect.gen(function* openPopup() {
    yield* eventually(() => {
      expect(owner.querySelector(`#${id}-anchor`)).not.toBeNull()
    })
    element(`${id}-anchor`, owner).focus()
    element(`${id}-anchor`, owner).click()
    yield* eventually(() => {
      expect(element(`${id}-popup`, owner).dataset.popupOpen).toBe('true')
      expect(
        element(`${id}-popup`, owner).closest('[data-date-picker-portal]')?.parentElement,
      ).toBe(host(owner))
      expect(owner.querySelectorAll(`[data-popup-focus-guard="${id}-popup"]`)).toHaveLength(4)
    })
  })

const close = (id: string) =>
  Effect.gen(function* closePopup() {
    element(`${id}-close`).click()
    yield* eventually(() => {
      expect(element(`${id}-popup`).dataset.popupOpen).toBe('false')
    })
    finish(id)
    yield* eventually(() => {
      expect(document.querySelector(`#${id}-popup`)).toBeNull()
    })
    expect(document.querySelectorAll(`[data-popup-focus-guard="${id}-popup"]`)).toHaveLength(0)
    expect(document.querySelector(`[data-date-picker-portal="${id}-popup"]`)).toBeNull()
  })

it.live(
  'standalone complete exits and interrupted exits retain one host without body mutations',
  () =>
    Effect.gen(function* standaloneLifecycle() {
      const runtime = mount('standalone')
      const changes: Array<MutationRecord> = []

      const observer = new MutationObserver((records) => {
        changes.push(...records)
      })

      try {
        yield* open('standalone')
        const shared = host()
        const firstWrapper = element('standalone-popup').parentElement
        expect(shared).not.toBeNull()
        observer.observe(document.body, { childList: true })
        yield* close('standalone')
        expect(host()).toBe(shared)
        yield* open('standalone')
        expect(element('standalone-popup').parentElement).not.toBe(firstWrapper)
        element('standalone-option').focus()
        expect(document.activeElement?.id).toBe('standalone-option')
        element('standalone-option').dispatchEvent(
          new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
        )
        yield* eventually(() => {
          expect(element('standalone-popup').dataset.popupOpen).toBe('false')
        })
        finish('standalone')
        yield* eventually(() => {
          expect(document.querySelector('#standalone-popup')).toBeNull()
        })
        expect(document.activeElement?.id).toBe('standalone-anchor')
        yield* open('standalone')
        element('standalone-close').click()
        yield* eventually(() => {
          expect(element('standalone-popup').dataset.popupOpen).toBe('false')
        })
        const stale = Number(element('standalone-popup').dataset.popupGeneration)
        const retained = element('standalone-popup')
        yield* open('standalone')
        finish('standalone', stale)
        expect(element('standalone-popup')).toBe(retained)
        element('standalone-close').click()
        yield* eventually(() => {
          expect(element('standalone-popup').dataset.popupOpen).toBe('false')
        })
        finish('standalone', stale)
        yield* Effect.sleep('20 millis')
        expect(element('standalone-popup')).toBe(retained)
        finish('standalone')
        yield* eventually(() => {
          expect(document.querySelector('#standalone-popup')).toBeNull()
        })
        yield* open('standalone')
        element('standalone-close').click()
        yield* eventually(() => {
          expect(document.querySelector('#standalone-popup')).toBeNull()
        })
        expect(host()).toBe(shared)
        expect([...changes, ...observer.takeRecords()]).toHaveLength(0)
      } finally {
        observer.disconnect()
        yield* runtime.dispose()
      }

      expect(host()).toBeNull()
    }),
)

it.live(
  'runtime disposal restores the live popup and removes guards before releasing its last host',
  () =>
    Effect.gen(function* liveDisposal() {
      const runtime = mount('dispose-open')

      try {
        yield* open('dispose-open')
        const shared = host()

        if (shared === null) {
          throw new Error('Missing shared host')
        }

        const popup = element('dispose-open-popup')
        const next = element('dispose-open-next')
        const order: Array<string> = []
        const restoreBefore = next.before.bind(next)
        const removeHost = shared.remove.bind(shared)

        const insertion = vi.spyOn(next, 'before').mockImplementation((...nodes) => {
          expect(shared.isConnected).toBe(true)
          expect(document.querySelectorAll('[data-popup-focus-guard]')).toHaveLength(0)
          order.push('restore')
          restoreBefore(...nodes)
        })

        const removal = vi.spyOn(shared, 'remove').mockImplementation(() => {
          expect(shared.querySelector('[data-date-picker-portal]')).toBeNull()
          expect(popup.parentNode).not.toBe(shared)
          order.push('release')
          removeHost()
        })

        try {
          yield* runtime.dispose()
          expect(order).toEqual(['restore', 'release'])
        } finally {
          insertion.mockRestore()
          removal.mockRestore()
        }

        expect(host()).toBeNull()
        expect(document.querySelectorAll('[data-popup-focus-guard]')).toHaveLength(0)
      } finally {
        yield* runtime.dispose()
      }
    }),
)

it.live('independent popup runtimes retain the host until the final owner disposes', () =>
  Effect.gen(function* independentOwners() {
    const first = mount('owner-one')
    const second = mount('owner-two')

    try {
      yield* open('owner-one')
      const shared = host()
      yield* open('owner-two')
      expect(host()).toBe(shared)
      yield* first.dispose()
      expect(host()).toBe(shared)
      expect(element('owner-two-popup').isConnected).toBe(true)
      yield* close('owner-two')
      expect(host()).toBe(shared)
      yield* second.dispose()
      expect(host()).toBeNull()
    } finally {
      yield* first.dispose()
      yield* second.dispose()
    }
  }),
)

it.live('document leases are independent and double release cannot remove a surviving owner', () =>
  Effect.sync(() => {
    const iframe = document.createElement('iframe')
    document.body.append(iframe)
    const other = iframe.contentDocument

    if (other === null) {
      throw new Error('Missing second document')
    }

    const first = acquireDefaultPortalHost(document)
    const second = acquireDefaultPortalHost(document)
    const separate = acquireDefaultPortalHost(other)

    try {
      expect(first.element).toBe(second.element)
      expect(separate.element.ownerDocument).toBe(other)
      expect(separate.element).not.toBe(first.element)
      first.release()
      first.release()
      expect(second.element.isConnected).toBe(true)
      separate.release()
      expect(host(other)).toBeNull()
      expect(host()).toBe(second.element)
    } finally {
      first.release()
      second.release()
      separate.release()
      iframe.remove()
    }

    expect(host()).toBeNull()
  }),
)

it.live('portal restoration tolerates moved siblings and disconnected origins', () =>
  Effect.sync(() => {
    const origin = document.createElement('div')
    const popup = document.createElement('div')
    const next = document.createElement('div')
    origin.append(popup, next)
    document.body.append(origin)
    const lease = acquireDefaultPortalHost(document)
    const config = { id: 'restore', anchorId: 'anchor', kind: 'trigger', align: 'start' } as const

    try {
      const first = mountPopupPortal(popup, config, lease.element)
      next.remove()
      first.restore()
      expect(origin.lastChild).toBe(popup)
      const second = mountPopupPortal(popup, config, lease.element)
      origin.remove()
      second.restore()
      expect(popup.isConnected).toBe(false)
      expect(lease.element.childElementCount).toBe(0)
    } finally {
      origin.remove()
      lease.release()
    }
  }),
)

it.live('nested popup trigger Escape closes only the popup and preserves Dialog focus', () =>
  Effect.gen(function* nestedDialog() {
    const container = document.createElement('div')
    container.id = 'nested-popup-dialog'
    document.body.append(container)

    const dialog = Runtime.embed(
      Program.make({
        block: DialogFixture,
        layer: DialogFixtureNestedImplementationLayer,
        container,
      }).provide(DialogResourcesLayer(document)),
    )

    let popup: ReturnType<typeof mount> | undefined

    try {
      yield* eventually(() => {
        expect(document.querySelector('#primary-dialog-trigger')).not.toBeNull()
      })
      element('primary-dialog-trigger').click()
      yield* eventually(() => {
        expect(element('primary-dialog').dataset.dialogPhase).toBe('Open')
      })

      const panel = element('primary-dialog').querySelector<HTMLElement>(
        '[data-fluid-dialog-panel]',
      )

      if (panel === null) {
        throw new Error('Missing dialog panel')
      }

      popup = mount('nested', panel)
      yield* open('nested')
      expect(document.activeElement?.id).toBe('nested-anchor')
      element('nested-anchor').dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
      )
      yield* eventually(() => {
        expect(element('nested-popup').dataset.popupOpen).toBe('false')
      })
      finish('nested')
      yield* eventually(() => {
        expect(document.querySelector('#nested-popup')).toBeNull()
      })
      expect(document.activeElement).toBe(element('nested-anchor'))
      expect(element('primary-dialog').dataset.dialogPhase).toBe('Open')
    } finally {
      if (popup !== undefined) {
        yield* popup.dispose()
      }

      yield* Effect.promise(dialog.dispose)
      container.remove()
    }
  }),
)

it.live('separate documents keep independent hosts through real runtime disposal', () =>
  Effect.gen(function* separateDocuments() {
    const iframe = document.createElement('iframe')
    document.body.append(iframe)
    const other = iframe.contentDocument

    if (other === null) {
      throw new Error('Missing second document')
    }

    const first = mount('document-one')
    const second = mount('document-two', other.body)

    try {
      yield* open('document-one')
      yield* open('document-two', other)
      const firstHost = host()
      const otherHost = host(other)
      expect(firstHost).not.toBe(otherHost)
      expect(otherHost?.ownerDocument).toBe(other)
      yield* first.dispose()
      expect(host()).toBeNull()
      expect(host(other)).toBe(otherHost)
      expect(element('document-two-popup', other).isConnected).toBe(true)
      yield* second.dispose()
      expect(host(other)).toBeNull()
    } finally {
      yield* first.dispose()
      yield* second.dispose()
      iframe.remove()
    }
  }),
)

it.live('IME composition suppresses Escape until composition ends, then returns focus', () =>
  Effect.gen(function* preservesCompositionEscapeAdmission() {
    const runtime = mount('composing')
    try {
      yield* open('composing')
      const option = element('composing-option')
      option.focus()
      document.dispatchEvent(new CompositionEvent('compositionstart'))
      const duringComposition = new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        cancelable: true,
      })
      option.dispatchEvent(duringComposition)
      expect(duringComposition.defaultPrevented).toBe(false)
      expect(element('composing-popup').dataset.popupOpen).toBe('true')

      document.dispatchEvent(new CompositionEvent('compositionend'))
      const immediatelyAfter = new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        cancelable: true,
      })
      option.dispatchEvent(immediatelyAfter)
      expect(immediatelyAfter.defaultPrevented).toBe(false)
      yield* Effect.sleep('10 millis')

      const afterComposition = new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        cancelable: true,
      })
      option.dispatchEvent(afterComposition)
      expect(afterComposition.defaultPrevented).toBe(true)
      yield* eventually(() => {
        expect(element('composing-popup').dataset.popupOpen).toBe('false')
      })
      finish('composing')
      yield* eventually(() => {
        expect(document.querySelector('#composing-popup')).toBeNull()
      })
      expect(document.activeElement).toBe(element('composing-anchor'))
    } finally {
      yield* runtime.dispose()
    }
  }),
)

it.live(
  'a replaced anchor receives Escape handling and focus return for the current occurrence',
  () =>
    Effect.gen(function* preservesReboundAnchorFocus() {
      const runtime = mount('rebound')
      try {
        yield* open('rebound')
        const original = element('rebound-anchor')
        const replacement = document.createElement('button')
        replacement.id = original.id
        replacement.textContent = 'Replacement anchor'
        original.replaceWith(replacement)
        yield* eventually(() => {
          expect(
            document.querySelectorAll('[data-popup-focus-guard="rebound-popup"]'),
          ).toHaveLength(4)
        })
        // Mutation observation rebinds the occurrence before the next browser input.
        yield* Effect.sleep('10 millis')
        replacement.focus()
        replacement.dispatchEvent(
          new KeyboardEvent('keydown', {
            key: 'Escape',
            bubbles: true,
            cancelable: true,
          }),
        )
        yield* eventually(() => {
          expect(element('rebound-popup').dataset.popupOpen).toBe('false')
        })
        finish('rebound')
        yield* eventually(() => {
          expect(document.querySelector('#rebound-popup')).toBeNull()
        })
        expect(document.activeElement).toBe(replacement)
      } finally {
        yield* runtime.dispose()
      }
    }),
)
