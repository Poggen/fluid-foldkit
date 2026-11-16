import { Effect, Queue, Stream } from 'effect'
import { ConfiguredSidebarBlock } from './block'

export const MeasureSidebarCallout = ConfiguredSidebarBlock.makeMountStream(
  'MeasureSidebarCallout',
  {
    messages: [ConfiguredSidebarBlock.Message.MeasuredSidebarCallout],
    *handler() {
      return ({ element, viewStateChanges }) =>
        viewStateChanges.pipe(
          Stream.switchMap((state) =>
            state === 'Live'
              ? Stream.callback<typeof ConfiguredSidebarBlock.Message.MeasuredSidebarCallout.Type>(
                  (queue) =>
                    Effect.acquireRelease(
                      Effect.sync(() => {
                        const window = element.ownerDocument.defaultView
                        if (window === null || !(element instanceof window.HTMLElement))
                          return () => {}
                        let previous = 0
                        const measure = () => {
                          const height = element.offsetHeight
                          if (height > 0 && height !== previous) {
                            previous = height
                            Queue.offerUnsafe(
                              queue,
                              ConfiguredSidebarBlock.Message.MeasuredSidebarCallout({ height }),
                            )
                          }
                        }
                        measure()
                        const observer =
                          typeof window.ResizeObserver === 'function'
                            ? new window.ResizeObserver(measure)
                            : undefined
                        observer?.observe(element)
                        return () => observer?.disconnect()
                      }),
                      (release) => Effect.sync(release),
                    ).pipe(Effect.flatMap(() => Effect.never)),
                )
              : Stream.never,
          ),
        )
    },
  },
)
