import { constVoid } from 'effect/Function'
import { Effect, Queue, Schema, Stream } from 'effect'
import { TimeFieldAction } from './date-picker-time-state.js'
import { TimeFieldBlock, Message } from './date-picker-time-definition.js'

const acquireList = (element: Element) => {
  const document = element.ownerDocument
  const window = document.defaultView

  if (window === null || !(element instanceof window.HTMLElement)) {
    return constVoid
  }

  let active = true
  let generation = 0
  let list: HTMLElement | null = null
  let releaseList = constVoid

  const resolveList = () => {
    const id = element.dataset.timeListId

    const fieldId = element.querySelector<HTMLElement>('[data-slot="date-picker-time"]')?.dataset
      .datePickerAnchor

    if (
      id === undefined ||
      fieldId === null ||
      fieldId === undefined ||
      id !== `${fieldId}-list` ||
      !element.isConnected
    ) {
      return null
    }

    const candidate = document.querySelector(`#${window.CSS.escape(id)}`)

    return candidate instanceof window.HTMLElement && candidate.getAttribute('role') === 'listbox'
      ? candidate
      : null
  }

  const bind = (targetList: HTMLElement, current: () => boolean) => {
    let frame = 0
    let keyFrame = 0
    let tries = 0
    let open = targetList.dataset.timeOpen === 'true'

    const scroll = (center: boolean) => {
      if (!current()) {
        return false
      }

      const target = targetList.dataset.timeOpenTarget ?? null
      const lit = targetList.querySelector<HTMLElement>('[data-fluid-hover-active]')

      const row = center
        ? (targetList.querySelector<HTMLElement>('[aria-selected="true"]') ??
          (target === null
            ? null
            : targetList.querySelector<HTMLElement>(`[data-fluid-hover-index="${target}"]`)) ??
          lit)
        : lit

      const viewport = targetList.closest<HTMLElement>('[data-slot="scroll-area-viewport"]')

      if (!row || !viewport || viewport.clientHeight === 0) {
        return false
      }

      const top = row.offsetTop
      const bottom = top + row.offsetHeight

      if (center) {
        viewport.scrollTop = top - viewport.clientHeight / 2 + row.offsetHeight / 2
      } else if (top < viewport.scrollTop) {
        viewport.scrollTop = top - 4
      } else if (bottom > viewport.scrollTop + viewport.clientHeight) {
        viewport.scrollTop = bottom - viewport.clientHeight + 4
      }

      return true
    }

    const attempt = () => {
      if (current() && open && !scroll(true) && (tries += 1) <= 30) {
        frame = window.requestAnimationFrame(attempt)
      }
    }

    if (open) {
      frame = window.requestAnimationFrame(attempt)
    }

    const changed = new window.MutationObserver(() => {
      if (!current()) {
        return
      }

      const nextOpen = targetList.dataset.timeOpen === 'true'

      if (nextOpen !== open) {
        open = nextOpen
        window.cancelAnimationFrame(frame)
        tries = 0

        if (open) {
          frame = window.requestAnimationFrame(attempt)
        }
      }

      window.cancelAnimationFrame(keyFrame)

      if (!open) {
        return
      }

      keyFrame = window.requestAnimationFrame(() => {
        scroll(targetList.dataset.timeScrollMode === 'center')
      })
    })

    changed.observe(targetList, {
      attributes: true,
      attributeFilter: ['data-time-scroll', 'data-time-open'],
    })

    const down = (event: Event) => {
      if (current()) {
        event.preventDefault()
      }
    }

    targetList.addEventListener('mousedown', down)

    return () => {
      window.cancelAnimationFrame(frame)
      window.cancelAnimationFrame(keyFrame)
      changed.disconnect()
      targetList.removeEventListener('mousedown', down)
    }
  }

  const reconcile = () => {
    if (!active) {
      return
    }

    const next = resolveList()

    if (next === list) {
      return
    }

    generation += 1
    const occurrence = generation
    releaseList()
    list = next
    releaseList = constVoid

    if (next === null) {
      return
    }

    const current = () =>
      active && generation === occurrence && list === next && resolveList() === next

    releaseList = bind(next, current)
  }

  const references = new window.MutationObserver(reconcile)
  references.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['id', 'role', 'data-time-list-id', 'data-date-picker-anchor'],
  })
  reconcile()

  return () => {
    active = false
    generation += 1
    references.disconnect()
    releaseList()
    list = null
  }
}

