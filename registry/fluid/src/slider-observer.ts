import { Effect, Queue, Schema, Stream } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

const Metrics = {
  clientX: Schema.Number,
  left: Schema.Number,
  visualWidth: Schema.Number,
  width: Schema.Number,
  clientWidth: Schema.Number,
  x0: Schema.Number,
  x1: Schema.Number,
  fill: Schema.Number,
  zero: Schema.Number,
}

export const SliderObservation = defineMessageUnion({
  CapturedMount: { width: Schema.Number },
  CapturedResize: { width: Schema.Number },
  CapturedPointer: {
    ...Metrics,
    phase: Schema.Literals(['down', 'move', 'up', 'cancel', 'preview']),
    handle: Schema.Boolean,
    primary: Schema.Boolean,
  },
  CapturedHover: { hovered: Schema.Boolean },
  CapturedFocus: { index: Schema.Int, visible: Schema.Boolean },
  CapturedBlur: { index: Schema.Int },
  CapturedKey: {
    index: Schema.Int,
    key: Schema.String,
    shift: Schema.Boolean,
    alt: Schema.Boolean,
    ctrl: Schema.Boolean,
    meta: Schema.Boolean,
  },
  StartedEdit: { index: Schema.Int },
  EditedDraft: { value: Schema.String },
  CommittedEdit: {},
  CancelledEdit: {},
})

