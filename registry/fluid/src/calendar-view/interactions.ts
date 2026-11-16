import { Observation } from './state.js'

export function calendarInteractions(
  element: HTMLElement,
  window: Window & typeof globalThis,
  emit: (observation: Observation) => void,
) {
  let keyboard = element.dataset.calendarKeyboardTrigger === 'true'
  let autoFocusPending = element.dataset.calendarAutoFocus === 'true'

  const keydown = (event: Event) => {
    if (
      event instanceof window.KeyboardEvent &&
      [
        'ArrowLeft',
        'ArrowRight',
        'ArrowUp',
        'ArrowDown',
        'Home',
        'End',
        'PageUp',
        'PageDown',
        'Tab',
      ].includes(event.key)
    ) {
      keyboard = true
    }
  }

  const mousedown = (event: Event) => {
    keyboard = false

    if (event instanceof window.MouseEvent && event.button === 0) {
      emit(Observation.cases.Pressed.make({ value: true }))
    }
  }

  const mouseup = () => {
    emit(Observation.cases.Pressed.make({ value: false }))
  }

  const move = (event: Event) => {
    const { target } = event

    if (!(target instanceof window.Element)) {
      return
    }
    const nav = target.closest<HTMLElement>('[data-calendar-nav]')
    const group = nav?.closest<HTMLElement>('[data-calendar-nav-group]')
    emit(
      Observation.cases.NavActive.make({
        key:
          nav !== null &&
          nav.getAttribute('aria-disabled') !== 'true' &&
          group !== null &&
          group !== undefined
            ? `${group.dataset.calendarNavGroup ?? null}:${nav.dataset.calendarNav ?? null}`
            : null,
      }),
    )
    const button = target.closest<HTMLElement>('[data-calendar-index]')
    const inert = target.closest('[data-calendar-inert]') !== null

    const ordinal = button === null || inert ? null : Number(button.dataset.calendarOrdinal ?? null)

    emit(
      Observation.cases.Active.make({
        ordinal: ordinal !== null && Number.isInteger(ordinal) ? ordinal : null,
        keyboard: false,
      }),
    )
  }

  const leave = () => {
    emit(Observation.cases.Active.make({ ordinal: null, keyboard: false }))
    emit(Observation.cases.NavActive.make({ key: null }))
  }

  const focus = (event: Event) => {
    const { target } = event

    if (!(target instanceof window.HTMLElement)) {
      return
    }
    const nav = target.closest<HTMLElement>('[data-calendar-nav]')
    const group = nav?.closest<HTMLElement>('[data-calendar-nav-group]')
    emit(
      Observation.cases.NavActive.make({
        key:
          nav !== null && target.matches(':focus-visible') && group !== null && group !== undefined
            ? `${group.dataset.calendarNavGroup ?? null}:${nav.dataset.calendarNav ?? null}`
            : null,
      }),
    )
    const button = target.closest<HTMLElement>('[data-calendar-index]')

    if (button === null) {
      return
    }
    const ordinal = Number(button.dataset.calendarOrdinal ?? null)
    const fromScript = autoFocusPending
    autoFocusPending = false

    if (Number.isInteger(ordinal)) {
      emit(
        Observation.cases.Active.make({
          ordinal,
          keyboard: keyboard || (!fromScript && target.matches(':focus-visible')),
        }),
      )
    }
  }

  const blur = (event: Event) => {
    if (
      event instanceof window.FocusEvent &&
      event.relatedTarget instanceof window.Node &&
      element.contains(event.relatedTarget)
    ) {
      return
    }
    leave()
  }

  return { keydown, mousedown, mouseup, move, leave, focus, blur }
}
