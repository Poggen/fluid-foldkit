import { Effect, Queue, Schema, Stream } from 'effect'

export const LegendRectangle = Schema.Struct({
  index: Schema.Natural,
  x: Schema.Finite,
  y: Schema.Finite,
  width: Schema.Finite,
  height: Schema.Finite,
})

export const LegendMeasurement = Schema.Struct({
  width: Schema.Finite,
  height: Schema.Finite,
  rows: Schema.Array(LegendRectangle),
})

export function legendRows(element: Element): ReadonlyArray<Element> {
  return [...element.querySelectorAll('[data-bkm-legend-index]')].filter(
    (row) => row.closest('[data-bkm-legend-owner]') === element,
  )
}

function ownFocusIndex(element: Element, target: EventTarget | null): number | null {
  const ElementClass = element.ownerDocument.defaultView?.Element

  if (
    ElementClass === undefined ||
    !(target instanceof ElementClass) ||
    target.closest('[data-bkm-legend-owner]') !== element
  ) {
    return null
  }

  const row = target.closest('[data-bkm-legend-index]')

  if (row === null || row.closest('[data-bkm-legend-owner]') !== element) {
    return null
  }

  const index = Number(row.attributes.getNamedItem('data-bkm-legend-index')?.value ?? null)

  return Schema.is(Schema.Natural)(index) ? index : null
}

/** The Mount owns this observer; view pause, unmount and replacement release it. */
export function observeLegend<MeasurementMessage, FocusMessage>(
  element: Element,
  states: Stream.Stream<'Live' | 'Paused'>,
  measured: (value: typeof LegendMeasurement.Type) => MeasurementMessage,
  focused: (index: number | null) => FocusMessage,
): Stream.Stream<MeasurementMessage | FocusMessage> {
  return states.pipe(
    Stream.switchMap((state) =>
      state === 'Live'
        ? Stream.callback<MeasurementMessage | FocusMessage>((queue) => {
            const measure = () => {
              const root = element.getBoundingClientRect()

              const rows = legendRows(element).map((row) => {
                const rect = row.getBoundingClientRect()

                return {
                  index: Number(
                    row.attributes.getNamedItem('data-bkm-legend-index')?.value ?? null,
                  ),
                  x: rect.x - root.x,
                  y: rect.y - root.y,
                  width: rect.width,
                  height: rect.height,
                }
              })

              Queue.offerUnsafe(queue, measured({ width: root.width, height: root.height, rows }))
            }

            const observeFocus = (target: EventTarget | null) => {
              Queue.offerUnsafe(queue, focused(ownFocusIndex(element, target)))
            }

            const focusIn = (event: Event) => {
              observeFocus(event.target)
            }

            const focusOut = (event: Event) => {
              const FocusEventClass = element.ownerDocument.defaultView?.FocusEvent
              observeFocus(
                FocusEventClass !== undefined && event instanceof FocusEventClass
                  ? event.relatedTarget
                  : null,
              )
            }

            return Effect.acquireRelease(
              Effect.sync(() => {
                const observer = new ResizeObserver(measure)
                const observed = new Set<Element>()

                const synchronize = () => {
                  const current = new Set(legendRows(element))

                  for (const row of observed) {
                    if (!current.has(row)) {
                      observer.unobserve(row)
                      observed.delete(row)
                    }
                  }

                  for (const row of current) {
                    if (!observed.has(row)) {
                      observer.observe(row)
                      observed.add(row)
                    }
                  }

                  measure()
                  observeFocus(element.ownerDocument.activeElement)
                }

                const mutations = new MutationObserver(synchronize)

                const release = () => {
                  element.removeEventListener('focusin', focusIn)
                  element.removeEventListener('focusout', focusOut)
                  mutations.disconnect()
                  observer.disconnect()
                  observed.clear()
                }

                try {
                  element.addEventListener('focusin', focusIn)
                  element.addEventListener('focusout', focusOut)
                  observer.observe(element)
                  mutations.observe(element, { childList: true, subtree: true })
                  synchronize()
                } catch (error) {
                  release()
                  throw error
                }

                return release
              }),
              (release) => Effect.sync(release),
            ).pipe(Effect.flatMap(() => Effect.never))
          })
        : Stream.never,
    ),
  )
}
