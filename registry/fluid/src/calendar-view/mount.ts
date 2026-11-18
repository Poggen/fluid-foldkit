import { Action } from '../calendar-state.js'
import { listenCalendarKeyboard } from '../calendar-mount.js'
import { Effect, Queue, Schema, Stream } from 'effect'
import { CalendarBlock, Message } from '../calendar-definition.js'
import { EXIT_COMPLETE_EVENT } from '../motion-target.js'
import { Observation } from './state.js'
import { measureCalendar } from './measure.js'
import { calendarInteractions } from './interactions.js'
import { observeCalendarExits } from './exits.js'

export const CalendarVisuals = CalendarBlock.makeMountStream('CalendarVisuals', {
  args: { autoFocus: Schema.Boolean },
  messages: [Message.Mounted, Message.VisualObserved, Message.Requested],
  *handler() {
    return ({ element, autoFocus, viewStateChanges }) => {
      let initializedFocus = false

      return viewStateChanges.pipe(
        Stream.switchMap((state) => {
          if (state !== 'Live') {
            return Stream.never
          }

          const window = element.ownerDocument.defaultView

          if (window === null || !(element instanceof window.HTMLElement)) {
            return Stream.never
          }

          return Stream.callback<
            | typeof Message.Mounted.Type
            | typeof Message.VisualObserved.Type
            | typeof Message.Requested.Type
          >((queue) => {
            const emit = (observation: Observation) => {
              Queue.offerUnsafe(queue, Message.VisualObserved({ observation }))
            }

            return Effect.acquireRelease(
              Effect.sync(() => {
                const interactions = calendarInteractions(element, window, emit)
                const exits = observeCalendarExits(element, window, emit)
                const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
                let frame = 0
                let snapFrame = 0
                let disposed = false
                let lastMeasurement = ''
                let lastGeneration = element.dataset.calendarGeneration ?? null

                const measure = () => {
                  frame = 0

                  if (disposed) {
                    return
                  }

                  const observation = measureCalendar(element, window, reduceMotion.matches)

                  if (observation === null) {
                    return
                  }

                  const encoded = JSON.stringify(observation)

                  if (encoded !== lastMeasurement) {
                    lastMeasurement = encoded
                    emit(observation)
                  }

                  const generation = element.dataset.calendarGeneration ?? null

                  if (generation !== lastGeneration) {
                    lastGeneration = generation
                    window.cancelAnimationFrame(snapFrame)
                    snapFrame = window.requestAnimationFrame(() => {
                      if (!disposed) {
                        emit(Observation.cases.SnapReleased.make({}))
                      }
                    })
                  }

                  exits.scan()
                }

                const schedule = () => {
                  if (frame === 0) {
                    frame = window.requestAnimationFrame(measure)
                  }
                }

                const resize =
                  window.ResizeObserver === undefined ? null : new window.ResizeObserver(schedule)

                resize?.observe(element)

                if (element.parentElement !== null) {
                  resize?.observe(element.parentElement)
                }

                const mutations = new window.MutationObserver(schedule)
                mutations.observe(element, {
                  childList: true,
                  subtree: true,
                  attributes: true,
                  attributeFilter: [
                    'data-calendar-generation',
                    'data-calendar-present',
                    'data-calendar-overlay-present',
                    'data-calendar-overlay-generation',
                    'data-calendar-ghost',
                    'data-calendar-ghost-generation',
                    'data-calendar-committed-end',
                    'data-calendar-committed-end-generation',
                    'data-orientation',
                    'data-calendar-cell-size',
                    'data-calendar-fill',
                  ],
                })
                element.addEventListener('keydown', interactions.keydown, true)
                element.addEventListener('mousedown', interactions.mousedown)
                element.addEventListener('mousemove', interactions.move)
                element.addEventListener('mouseleave', interactions.leave)
                element.addEventListener('focusin', interactions.focus)
                element.addEventListener('focusout', interactions.blur)
                element.addEventListener(EXIT_COMPLETE_EVENT, exits.exited, true)
                window.addEventListener('mouseup', interactions.mouseup)
                window.addEventListener('scroll', schedule, { capture: true, passive: true })
                window.addEventListener('resize', schedule)
                reduceMotion.addEventListener('change', schedule)

                const releaseKeyboard = listenCalendarKeyboard(
                  element,
                  autoFocus && !initializedFocus,
                  () => {
                    Queue.offerUnsafe(
                      queue,
                      Message.Requested({ action: Action.cases.Escaped.make({}) }),
                    )
                  },
                )

                initializedFocus = true
                Queue.offerUnsafe(queue, Message.Mounted())
                measure()

                return () => {
                  disposed = true
                  window.cancelAnimationFrame(frame)
                  window.cancelAnimationFrame(snapFrame)
                  resize?.disconnect()
                  mutations.disconnect()
                  exits.dispose()
                  releaseKeyboard()
                  element.removeEventListener('keydown', interactions.keydown, true)
                  element.removeEventListener('mousedown', interactions.mousedown)
                  element.removeEventListener('mousemove', interactions.move)
                  element.removeEventListener('mouseleave', interactions.leave)
                  element.removeEventListener('focusin', interactions.focus)
                  element.removeEventListener('focusout', interactions.blur)
                  element.removeEventListener(EXIT_COMPLETE_EVENT, exits.exited, true)
                  window.removeEventListener('mouseup', interactions.mouseup)
                  window.removeEventListener('scroll', schedule, true)
                  window.removeEventListener('resize', schedule)
                  reduceMotion.removeEventListener('change', schedule)
                }
              }),
              (release) => Effect.sync(release),
            ).pipe(Effect.flatMap(() => Effect.never))
          })
        }),
      )
    }
  },
})
