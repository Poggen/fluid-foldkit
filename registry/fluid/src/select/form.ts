/* @license Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud. */
import { Effect, Queue, Stream } from 'effect'
import { SelectNamespace, Message } from './block.js'

export const ObserveForm = SelectNamespace.makeMountStream('ObserveForm', {
  messages: [Message.FormReset],
  *handler() {
    return ({ element, viewStateChanges }) =>
      viewStateChanges.pipe(
        Stream.switchMap((state) =>
          state === 'Live'
            ? Stream.callback<typeof Message.FormReset.Type>((queue) =>
                Effect.acquireRelease(
                  Effect.sync(() => {
                    const field = element.querySelector('select')

                    const document = element.ownerDocument

                    let live = true

                    const reset = (event: Event) => {
                      if (event.target !== field?.form) {
                        return
                      }

                      queueMicrotask(() => {
                        if (live && !event.defaultPrevented) {
                          Queue.offerUnsafe(queue, Message.FormReset())
                        }
                      })
                    }

                    const invalid = (event: Event) => {
                      event.preventDefault()
                      element.querySelector<HTMLElement>('button')?.focus()
                    }

                    document.addEventListener('reset', reset, true)
                    field?.addEventListener('invalid', invalid)

                    return () => {
                      live = false
                      document.removeEventListener('reset', reset, true)
                      field?.removeEventListener('invalid', invalid)
                    }
                  }),
                  (release) => Effect.sync(release),
                ),
              )
            : Stream.never,
        ),
      )
  },
})
