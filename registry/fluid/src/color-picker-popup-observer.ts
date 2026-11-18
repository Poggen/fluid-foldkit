import { anchorSetup } from '@foldkit/ui/anchor'
import { Effect, Queue, Schema, Stream } from 'effect'
import { defineMessageUnion } from 'foldkit/message'
import { EXIT_COMPLETE_EVENT } from './motion.js'

export const ColorPopupObservation = defineMessageUnion({
  Dismissed: { restore: Schema.Boolean },
  PressedKey: { key: Schema.String },
  FocusedItem: { index: Schema.Int, visible: Schema.Boolean },
  PointerArrived: {},
  CompletedExit: { generation: Schema.Natural },
})

export const ColorPopupPositionArgs = Schema.Struct({
  id: Schema.String,
  generation: Schema.Natural,
  portalContainerId: Schema.String,
  initialOpen: Schema.Boolean,
  kind: Schema.Literals(['menu', 'popover']),
  openingIndex: Schema.Int,
})

type PositionInput = typeof ColorPopupPositionArgs.Type & {
  readonly element: Element
  readonly viewStateChanges: Stream.Stream<'Live' | 'Paused'>
}

export const observeColorPopup = ({
  element,
  id,
  generation,
  portalContainerId,
  initialOpen,
  kind,
  openingIndex,
  viewStateChanges,
}: PositionInput) =>
  viewStateChanges.pipe(
    Stream.switchMap((state) =>
      state === 'Live'
        ? Stream.callback<
            | typeof ColorPopupObservation.Dismissed.Type
            | typeof ColorPopupObservation.PressedKey.Type
            | typeof ColorPopupObservation.FocusedItem.Type
            | typeof ColorPopupObservation.PointerArrived.Type
            | typeof ColorPopupObservation.CompletedExit.Type
          >((queue) => {
            const arrived = () => {
              Queue.offerUnsafe(queue, ColorPopupObservation.PointerArrived())
            }

            const complete = () => {
              Queue.offerUnsafe(queue, ColorPopupObservation.CompletedExit({ generation }))
            }

            return Effect.acquireRelease(
              Effect.sync(() => {
                if (!(element instanceof HTMLElement)) {
                  throw new Error('Color popup requires HTMLElement')
                }

                const document = element.ownerDocument

                const portal =
                  portalContainerId === ''
                    ? null
                    : document.querySelector(`#${CSS.escape(portalContainerId)}`)

                const originalParent = element.parentNode
                const sibling = element.nextSibling

                if (portal !== null) {
                  portal.append(element)
                }

                const resolvedSide = new MutationObserver(() => {
                  const side = element.dataset.placement

                  if (side !== undefined && side !== '') {
                    element.dataset.side = side
                  }
                })

                resolvedSide.observe(element, {
                  attributes: true,
                  attributeFilter: ['data-placement'],
                })

                const menuFocusSelector =
                  openingIndex < 0 ? '[role=menu]' : `[data-color-format-index="${openingIndex}"]`

                const focusSelector =
                  kind === 'popover' ? `#${CSS.escape(id)} [data-color-square]` : menuFocusSelector

                const disposeAnchor = anchorSetup(element, {
                  buttonId: `${id}-trigger`,
                  anchor: { placement: 'bottom-start', gap: 6, portal: portal === null },
                  interceptTab: false,
                  focusAfterPosition: !initialOpen,
                  focusSelector,
                })

                const outside = (event: PointerEvent) => {
                  const trigger = document.querySelector(`#${CSS.escape(`${id}-trigger`)}`)

                  if (
                    event.target instanceof Node &&
                    !element.contains(event.target) &&
                    trigger?.contains(event.target) !== true
                  ) {
                    Queue.offerUnsafe(queue, ColorPopupObservation.Dismissed({ restore: false }))
                  }
                }

                let retainedFocus = false

                const ownsFocus = (target: Element) => {
                  const trigger = document.querySelector(`#${CSS.escape(`${id}-trigger`)}`)

                  if (target === trigger) {
                    return true
                  }

                  return (
                    element.contains(target) &&
                    target.closest('[data-color-popup]') === element &&
                    !(
                      target.getAttribute('aria-expanded') === 'true' &&
                      target.hasAttribute('aria-haspopup')
                    )
                  )
                }

                const focus = (event: FocusEvent) => {
                  if (!(event.target instanceof Element)) {
                    return
                  }

                  const trigger = document.querySelector(`#${CSS.escape(`${id}-trigger`)}`)
                  const inside =
                    element.contains(event.target) || trigger?.contains(event.target) === true

                  retainedFocus = ownsFocus(event.target)

                  if (!inside) {
                    Queue.offerUnsafe(queue, ColorPopupObservation.Dismissed({ restore: false }))
                  }

                  const row = event.target.closest<HTMLElement>('[data-color-format-index]')

                  if (row !== null && ownsFocus(event.target)) {
                    Queue.offerUnsafe(
                      queue,
                      ColorPopupObservation.FocusedItem({
                        index: Number(row.dataset.colorFormatIndex),
                        visible: event.target.matches(':focus-visible'),
                      }),
                    )
                  }
                }

                const key = (event: KeyboardEvent) => {
                  const active = document.activeElement

                  if (
                    event.key === 'Escape' &&
                    ((active !== null && ownsFocus(active)) ||
                      (retainedFocus &&
                        (active === document.body || active === document.documentElement)))
                  ) {
                    event.stopPropagation()
                    event.preventDefault()
                    Queue.offerUnsafe(queue, ColorPopupObservation.Dismissed({ restore: true }))
                  } else if (
                    kind === 'menu' &&
                    element.contains(document.activeElement) &&
                    (['ArrowUp', 'ArrowDown', 'Home', 'End', 'Enter', ' '].includes(event.key) ||
                      event.key.length === 1)
                  ) {
                    event.preventDefault()
                    Queue.offerUnsafe(queue, ColorPopupObservation.PressedKey({ key: event.key }))
                  } else if (kind === 'menu' && event.key === 'Tab') {
                    Queue.offerUnsafe(queue, ColorPopupObservation.Dismissed({ restore: false }))
                  }
                }

                element.addEventListener('pointerover', arrived)
                document.addEventListener('pointerdown', outside, true)
                document.addEventListener('focusin', focus)
                document.addEventListener('keydown', key)
                element.firstElementChild?.addEventListener(EXIT_COMPLETE_EVENT, complete)

                return () => {
                  disposeAnchor()
                  resolvedSide.disconnect()
                  element.removeEventListener('pointerover', arrived)
                  document.removeEventListener('pointerdown', outside, true)
                  document.removeEventListener('focusin', focus)
                  document.removeEventListener('keydown', key)
                  element.firstElementChild?.removeEventListener(EXIT_COMPLETE_EVENT, complete)

                  if (portal !== null && originalParent !== null) {
                    if (sibling !== null && sibling.parentNode === originalParent) {
                      sibling.before(element)
                    } else {
                      originalParent.append(element)
                    }
                  }
                }
              }),
              (dispose) => Effect.sync(dispose),
            ).pipe(Effect.flatMap(() => Effect.never))
          })
        : Stream.never,
    ),
  )