export function observeSlider(element: Element, changes: Stream.Stream<'Live' | 'Paused'>) {
  return changes.pipe(
    Stream.switchMap((state) =>
      state === 'Live'
        ? Stream.callback<typeof SliderObservation.Type>((queue) =>
            Effect.acquireRelease(
              Effect.sync(() => {
                if (!(element instanceof HTMLElement)) {
                  throw new Error('Slider root must be HTMLElement')
                }

                const track = element.querySelector<HTMLElement>('[data-slider-track]')

                if (!track) {
                  throw new Error('Slider requires measured track')
                }

                const emit = (message: typeof SliderObservation.Type) =>
                  Queue.offerUnsafe(queue, message)

                const x = (index: number) => {
                  const node = element.querySelector<HTMLElement>(`[data-slider-thumb="${index}"]`)
                  const transform = node ? getComputedStyle(node).transform : 'none'

                  return transform === 'none' ? 0 : new DOMMatrix(transform).m41
                }

                const metrics = (event: MouseEvent) => {
                  const rect = track.getBoundingClientRect()

                  return {
                    clientX: event.clientX,
                    left: rect.left,
                    visualWidth: rect.width,
                    width: track.offsetWidth,
                    clientWidth: track.clientWidth,
                    x0: x(0),
                    x1: x(1),
                    fill: parseFloat(element.style.getPropertyValue('--slider-fill-percent')) || 0,
                    zero: parseFloat(element.style.getPropertyValue('--slider-zero-offset')) || 0,
                  }
                }

                const pointer =
                  (phase: 'down' | 'move' | 'up' | 'cancel') => (event: PointerEvent) => {
                    const target = event.target

                    if (
                      !(target instanceof Element) ||
                      !target.closest('[data-slider-track], [data-slider-hit]')
                    ) {
                      return
                    }

                    if (phase === 'down') {
                      if (event.pointerType === 'mouse' && event.button !== 0) {
                        return
                      }

                      if (element.getAttribute('aria-disabled') === 'true') {
                        return
                      }

                      event.preventDefault()
                      event.stopPropagation()

                      if (event.target instanceof HTMLElement) {
                        event.target.setPointerCapture(event.pointerId)
                      }
                    }

                    emit(
                      SliderObservation.CapturedPointer({
                        ...metrics(event),
                        phase,
                        handle: target.closest('[data-slider-handle]') !== null,
                        primary: event.pointerType !== 'mouse' || event.button === 0,
                      }),
                    )
                  }

                const down = pointer('down'),
                  move = pointer('move'),
                  up = pointer('up'),
                  cancel = pointer('cancel')

                const preview = (event: MouseEvent) =>
                  emit(
                    SliderObservation.CapturedPointer({
                      ...metrics(event),
                      phase: 'preview',
                      handle: false,
                      primary: true,
                    }),
                  )

                const enter = () => emit(SliderObservation.CapturedHover({ hovered: true }))
                const leave = () => emit(SliderObservation.CapturedHover({ hovered: false }))

                const focus = (event: FocusEvent) => {
                  if (!(event.target instanceof HTMLElement)) {
                    return
                  }

                  const index = event.target.getAttribute('data-slider-keyboard')

                  if (index !== null) {
                    emit(
                      SliderObservation.CapturedFocus({
                        index: Number(index),
                        visible: event.target.matches(':focus-visible'),
                      }),
                    )
                  }
                }

                const blur = (event: FocusEvent) => {
                  if (!(event.target instanceof HTMLElement)) {
                    return
                  }

                  if (event.target.hasAttribute('data-slider-input')) {
                    emit(SliderObservation.CommittedEdit())
                  }

                  const index = event.target.getAttribute('data-slider-keyboard')

                  if (index !== null) {
                    emit(SliderObservation.CapturedBlur({ index: Number(index) }))
                  }
                }

                const key = (event: KeyboardEvent) => {
                  if (!(event.target instanceof HTMLElement)) {
                    return
                  }

                  if (event.target.hasAttribute('data-slider-input')) {
                    if (event.key === 'Enter' || event.key === 'Escape') {
                      event.preventDefault()
                      emit(
                        event.key === 'Enter'
                          ? SliderObservation.CommittedEdit()
                          : SliderObservation.CancelledEdit(),
                      )
                    }

                    return
                  }

                  const index = event.target.getAttribute('data-slider-keyboard')

                  if (index === null) {
                    return
                  }

                  if (
                    [
                      'ArrowLeft',
                      'ArrowRight',
                      'ArrowUp',
                      'ArrowDown',
                      'PageUp',
                      'PageDown',
                      'Home',
                      'End',
                    ].includes(event.key)
                  ) {
                    event.preventDefault()
                    emit(
                      SliderObservation.CapturedKey({
                        index: Number(index),
                        key: event.key,
                        shift: event.shiftKey,
                        alt: event.altKey,
                        ctrl: event.ctrlKey,
                        meta: event.metaKey,
                      }),
                    )
                  }
                }

                const click = (event: MouseEvent) => {
                  if (!(event.target instanceof Element)) {
                    return
                  }

                  const edit = event.target.closest('[data-slider-edit]')

                  if (edit) {
                    emit(
                      SliderObservation.StartedEdit({
                        index: Number(edit.getAttribute('data-slider-edit')),
                      }),
                    )
                  }
                }

                const input = (event: Event) => {
                  if (
                    event.target instanceof HTMLInputElement &&
                    event.target.hasAttribute('data-slider-input')
                  ) {
                    emit(SliderObservation.EditedDraft({ value: event.target.value }))
                  }
                }

                const resize = new ResizeObserver(([entry]) => {
                  if (entry) {
                    emit(SliderObservation.CapturedResize({ width: entry.contentRect.width }))
                  }
                })

                resize.observe(track)
                emit(SliderObservation.CapturedMount({ width: track.offsetWidth }))
                element.addEventListener('pointerdown', down)
                element.addEventListener('pointermove', move)
                element.addEventListener('pointerup', up)
                element.addEventListener('pointercancel', cancel)
                track.parentElement?.addEventListener('mouseenter', enter)
                track.parentElement?.addEventListener('mouseleave', leave)
                track.parentElement?.addEventListener('mousemove', preview)
                element.addEventListener('focusin', focus)
                element.addEventListener('focusout', blur)
                element.addEventListener('keydown', key)
                element.addEventListener('click', click)
                element.addEventListener('input', input)

                return () => {
                  resize.disconnect()
                  element.removeEventListener('pointerdown', down)
                  element.removeEventListener('pointermove', move)
                  element.removeEventListener('pointerup', up)
                  element.removeEventListener('pointercancel', cancel)
                  track.parentElement?.removeEventListener('mouseenter', enter)
                  track.parentElement?.removeEventListener('mouseleave', leave)
                  track.parentElement?.removeEventListener('mousemove', preview)
                  element.removeEventListener('focusin', focus)
                  element.removeEventListener('focusout', blur)
                  element.removeEventListener('keydown', key)
                  element.removeEventListener('click', click)
                  element.removeEventListener('input', input)
                }
              }),
              (dispose) => Effect.sync(dispose),
            ).pipe(Effect.flatMap(() => Effect.never)),
          )
        : Stream.never,
    ),
  )
}
