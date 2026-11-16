import { Effect, Option, Queue, Schema, Stream } from 'effect'
import { defineMessageUnion } from 'foldkit/message'
import type { AskUserQuestionsEnvironment } from './ask-user-questions-environment.js'

const rowIndex = (target: Element) =>
  Number(target.closest<HTMLElement>('[data-fluid-hover-index]')?.dataset.fluidHoverIndex ?? -1)

export const askObservationFields = {
  CapturedPlatform: { isMac: Schema.Boolean },
  CapturedFocus: { index: Schema.Int, visible: Schema.Boolean },
  CapturedBlur: {},
  CapturedText: { value: Schema.String },
  CapturedClick: { index: Schema.Int, action: Schema.String },
  CapturedKey: {
    key: Schema.String,
    index: Schema.Int,
    text: Schema.Boolean,
    start: Schema.Int,
    end: Schema.Int,
    length: Schema.Int,
    shift: Schema.Boolean,
    alt: Schema.Boolean,
    ctrl: Schema.Boolean,
    meta: Schema.Boolean,
    composing: Schema.Boolean,
    global: Schema.Boolean,
  },
  CapturedMeasure: {
    height: Schema.Number,
    scrollHeight: Schema.Number,
    lineHeight: Schema.Number,
  },
}

export const AskObservation = defineMessageUnion(askObservationFields)

