import { Effect, Queue, Stream } from 'effect'
import { ApplicationBlock, Message } from './application-contract'

export const attachGalleryLayout = (element: Element, onRefreshed: () => void) => {
  const document = element.ownerDocument
  const window = document.defaultView
  if (!window) return () => {}

  let frame = 0
  let disposed = false
  let width = 0
  let height = 0
  let viewportWidth = window.innerWidth
  let viewportHeight = window.innerHeight
  const refresh = () => {
    if (disposed) return
    window.cancelAnimationFrame(frame)
    element.setAttribute('data-gallery-measuring', '')
    frame = window.requestAnimationFrame(() => {
      frame = window.requestAnimationFrame(() => {
        frame = 0
        if (!disposed) {
          element.removeAttribute('data-gallery-measuring')
          onRefreshed()
        }
      })
    })
  }
  const resize = new window.ResizeObserver((entries) => {
    const entry = entries.find(({ target }) => target === element)
    if (!entry || (entry.contentRect.width === width && entry.contentRect.height === height)) return
    width = entry.contentRect.width
    height = entry.contentRect.height
    refresh()
  })
  const viewportResize = () => {
    if (viewportWidth === window.innerWidth && viewportHeight === window.innerHeight) return
    viewportWidth = window.innerWidth
    viewportHeight = window.innerHeight
    refresh()
  }
  const presentation = new window.MutationObserver(refresh)
  presentation.observe(element, {
    attributes: true,
    attributeFilter: ['data-gallery-layout', 'data-gallery-presentation'],
  })
  resize.observe(element)
  window.addEventListener('resize', viewportResize)
  document.fonts?.addEventListener('loadingdone', refresh)
  refresh()

  return () => {
    disposed = true
    window.cancelAnimationFrame(frame)
    resize.disconnect()
    presentation.disconnect()
    window.removeEventListener('resize', viewportResize)
    document.fonts?.removeEventListener('loadingdone', refresh)
    element.removeAttribute('data-gallery-measuring')
  }
}

export const ObserveGalleryLayout = ApplicationBlock.makeMountStream('ObserveGalleryLayout', {
  messages: [Message.RefreshedGalleryLayout],
  *handler() {
    return ({ element, viewStateChanges }) =>
      viewStateChanges.pipe(
        Stream.switchMap((state) =>
          state === 'Live'
            ? Stream.callback<typeof Message.RefreshedGalleryLayout.Type>((queue) =>
                Effect.acquireRelease(
                  Effect.sync(() =>
                    attachGalleryLayout(element, () =>
                      Queue.offerUnsafe(queue, Message.RefreshedGalleryLayout()),
                    ),
                  ),
                  (release) => Effect.sync(release),
                ).pipe(Effect.flatMap(() => Effect.never)),
              )
            : Stream.never,
        ),
      )
  },
})
