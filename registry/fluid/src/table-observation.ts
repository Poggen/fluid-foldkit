import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

export const TABLE_HIGHLIGHT_EVENT = 'fluid-table-highlight'
export const tableObservationFields = {
  CapturedPointer: {
    x: Schema.Finite,
    y: Schema.Finite,
    index: Schema.NullOr(Schema.Finite),
    entered: Schema.Boolean,
  },
  CapturedHighlight: { index: Schema.Finite },
  CapturedBlur: { pointerInside: Schema.Boolean },
  CapturedRepeat: { repeating: Schema.Boolean },
  CapturedHeadPress: { index: Schema.NullOr(Schema.Finite) },
}
export const TableObservation = defineMessageUnion(tableObservationFields)

export function observeTable(
  element: Element,
  emit: (message: typeof TableObservation.Type) => void,
) {
  const window = element.ownerDocument.defaultView
  if (window === null) throw new Error('Table requires a live document')
  const rowIndex = (target: EventTarget | null) => {
    if (!(target instanceof Element)) return null
    const row = target.closest('[data-fluid-hover-index]')
    if (row === null || !element.contains(row) || row.closest('[data-fluid-table]') !== element)
      return null
    const index = Number(row.getAttribute('data-fluid-hover-index'))
    return Number.isFinite(index) ? index : null
  }
  let pointerPosition: { x: number; y: number } | undefined
  const pointer = (event: Event) => {
    if (!(event instanceof MouseEvent)) return
    pointerPosition = { x: event.clientX, y: event.clientY }
    emit(
      TableObservation.CapturedPointer({
        x: event.clientX,
        y: event.clientY,
        index: event.type === 'mouseleave' ? null : rowIndex(event.target),
        entered: event.type === 'mouseenter',
      }),
    )
  }
  const scroll = () => {
    if (pointerPosition === undefined) return
    const { x, y } = pointerPosition
    emit(
      TableObservation.CapturedPointer({
        x,
        y,
        index: rowIndex(element.ownerDocument.elementFromPoint(x, y)),
        entered: false,
      }),
    )
  }
  const claim = (event: Event) => {
    const index = rowIndex(event.target)
    if (index !== null) emit(TableObservation.CapturedHighlight({ index }))
  }
  const focus = (event: Event) => {
    if (event.target instanceof Element && event.target.matches(':focus-visible')) claim(event)
  }
  const blur = (event: Event) => {
    if (
      !(event instanceof FocusEvent) ||
      (event.relatedTarget instanceof Node && element.contains(event.relatedTarget))
    )
      return
    emit(TableObservation.CapturedBlur({ pointerInside: element.matches(':hover') }))
  }
  const keydown = (event: Event) => {
    if (event instanceof KeyboardEvent && event.repeat && event.key.startsWith('Arrow'))
      emit(TableObservation.CapturedRepeat({ repeating: true }))
  }
  const keyup = () => emit(TableObservation.CapturedRepeat({ repeating: false }))
  const press = (event: Event) => {
    if (
      !(event instanceof PointerEvent) ||
      event.button !== 0 ||
      !(event.target instanceof Element)
    )
      return
    const cell = event.target.closest('th[data-head-hover]')
    if (cell !== null && element.contains(cell)) {
      const root = cell.closest('[data-fluid-hover-root]')
      const index = root?.getAttribute('data-fluid-hover-active-index')
      emit(TableObservation.CapturedHeadPress({ index: index == null ? null : Number(index) }))
    }
  }
  const release = () => emit(TableObservation.CapturedHeadPress({ index: null }))
  const events: ReadonlyArray<readonly [string, (event: Event) => void]> = [
    ['mousemove', pointer],
    ['mouseenter', pointer],
    ['mouseleave', pointer],
    [TABLE_HIGHLIGHT_EVENT, claim],
    ['focusin', focus],
    ['focusout', blur],
    ['keydown', keydown],
    ['keyup', keyup],
    ['pointerdown', press],
  ]
  for (const [name, handler] of events) element.addEventListener(name, handler)
  window.addEventListener('scroll', scroll, true)
  window.addEventListener('pointerup', release)
  window.addEventListener('pointercancel', release)
  return () => {
    for (const [name, handler] of events) element.removeEventListener(name, handler)
    window.removeEventListener('scroll', scroll, true)
    window.removeEventListener('pointerup', release)
    window.removeEventListener('pointercancel', release)
  }
}
