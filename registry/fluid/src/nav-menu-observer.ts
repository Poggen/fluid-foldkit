import { Effect, Function, Queue, Stream } from 'effect'
import type * as Mount from 'foldkit/mount'
import { HOVER_HIDDEN_ATTR } from './hover-attributes.js'

export const observeNavMenu: <A>(
  element: Element,
  viewStateChanges: Stream.Stream<Mount.ViewState>,
  focused: (index: number | null, keyboard: boolean) => A,
  popupChanged: (open: boolean) => A,
) => Stream.Stream<A> = function observeNavMenu<A>(
  element: Element,
  viewStateChanges: Stream.Stream<Mount.ViewState>,
  focused: (index: number | null, keyboard: boolean) => A,
  popupChanged: (open: boolean) => A,
) {
  return viewStateChanges.pipe(
    Stream.switchMap((state) =>
      state === 'Live'
        ? Stream.callback<A>((queue) =>
            Effect.acquireRelease(
              Effect.sync(() => {
                const window = element.ownerDocument.defaultView

                if (!window || !(element instanceof window.HTMLElement)) {
                  return Function.constVoid
                }

                let keyboard = false

                const items = () =>
                  [...element.querySelectorAll<HTMLElement>('[data-nav-index]')].filter(
                    (item) =>
                      item.closest('[data-nav-root]') === element &&
                      item.getAttribute('aria-disabled') !== 'true' &&
                      !item.closest('[inert]') &&
                      item.closest(`[${HOVER_HIDDEN_ATTR}]`) === null &&
                      item.getClientRects().length > 0,
                  )

                const current = () =>
                  items().find((item) => item === element.ownerDocument.activeElement)

                const emit = () => {
                  const item = current()
                  Queue.offerUnsafe(
                    queue,
                    focused(item ? Number(item.dataset.navIndex) : null, keyboard),
                  )
                }

                const focus = () => {
                  keyboard = current()?.matches(':focus-visible') ?? false
                  emit()
                }

                const blur = (event: FocusEvent) => {
                  if (
                    !(event.relatedTarget instanceof window.Node) ||
                    !element.contains(event.relatedTarget)
                  ) {
                    Queue.offerUnsafe(queue, focused(null, false))
                  }
                }

                const pointer = () => {
                  keyboard = false
                  emit()
                }

                const key = (event: KeyboardEvent) => {
                  const all = items()

                  if (!(event.target instanceof window.HTMLElement)) {
                    return
                  }

                  const index = all.indexOf(event.target)

                  if (index === -1 || event.altKey || event.metaKey || event.ctrlKey) {
                    return
                  }

                  let next: HTMLElement | undefined

                  switch (event.key) {
                    case 'ArrowDown':
                    case 'ArrowRight': {
                      next = all[(index + 1) % all.length]
                      break
                    }

                    case 'ArrowUp':
                    case 'ArrowLeft': {
                      next = all[(index - 1 + all.length) % all.length]
                      break
                    }

                    case 'Home': {
                      ;[next] = all
                      break
                    }

                    case 'End': {
                      next = all.at(-1)
                      break
                    }

                    default: {
                      return
                    }
                  }

                  event.preventDefault()

                  if (element.dataset.sidebarMenu !== undefined) {
                    event.stopPropagation()
                  }

                  keyboard = true
                  next?.focus()
                  emit()
                }

                const scope = element.closest('[data-slot="sidebar-wrapper"]') ?? element
                let popupOpen = false

                const inspectPopups = () => {
                  const open = !!scope.querySelector(
                    '[data-sidebar="menu-button"][data-state="open"], [data-sidebar="menu-button"][data-popup-open], [data-sidebar="menu-action"][data-state="open"], [data-sidebar="menu-action"][data-popup-open]',
                  )

                  if (open !== popupOpen) {
                    popupOpen = open
                    Queue.offerUnsafe(queue, popupChanged(open))
                  }
                }

                const popups = new window.MutationObserver(inspectPopups)
                popups.observe(scope, {
                  subtree: true,
                  childList: true,
                  attributes: true,
                  attributeFilter: ['data-state', 'data-popup-open'],
                })
                inspectPopups()
                element.addEventListener('focusin', focus)
                element.addEventListener('focusout', blur)
                element.addEventListener('pointerdown', pointer)
                element.addEventListener('keydown', key)

                return () => {
                  popups.disconnect()
                  element.removeEventListener('focusin', focus)
                  element.removeEventListener('focusout', blur)
                  element.removeEventListener('pointerdown', pointer)
                  element.removeEventListener('keydown', key)
                }
              }),
              (release) => Effect.sync(release),
            ).pipe(Effect.flatMap(() => Effect.never)),
          )
        : Stream.never,
    ),
  ) satisfies Stream.Stream<A>
}
