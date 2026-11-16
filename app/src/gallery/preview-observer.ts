import { Effect, Queue, Stream } from 'effect'
import { Message } from './definition'
import { isPreviewHref } from './admission'

export const observePreviews = (element: Element, admissionRevision: number) =>
  Stream.callback<typeof Message.ObservedPreviews.Type>((queue) =>
    Effect.acquireRelease(
      Effect.sync(() => {
        const view = element.ownerDocument.defaultView
        if (!view) throw new Error('Preview admission requires a document')
        const cardsByStage = new Map<Element, Element>()
        for (const card of element.querySelectorAll('[data-preview-href][data-deferred="true"]')) {
          const stage = card.querySelector('.preview-stage > .preview-content')
          if (stage === null) throw new Error('Preview admission requires an inner stage')
          cardsByStage.set(stage, card)
        }
        const intersection = new view.IntersectionObserver(
          (entries) => {
            const hrefs = entries
              .filter((entry) => entry.isIntersecting)
              .flatMap((entry) => {
                intersection.unobserve(entry.target)
                const href = cardsByStage.get(entry.target)?.getAttribute('data-preview-href')
                return href !== undefined && href !== null && isPreviewHref(href) ? [href] : []
              })
            if (hrefs.length)
              Queue.offerUnsafe(queue, Message.ObservedPreviews({ hrefs, admissionRevision }))
          },
          { rootMargin: '1200px 0px' },
        )
        for (const stage of cardsByStage.keys()) intersection.observe(stage)
        return () => {
          intersection.disconnect()
          cardsByStage.clear()
        }
      }),
      (release) => Effect.sync(release),
    ).pipe(Effect.flatMap(() => Effect.never)),
  )
