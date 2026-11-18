/* @license Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud. */
import { Context, Effect, Function, Layer, Queue, Stream } from 'effect'
import { Render } from 'foldkit'
import { createInputMessageQueueNativeLayer } from './input-message-queue-native.js'
import { observeInputMessageNativeEvents } from './input-message-native-events.js'
import { INPUT_MESSAGE_COMMIT_EVENT } from './input-message-commit.js'
import { InputMessageObservation } from './input-message-state.js'
import type { InputMessageResourceObservation } from './input-message-state.js'
import type { InputMessageFileRegistry } from './input-message-file-registry.js'

export { createInputMessageFileRegistry } from './input-message-file-registry.js'

export type { InputMessageFileRegistry } from './input-message-file-registry.js'

export class InputMessageResources extends Context.Service<
  InputMessageResources,
  {
    readonly settleFiles: (batchId: string, accepted: ReadonlyArray<string>) => Effect.Effect<void>
    readonly focus: (id: string, caretEnd: boolean) => Effect.Effect<void>
    readonly observe: (
      element: Element,
      states: Stream.Stream<'Live' | 'Paused'>,
    ) => Stream.Stream<InputMessageResourceObservation>
  }
>()('FluidInputMessageResources') {}

export function createInputMessageLayer(
  document: Document,
  window: Window & typeof globalThis,
  registry: InputMessageFileRegistry,
) {
  return Layer.merge(
    createInputMessageQueueNativeLayer(window),
    Layer.effect(
      InputMessageResources,
      Effect.acquireRelease(
        Effect.sync(() =>
          InputMessageResources.of({
            settleFiles: (batchId, accepted) =>
              Effect.sync(() => {
                registry.settle(batchId, accepted)
              }),
            focus: (id, caretEnd) =>
              Render.afterCommit.pipe(
                Effect.andThen(
                  Effect.callback<undefined>((resume) => {
                    const frame = window.requestAnimationFrame(() => {
                      const textarea = document
                        .querySelector<HTMLElement>(`#${window.CSS.escape(id)}`)
                        ?.querySelector('textarea')

                      textarea?.focus()

                      if (caretEnd && textarea) {
                        textarea.setSelectionRange(textarea.value.length, textarea.value.length)
                      }

                      resume(Effect.sync(Function.constUndefined))
                    })

                    return Effect.sync(() => {
                      window.cancelAnimationFrame(frame)
                    })
                  }),
                ),
              ),
            observe: (element, states) => {
              if (!(element instanceof window.HTMLElement)) {
                return Stream.die(new Error('InputMessage requires a mounted HTML composer'))
              }

              const height = (name: string) => {
                const region = element.querySelector<HTMLElement>(`[data-im-region="${name}"]`)
                const next = region?.parentElement?.scrollHeight ?? region?.offsetHeight ?? 0

                return next > 0 ? next : null
              }

              const pendingBatches = new Set<string>()

              return states.pipe(
                Stream.switchMap((state) =>
                  state === 'Paused'
                    ? Stream.empty
                    : Stream.callback<InputMessageResourceObservation>((queue) => {
                        const ingest = (files: ReadonlyArray<File>) => {
                          let id = ''

                          const batch = registry.stage(files, () => {
                            pendingBatches.delete(id)
                          })

                          id = batch.batchId
                          pendingBatches.add(id)
                          Queue.offerUnsafe(queue, InputMessageObservation.CapturedFiles(batch))
                        }

                        const emit = (observation: InputMessageResourceObservation) => {
                          Queue.offerUnsafe(queue, observation)
                        }

                        return Effect.acquireRelease(
                          Effect.sync(() => {
                            const nativeEvents = observeInputMessageNativeEvents(
                              element,
                              window,
                              emit,
                            )

                            const query = window.matchMedia('(hover: none)')

                            const motionQuery = window.matchMedia(
                              '(prefers-reduced-motion: reduce)',
                            )

                            const sampleMotion = () => {
                              emit(
                                InputMessageObservation.CapturedReducedMotion({
                                  reduced: motionQuery.matches,
                                }),
                              )
                            }

                            motionQuery.addEventListener('change', sampleMotion)
                            sampleMotion()

                            const sampleTouch = () => {
                              emit(
                                InputMessageObservation.CapturedTouch({ isTouch: query.matches }),
                              )
                            }

                            query.addEventListener('change', sampleTouch)
                            sampleTouch()
                            const textarea = element.querySelector('textarea')
                            let lineHeight: number | undefined
                            let width = textarea?.offsetWidth

                            const resizeText = () => {
                              if (!textarea) {
                                return
                              }

                              textarea.style.height = 'auto'

                              if (lineHeight === undefined) {
                                const computed = window.getComputedStyle(textarea).lineHeight

                                const parsed =
                                  computed === ''
                                    ? Number.NaN
                                    : Number(computed.replace(/px$/u, ''))

                                lineHeight = Number.isNaN(parsed) ? 20 : parsed
                              }

                              const min = lineHeight * Number(element.dataset.imMinRows ?? 1)
                              const max = lineHeight * Number(element.dataset.imMaxRows ?? 8)
                              textarea.style.height = `${Math.min(Math.max(textarea.scrollHeight, min), max)}px`
                              textarea.style.overflowY =
                                textarea.scrollHeight > max ? 'auto' : 'hidden'
                            }

                            const measure = () => {
                              emit(
                                InputMessageObservation.CapturedMeasure({
                                  filesHeight: height('files'),
                                  queueHeight: height('queue'),
                                  suggestionsHeight: height('suggestions'),
                                }),
                              )
                            }

                            const resize = new window.ResizeObserver(() => {
                              if (textarea && width !== textarea.offsetWidth) {
                                width = textarea.offsetWidth
                                resizeText()
                              }

                              measure()
                            })

                            if (textarea) {
                              resize.observe(textarea)
                            }

                            for (const region of element.querySelectorAll('[data-im-region]')) {
                              resize.observe(region)
                            }

                            const mutations = new window.MutationObserver(() => {
                              nativeEvents.refresh()

                              for (const region of element.querySelectorAll('[data-im-region]')) {
                                resize.observe(region)
                              }

                              resizeText()
                              measure()
                            })

                            mutations.observe(element, {
                              childList: true,
                              subtree: true,
                              attributes: true,
                              attributeFilter: [
                                'data-im-textarea',
                                'data-im-file-picker',
                                'data-im-stop-pointer',
                              ],
                            })

                            const input = (event: Event) => {
                              if (
                                event.target instanceof window.HTMLInputElement &&
                                event.target.type === 'file' &&
                                event.target.files
                              ) {
                                ingest([...event.target.files])
                                event.target.value = ''
                              }

                              resizeText()
                            }

                            const over = (event: Event) => {
                              if (
                                !(event instanceof window.DragEvent) ||
                                element.dataset.imFilesEnabled !== 'true' ||
                                element.dataset.imDisabled === 'true'
                              ) {
                                return
                              }

                              if (![...(event.dataTransfer?.types ?? [])].includes('Files')) {
                                return
                              }

                              event.preventDefault()

                              if (event.dataTransfer) {
                                event.dataTransfer.dropEffect = 'copy'
                              }

                              emit(InputMessageObservation.CapturedDrag({ over: true }))
                            }

                            const leave = (event: Event) => {
                              if (
                                event instanceof window.DragEvent &&
                                event.relatedTarget instanceof window.Node &&
                                element.contains(event.relatedTarget)
                              ) {
                                return
                              }

                              emit(InputMessageObservation.CapturedDrag({ over: false }))
                            }

                            const drop = (event: Event) => {
                              if (!(event instanceof window.DragEvent)) {
                                return
                              }

                              event.preventDefault()
                              emit(InputMessageObservation.CapturedDrag({ over: false }))

                              if (
                                element.dataset.imFilesEnabled === 'true' &&
                                element.dataset.imDisabled !== 'true'
                              ) {
                                ingest([...(event.dataTransfer?.files ?? [])])
                              }
                            }

                            const down = (event: Event) => {
                              if (
                                !(event instanceof window.MouseEvent) ||
                                element.dataset.imClickToFocus !== 'true' ||
                                element.dataset.imDisabled === 'true'
                              ) {
                                return
                              }

                              if (
                                !(event.target instanceof window.HTMLElement) ||
                                event.target === textarea ||
                                event.target.closest(
                                  'button, a, input, select, textarea, [contenteditable], [role="button"], [data-im-queue]',
                                )
                              ) {
                                return
                              }

                              event.preventDefault()
                              textarea?.focus()
                            }

                            const commit = () => {
                              const accepted = element.dataset.imAcceptedValue

                              if (
                                textarea &&
                                accepted !== undefined &&
                                textarea.value !== accepted
                              ) {
                                textarea.value = accepted
                              }

                              resizeText()
                              measure()
                            }

                            element.addEventListener(INPUT_MESSAGE_COMMIT_EVENT, commit)
                            element.addEventListener('input', input)
                            element.addEventListener('change', input)
                            element.addEventListener('dragover', over)
                            element.addEventListener('dragleave', leave)
                            element.addEventListener('drop', drop)
                            element.addEventListener('mousedown', down)
                            commit()

                            return () => {
                              nativeEvents.dispose()
                              element.removeEventListener(INPUT_MESSAGE_COMMIT_EVENT, commit)
                              query.removeEventListener('change', sampleTouch)
                              motionQuery.removeEventListener('change', sampleMotion)
                              resize.disconnect()
                              mutations.disconnect()
                              element.removeEventListener('input', input)
                              element.removeEventListener('change', input)
                              element.removeEventListener('dragover', over)
                              element.removeEventListener('dragleave', leave)
                              element.removeEventListener('drop', drop)
                              element.removeEventListener('mousedown', down)
                            }
                          }),
                          (release) => Effect.sync(release),
                        ).pipe(Effect.flatMap(() => Effect.never))
                      }),
                ),
                Stream.ensuring(
                  Effect.sync(() => {
                    for (const id of pendingBatches) {
                      registry.settle(id, [])
                    }
                  }),
                ),
              )
            },
          }),
        ),
        () => Effect.sync(registry.dispose),
      ),
    ),
  )
}
