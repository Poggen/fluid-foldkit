// @vitest-environment happy-dom -- document-owned portal ordering and cleanup
import { it } from '@effect/vitest'
import { Effect, Schedule, Stream } from 'effect'
import { expect } from 'vitest'
import { createDialogRuntime } from '../src/dialog-runtime.js'

const host = () => document.querySelector<HTMLElement>('[data-fluid-dialog-portal-root]')

const eventually = (assertion: () => void) =>
  Effect.try(assertion).pipe(Effect.retry({ times: 100, schedule: Schedule.spaced('10 millis') }))

const fixture = (id: string) => {
  const origin = document.createElement('div')
  const wrapper = document.createElement('div')
  wrapper.style.display = 'contents'
  const dialog = document.createElement('dialog')
  dialog.id = id
  dialog.dataset.state = 'closed'
  dialog.dataset.dialogPhase = 'Closed'
  dialog.dataset.dialogModal = 'false'
  dialog.style.position = 'fixed'
  dialog.style.inset = '0'
  const panel = document.createElement('div')
  panel.dataset.fluidDialogPanel = ''
  dialog.append(panel)
  wrapper.append(dialog)
  origin.append(wrapper)
  document.body.append(origin)

  return { origin, wrapper, dialog }
}

it.effect(
  'default portal leases survive explicit retargeting and independent runtime disposal',
  () =>
    Effect.gen(function* portalLeases() {
      const first = fixture('portal-first')
      const second = fixture('portal-second')
      const explicit = document.createElement('div')
      explicit.id = 'portal-explicit'
      document.body.append(explicit)
      let selectedContainer: HTMLElement | null = null
      const firstRuntime = createDialogRuntime(document, { container: () => selectedContainer })
      const secondRuntime = createDialogRuntime(document, {})

      try {
        yield* Effect.scoped(
          Effect.gen(function* firstLease() {
            expect(yield* firstRuntime.mountPortal(first.wrapper, first.dialog.id, '')).toBe(false)
            const shared = host()
            expect(shared?.parentElement).toBe(document.body)
            expect(first.dialog.style.position).toBe('fixed')

            yield* Effect.scoped(
              Effect.gen(function* secondLease() {
                expect(yield* secondRuntime.mountPortal(second.wrapper, second.dialog.id, '')).toBe(
                  false,
                )
                expect(second.wrapper.parentElement).toBe(shared)
                expect(document.querySelectorAll('[data-fluid-dialog-portal-root]')).toHaveLength(1)
                selectedContainer = explicit
                expect(yield* firstRuntime.resolveContainer(first.dialog.id, '')).toBe(true)
                expect(first.wrapper.parentElement).toBe(explicit)
                expect(host()).toBe(shared)
                selectedContainer = null
                expect(yield* firstRuntime.resolveContainer(first.dialog.id, '')).toBe(false)
                expect(first.wrapper.parentElement).toBe(shared)
                expect(yield* secondRuntime.resolveContainer(second.dialog.id, explicit.id)).toBe(
                  true,
                )
                expect(second.wrapper.parentElement).toBe(explicit)
              }),
            )
            expect(second.wrapper.parentElement).toBe(second.origin)
            expect(host()).toBe(shared)
            selectedContainer = explicit
            yield* firstRuntime.resolveContainer(first.dialog.id, '')
            expect(host()).toBeNull()
            selectedContainer = null
            expect(yield* firstRuntime.resolveContainer(first.dialog.id, '')).toBe(false)
            expect(host()).not.toBe(shared)
          }),
        )
        expect(first.wrapper.parentElement).toBe(first.origin)
        expect(host()).toBeNull()
      } finally {
        first.origin.remove()
        second.origin.remove()
        explicit.remove()
      }
    }),
)

it.live('independent runtimes activate inside the shared host without changing body children', () =>
  Effect.gen(function* portalOpeningOrder() {
    const first = fixture('portal-order-first')
    const second = fixture('portal-order-second')
    const firstRuntime = createDialogRuntime(document, {})
    const secondRuntime = createDialogRuntime(document, {})

    try {
      yield* Effect.scoped(
        Effect.gen(function* activePortals() {
          yield* firstRuntime.mountPortal(first.wrapper, first.dialog.id, '')
          yield* secondRuntime.mountPortal(second.wrapper, second.dialog.id, '')
          yield* firstRuntime
            .observeRoot(first.dialog, first.dialog.id)
            .pipe(Stream.runDrain, Effect.forkScoped)
          yield* secondRuntime
            .observeRoot(second.dialog, second.dialog.id)
            .pipe(Stream.runDrain, Effect.forkScoped)
          yield* Effect.sleep('10 millis')
          const bodyChanges: Array<MutationRecord> = []

          const observer = new MutationObserver((records) => {
            bodyChanges.push(...records)
          })

          observer.observe(document.body, { childList: true })

          try {
            first.dialog.dataset.state = 'open'
            first.dialog.dataset.dialogPhase = 'Open'
            yield* eventually(() => {
              expect(host()?.lastElementChild).toBe(first.wrapper)
            })
            second.dialog.dataset.state = 'open'
            second.dialog.dataset.dialogPhase = 'Open'
            yield* eventually(() => {
              expect(host()?.lastElementChild).toBe(second.wrapper)
            })
            expect(first.dialog.style.position).toBe('fixed')
            expect(second.dialog.style.position).toBe('fixed')
            expect([...bodyChanges, ...observer.takeRecords()]).toHaveLength(0)
          } finally {
            observer.disconnect()
          }
        }),
      )
      expect(host()).toBeNull()
      expect(first.wrapper.parentElement).toBe(first.origin)
      expect(second.wrapper.parentElement).toBe(second.origin)
    } finally {
      first.origin.remove()
      second.origin.remove()
    }
  }),
)
