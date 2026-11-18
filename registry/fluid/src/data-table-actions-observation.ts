import { Effect, Queue, Stream } from 'effect'
export function observeDataTableActionTargets(input: {
  readonly element: Element
  readonly viewStateChanges: Stream.Stream<'Live' | 'Paused'>
}) {
  return input.viewStateChanges.pipe(
    Stream.switchMap((state) =>
      state === 'Paused'
        ? Stream.never
        : Stream.callback<{ readonly _tag: 'RowTargeted'; readonly id: string }>((queue) =>
            Effect.acquireRelease(
              Effect.sync(() => {
                const target = (event: Event) => {
                  if (
                    event.defaultPrevented ||
                    !(event.target instanceof Element) ||
                    event.target.closest(
                      'input,textarea,select,[contenteditable]:not([contenteditable=false])',
                    )
                  )
                    return
                  if (
                    event instanceof KeyboardEvent &&
                    !(event.key === 'ContextMenu' || (event.key === 'F10' && event.shiftKey))
                  )
                    return
                  if (event.type === 'click' && !event.target.closest('[data-grid-row-action]'))
                    return
                  if (
                    event.type === 'pointerdown' &&
                    event instanceof PointerEvent &&
                    event.pointerType !== 'touch'
                  )
                    return
                  const row = event.target.closest<HTMLElement>('[data-grid-body-row]')
                  if (row?.dataset.gridRow)
                    Queue.offerUnsafe(queue, { _tag: 'RowTargeted', id: row.dataset.gridRow })
                }
                const names = ['contextmenu', 'keydown', 'click', 'pointerdown']
                for (const name of names) input.element.addEventListener(name, target, true)
                return () => {
                  for (const name of names) input.element.removeEventListener(name, target, true)
                }
              }),
              (release) => Effect.sync(release),
            ),
          ),
    ),
  )
}
