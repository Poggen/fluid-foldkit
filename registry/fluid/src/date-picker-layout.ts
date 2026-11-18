import { constVoid } from 'effect/Function'
import { Effect, Queue, Stream } from 'effect'
import { DatePickerBlock, Message } from './date-picker-definition.js'

export const LayoutResource = DatePickerBlock.makeMountStream('SegmentsLayout', {
  messages: [Message.RowsMeasured],
  *handler() {
    return ({ element: anchor, viewStateChanges }) =>
      viewStateChanges.pipe(
        Stream.switchMap((state) =>
          state === 'Live'
            ? Stream.callback<typeof Message.RowsMeasured.Type>((queue) =>
                Effect.acquireRelease(
                  Effect.sync(() => {
                    const element = anchor.parentElement
                    const window = anchor.ownerDocument.defaultView
                    const parent = element?.parentElement

                    if (!window || !element || !parent) {
                      return constVoid
                    }

                    let oneRowWidth = 0

                    const measure = () => {
                      const timed = (element.dataset.timed ?? null) === 'true'

                      if (!timed) {
                        Queue.offerUnsafe(queue, Message.RowsMeasured({ twoRows: false }))

                        return
                      }

                      if (!(element.dataset.twoRows !== undefined)) {
                        oneRowWidth =
                          element.scrollWidth + element.offsetWidth - element.clientWidth
                      }

                      const style = window.getComputedStyle(parent)

                      const room =
                        parent.clientWidth -
                        Number(style.paddingLeft.replace(/px$/u, '')) -
                        Number(style.paddingRight.replace(/px$/u, ''))

                      Queue.offerUnsafe(
                        queue,
                        Message.RowsMeasured({ twoRows: oneRowWidth > room + 0.5 }),
                      )
                    }

                    measure()

                    const resize =
                      window.ResizeObserver === undefined
                        ? null
                        : new window.ResizeObserver(measure)

                    resize?.observe(parent)
                    resize?.observe(element)
                    const attributes = new window.MutationObserver(measure)
                    attributes.observe(element, {
                      attributes: true,
                      attributeFilter: ['data-timed'],
                    })

                    return () => {
                      resize?.disconnect()
                      attributes.disconnect()
                    }
                  }),
                  (release) => Effect.sync(release),
                ).pipe(Effect.flatMap(() => Effect.never)),
              )
            : Stream.never,
        ),
      )
  },
})

export const PresetFocusResource = DatePickerBlock.makeMountStream('PresetFocus', {
  messages: [Message.PresetFocused],
  *handler() {
    return ({ element: anchor, viewStateChanges }) =>
      viewStateChanges.pipe(
        Stream.switchMap((state) =>
          state === 'Live'
            ? Stream.callback<typeof Message.PresetFocused.Type>((queue) =>
                Effect.acquireRelease(
                  Effect.sync(() => {
                    const element = anchor.firstElementChild
                    const window = anchor.ownerDocument.defaultView

                    if (!window || !(element instanceof window.HTMLElement)) {
                      return constVoid
                    }

                    const focus = (event: FocusEvent) => {
                      if (!(event.target instanceof window.HTMLElement)) {
                        return
                      }

                      const index = Number(event.target.dataset.presetIndex ?? null)

                      if (!Number.isNaN(index)) {
                        Queue.offerUnsafe(queue, Message.PresetFocused({ index }))
                      }
                    }

                    const blur = (event: FocusEvent) => {
                      if (
                        !(event.relatedTarget instanceof window.Node) ||
                        !element.contains(event.relatedTarget)
                      ) {
                        Queue.offerUnsafe(queue, Message.PresetFocused({ index: null }))
                      }
                    }

                    element.addEventListener('focusin', focus)
                    element.addEventListener('focusout', blur)

                    return () => {
                      element.removeEventListener('focusin', focus)
                      element.removeEventListener('focusout', blur)
                    }
                  }),
                  (release) => Effect.sync(release),
                ).pipe(Effect.flatMap(() => Effect.never)),
              )
            : Stream.never,
        ),
      )
  },
})