export const InputResource = TimeFieldBlock.makeMountStream('TimeInput', {
  args: { role: Schema.Literals(['Input', 'List']) },
  messages: [Message.Requested],
  *handler() {
    return ({ element, viewStateChanges, role }) =>
      role === 'List'
        ? viewStateChanges.pipe(
            Stream.switchMap((state) =>
              state === 'Live'
                ? Stream.fromEffect(
                    Effect.acquireRelease(
                      Effect.sync(() => acquireList(element)),
                      (release) => Effect.sync(release),
                    ).pipe(Effect.flatMap(() => Effect.never)),
                  )
                : Stream.never,
            ),
          )
        : viewStateChanges.pipe(
            Stream.switchMap((state) =>
              state === 'Live'
                ? Stream.callback<typeof Message.Requested.Type>((queue) => {
                    const emit = (action: (typeof Message.Requested.Type)['action']) => {
                      Queue.offerUnsafe(queue, Message.Requested({ action }))
                    }

                    return Effect.acquireRelease(
                      Effect.sync(() => {
                        const window = element.ownerDocument.defaultView
                        const input = element.querySelector('input')

                        if (
                          window === null ||
                          !(element instanceof window.HTMLElement) ||
                          input === null
                        ) {
                          return constVoid
                        }

                        const focus = () => {
                          input.select()
                          emit(TimeFieldAction.cases.Opened.make({}))
                        }

                        const click = (event: MouseEvent) => {
                          input.focus()

                          if (event.target === input) {
                            emit(TimeFieldAction.cases.Opened.make({}))
                          }
                        }

                        const typed = () => {
                          emit(TimeFieldAction.cases.Typed.make({ value: input.value }))
                        }

                        const blur = (event: FocusEvent) => {
                          const listId = input.getAttribute('aria-controls')

                          const list =
                            listId === null
                              ? null
                              : element.ownerDocument.querySelector(`#${window.CSS.escape(listId)}`)

                          emit(
                            TimeFieldAction.cases.Blurred.make({
                              staysInList:
                                event.relatedTarget instanceof window.Node &&
                                list?.contains(event.relatedTarget) === true,
                            }),
                          )
                        }

                        const keydown = (event: KeyboardEvent) => {
                          if (
                            event.key === 'ArrowDown' ||
                            event.key === 'ArrowUp' ||
                            event.key === 'Enter'
                          ) {
                            event.preventDefault()
                          } else if (event.key === 'Escape') {
                            if (
                              (element.dataset.timeOpen ?? null) !== 'true' &&
                              (element.dataset.timeDraft ?? null) !== 'true'
                            ) {
                              return
                            }

                            event.preventDefault()
                            event.stopPropagation()
                          } else {
                            return
                          }

                          emit(TimeFieldAction.cases.KeyDown.make({ key: event.key }))
                        }

                        input.addEventListener('focus', focus)
                        input.addEventListener('input', typed)
                        input.addEventListener('blur', blur)
                        input.addEventListener('keydown', keydown)
                        element.addEventListener('click', click)

                        return () => {
                          input.removeEventListener('focus', focus)
                          input.removeEventListener('input', typed)
                          input.removeEventListener('blur', blur)
                          input.removeEventListener('keydown', keydown)
                          element.removeEventListener('click', click)
                        }
                      }),
                      (release) => Effect.sync(release),
                    ).pipe(Effect.flatMap(() => Effect.never))
                  })
                : Stream.never,
            ),
          )
  },
})