export function observeAsk(
  element: Element,
  changes: Stream.Stream<'Live' | 'Paused'>,
  environment: typeof AskUserQuestionsEnvironment.Service,
) {
  return changes.pipe(
    Stream.switchMap((state) =>
      state === 'Live'
        ? Stream.callback<typeof AskObservation.Type>((queue) =>
            Effect.acquireRelease(
              Effect.sync(() => {
                if (!(element instanceof HTMLElement)) {
                  throw new Error('AskUserQuestions root requires HTMLElement')
                }

                const document = element.ownerDocument
                const { instances } = environment
                instances.add(element)

                const emit = (message: typeof AskObservation.Type) =>
                  Queue.offerUnsafe(queue, message)

                emit(AskObservation.CapturedPlatform({ isMac: /mac/iu.test(environment.platform) }))
                let redirecting = false
                let resizedText: HTMLTextAreaElement | null = null
                let resizeRevision = ''

                const measure = () => {
                  const content = element.querySelector<HTMLElement>('[data-ask-content]')
                  const text = element.querySelector<HTMLTextAreaElement>('textarea')

                  if (text && (text !== resizedText || text.value !== resizeRevision)) {
                    text.style.height = '0px'
                    text.style.height = `${text.scrollHeight}px`
                    resizedText = text
                    resizeRevision = text.value
                  }

                  const lineHeight = text
                    ? Number(getComputedStyle(text).lineHeight.replace(/px$/u, '')) || 18
                    : 18

                  emit(
                    AskObservation.CapturedMeasure({
                      height: content?.offsetHeight ?? 0,
                      scrollHeight: text?.scrollHeight ?? 0,
                      lineHeight,
                    }),
                  )
                }

                const resize = new ResizeObserver(measure)
                const content = element.querySelector('[data-ask-content]')

                if (content) {
                  resize.observe(content)
                }

                const mutations = new MutationObserver(() => {
                  measure()
                })

                mutations.observe(element, { childList: true, subtree: true })
                measure()

                const down = (event: MouseEvent) => {
                  if (!(event.target instanceof Element)) {
                    return
                  }

                  const row = event.target.closest<HTMLElement>('[data-fluid-hover-index]')

                  if (!row || event.target.closest('textarea,input,button,a[href]')) {
                    return
                  }

                  event.preventDefault()
                  redirecting = true

                  try {
                    row.focus()
                  } finally {
                    redirecting = false
                  }
                }

                const focus = (event: FocusEvent) => {
                  if (!(event.target instanceof HTMLElement)) {
                    return
                  }

                  const index = rowIndex(event.target)

                  if (index >= 0) {
                    emit(
                      AskObservation.CapturedFocus({
                        index,
                        visible: !redirecting && event.target.matches(':focus-visible'),
                      }),
                    )
                  }
                }

                const blur = (event: FocusEvent) => {
                  if (
                    !(event.relatedTarget instanceof Node) ||
                    element.querySelector('[data-ask-rows]')?.contains(event.relatedTarget) !== true
                  ) {
                    emit(AskObservation.CapturedBlur())
                  }
                }

                const input = (event: Event) => {
                  if (
                    event.target instanceof Element &&
                    event.target.closest('[data-ask-native-control]') !== null
                  ) {
                    return
                  }

                  if (event.target instanceof HTMLTextAreaElement) {
                    emit(AskObservation.CapturedText({ value: event.target.value }))
                    measure()
                  }
                }

                const click = (event: MouseEvent) => {
                  if (!(event.target instanceof Element)) {
                    return
                  }

                  if (
                    event.target instanceof Element &&
                    event.target.closest('[data-ask-native-control]') !== null
                  ) {
                    return
                  }

                  if (event.target instanceof HTMLTextAreaElement) {
                    event.stopPropagation()

                    return
                  }

                  const action =
                    event.target.closest<HTMLElement>('[data-ask-action]')?.dataset.askAction ?? ''

                  const index = rowIndex(event.target)

                  if (index >= 0 || action !== '') {
                    emit(AskObservation.CapturedClick({ index, action }))
                  }
                }

                const keyMessage = (event: KeyboardEvent, global: boolean) => {
                  const { target } = event

                  if (!(target instanceof HTMLElement)) {
                    return Option.none()
                  }

                  if (target.closest('[data-ask-native-control]') !== null) {
                    return Option.none()
                  }

                  const text =
                    target instanceof HTMLTextAreaElement ||
                    target instanceof HTMLInputElement ||
                    target.isContentEditable

                  return Option.some(
                    AskObservation.CapturedKey({
                      key: event.key,
                      index: rowIndex(target),
                      text,
                      start: target instanceof HTMLTextAreaElement ? target.selectionStart : 0,
                      end: target instanceof HTMLTextAreaElement ? target.selectionEnd : 0,
                      length: target instanceof HTMLTextAreaElement ? target.value.length : 0,
                      shift: event.shiftKey,
                      ctrl: event.ctrlKey,
                      alt: event.altKey,
                      meta: event.metaKey,
                      composing: event.isComposing,
                      global,
                    }),
                  )
                }

                const key = (event: KeyboardEvent) => {
                  const captured = keyMessage(event, false)

                  if (Option.isNone(captured)) {
                    return
                  }

                  const { value: message } = captured

                  const isMod = /mac/iu.test(environment.platform) ? event.metaKey : event.ctrlKey

                  const textNavigation =
                    message.text &&
                    ((event.key === 'ArrowUp' && message.start > 0) ||
                      (event.key === 'ArrowDown' && message.end < message.length))

                  const navigation = [
                    'ArrowUp',
                    'ArrowDown',
                    'Home',
                    'End',
                    'ArrowLeft',
                    'ArrowRight',
                  ].includes(event.key)

                  const submit =
                    event.key === 'Enter' &&
                    (isMod ||
                      (!message.shift &&
                        (!message.text ||
                          element.querySelector('textarea')?.dataset.askPlainSubmit === 'true')))

                  if (
                    (navigation &&
                      !textNavigation &&
                      (!message.text || event.key === 'ArrowUp' || event.key === 'ArrowDown')) ||
                    submit ||
                    (!message.text && event.key === ' ')
                  ) {
                    event.preventDefault()
                    event.stopPropagation()
                  }

                  emit(message)
                }

                const globalKey = (event: KeyboardEvent) => {
                  if (
                    event.metaKey ||
                    event.ctrlKey ||
                    event.altKey ||
                    event.key < '1' ||
                    event.key > '9'
                  ) {
                    return
                  }

                  const { target } = event

                  if (
                    !(target instanceof HTMLElement) ||
                    target.matches('input,textarea') ||
                    target.isContentEditable
                  ) {
                    return
                  }

                  const roots = [...instances]

                  if (!element.contains(target)) {
                    if (roots.some((root) => root !== element && root.contains(target))) {
                      return
                    }

                    const wrapped = roots.filter((root) => target.contains(root))

                    if ((wrapped.length > 0 ? wrapped : roots).at(-1) !== element) {
                      return
                    }
                  }

                  const captured = keyMessage(event, true)

                  if (Option.isSome(captured)) {
                    event.preventDefault()
                    emit(captured.value)
                  }
                }

                element.addEventListener('mousedown', down)
                element.addEventListener('focusin', focus)
                element.addEventListener('focusout', blur)
                element.addEventListener('input', input)
                element.addEventListener('click', click)
                element.addEventListener('keydown', key)
                document.addEventListener('keydown', globalKey)

                return () => {
                  instances.delete(element)
                  resize.disconnect()
                  mutations.disconnect()
                  element.removeEventListener('mousedown', down)
                  element.removeEventListener('focusin', focus)
                  element.removeEventListener('focusout', blur)
                  element.removeEventListener('input', input)
                  element.removeEventListener('click', click)
                  element.removeEventListener('keydown', key)
                  document.removeEventListener('keydown', globalKey)
                }
              }),
              (dispose) => Effect.sync(dispose),
            ).pipe(Effect.flatMap(() => Effect.never)),
          )
        : Stream.never,
    ),
  )
}
