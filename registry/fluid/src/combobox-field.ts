import { Effect, Queue, Schema, Stream } from 'effect'
import { ChipMeasurement } from './combobox-chips.js'
import { EXIT_COMPLETE_EVENT } from './motion-target.js'
import { defineMessageUnion } from 'foldkit/message'
export const ComboboxFieldEvent = defineMessageUnion({
  RequestedOpen: {},
  Navigated: { key: Schema.Literals(['ArrowDown', 'ArrowUp', 'Home', 'End']) },
  RequestedClose: {},
  RequestedReset: {},
  Activated: { index: Schema.NullOr(Schema.Int) },
  MeasuredChips: {
    height: Schema.Finite,
    width: Schema.Finite,
    chips: Schema.Array(ChipMeasurement),
  },
  ChipExited: { value: Schema.String, generation: Schema.Natural },
  Entered: {},
  Removed: { value: Schema.String },
  Backspaced: { renderedChipsCount: Schema.Natural },
})
export const observeComboboxField = (
  element: Element,
  viewStateChanges: Stream.Stream<'Live' | 'Paused'>,
  _id: string,
) =>
  viewStateChanges.pipe(
    Stream.switchMap((state) =>
      state === 'Live'
        ? Stream.callback<typeof ComboboxFieldEvent.Type>((queue) => {
            const send = (message: typeof ComboboxFieldEvent.Type): void => {
              Queue.offerUnsafe(queue, message)
            }
            return Effect.acquireRelease(
              Effect.sync(() => {
                const document = element.ownerDocument
                const window = document.defaultView
                const input = element.querySelector('input[role=combobox]')
                if (window === null || !(input instanceof window.HTMLInputElement)) {
                  throw new Error('Combobox requires its mounted input')
                }
                let live = true
                const renderedChips = () => [
                  ...element.querySelectorAll<HTMLElement>('[data-combo-chip]'),
                ]
                const chips = () =>
                  renderedChips().filter(
                    (chip) => chip.closest('[data-combo-chip-present=false]') === null,
                  )
                const chipKey = (event: KeyboardEvent, chip: HTMLElement) => {
                  const buttons = chips()
                  const index = buttons.indexOf(chip)
                  if (event.key === 'Backspace' || event.key === 'Delete') {
                    event.preventDefault()
                    send(ComboboxFieldEvent.Removed({ value: chip.dataset.comboChip ?? '' }))
                    input.focus()
                  } else if (event.key === 'ArrowLeft') {
                    event.preventDefault()
                    buttons[Math.max(0, index - 1)]?.focus()
                  } else if (event.key === 'ArrowRight') {
                    event.preventDefault()
                    ;(buttons[index + 1] ?? input).focus()
                  }
                }
                const fieldControlKey = (event: KeyboardEvent) => {
                  const open = input.getAttribute('aria-expanded') === 'true'
                  if (event.key === 'Tab') {
                    if (open) {
                      send(ComboboxFieldEvent.RequestedClose())
                    }
                    return true
                  }
                  if (event.key === 'Escape') {
                    if (open) {
                      event.preventDefault()
                      event.stopPropagation()
                      send(ComboboxFieldEvent.RequestedClose())
                    }
                    return true
                  }
                  if (event.key === 'Backspace' && input.value === '') {
                    send(
                      ComboboxFieldEvent.Backspaced({ renderedChipsCount: renderedChips().length }),
                    )
                    return true
                  }
                  if (event.key === 'ArrowLeft' && input.value === '') {
                    const last = chips().at(-1)
                    if (last) {
                      event.preventDefault()
                      last.focus()
                    }
                    return true
                  }
                  if (event.key === 'Enter' && open) {
                    event.preventDefault()
                    send(ComboboxFieldEvent.Entered())
                    return true
                  }
                  return false
                }
                const fieldNavigationKey = (event: KeyboardEvent) => {
                  const open = input.getAttribute('aria-expanded') === 'true'
                  if (event.altKey || event.ctrlKey || event.metaKey) {
                    return
                  }
                  if (
                    event.key !== 'ArrowDown' &&
                    event.key !== 'ArrowUp' &&
                    event.key !== 'Home' &&
                    event.key !== 'End'
                  ) {
                    return
                  }
                  if (
                    (event.key === 'Home' || event.key === 'End') &&
                    (!open || input.value !== '')
                  ) {
                    return
                  }
                  event.preventDefault()
                  send(ComboboxFieldEvent.Navigated({ key: event.key }))
                }
                const key = (event: Event) => {
                  if (
                    !(event instanceof window.KeyboardEvent) ||
                    event.isComposing ||
                    input.disabled
                  ) {
                    return
                  }
                  const { target } = event
                  const chip =
                    target instanceof window.Element
                      ? target.closest<HTMLElement>('[data-combo-chip]')
                      : null
                  if (chip !== null) {
                    chipKey(event, chip)
                    return
                  }
                  if (target !== input || fieldControlKey(event)) {
                    return
                  }
                  fieldNavigationKey(event)
                }
                const click = (event: Event) => {
                  if (event.target === input && !input.disabled) {
                    send(ComboboxFieldEvent.RequestedOpen())
                  }
                  if (
                    event.target instanceof window.Element &&
                    event.target.closest('[data-combo-toggle],[data-combo-clear],[data-combo-chip]')
                  ) {
                    input.focus({ preventScroll: true })
                  }
                }
                const reset = (event: Event) => {
                  if (event.target === input.form) {
                    queueMicrotask(() => {
                      if (live && !event.defaultPrevented) {
                        send(ComboboxFieldEvent.RequestedReset())
                      }
                    })
                  }
                }
                const pointer = (event: Event) => {
                  if (
                    event.target instanceof window.Element &&
                    event.target.closest('[data-combo-clear],[data-combo-toggle],[data-combo-chip]')
                  ) {
                    event.preventDefault()
                  }
                }
                const activeChanged = new window.MutationObserver(() => {
                  const active = document.querySelector<HTMLElement>(
                    `[id="${CSS.escape(input.getAttribute('aria-activedescendant') ?? '')}"]`,
                  )
                  active?.scrollIntoView({ block: 'nearest' })
                })
                activeChanged.observe(input, {
                  attributes: true,
                  attributeFilter: ['aria-activedescendant'],
                })
                const chipRows = element.querySelector<HTMLElement>('[data-combo-chip-rows]')
                const field = element.querySelector<HTMLElement>('[data-combo-field]')
                let measured = ''
                const measure = () => {
                  if (chipRows === null || field === null || chipRows.offsetHeight <= 0) {
                    return
                  }
                  const measurements = [
                    ...chipRows.querySelectorAll<HTMLElement>('[data-combo-chip-motion]'),
                  ].flatMap((chip) => {
                    if (chip.dataset.comboChipPresent !== 'true') {
                      return []
                    }
                    const style = window.getComputedStyle(chip)
                    return [
                      {
                        value: chip.dataset.comboChipMotion ?? '',
                        left: chip.offsetLeft,
                        top: chip.offsetTop,
                        // Pop-layout preserves fractional CSS sizes; rounded offsets create a scale correction.
                        // oxlint-disable-next-line unicorn/prefer-number-coercion -- Source measures computed CSS pixel strings; Number rejects their px suffix.
                        width: Number.parseFloat(style.width),
                        // oxlint-disable-next-line unicorn/prefer-number-coercion -- Source measures computed CSS pixel strings; Number rejects their px suffix.
                        height: Number.parseFloat(style.height),
                      },
                    ]
                  })
                  const height = chipRows.offsetHeight + Number(field.dataset.comboPadY ?? '0')
                  const width = chipRows.offsetWidth
                  const signature = JSON.stringify({ height, width, chips: measurements })
                  if (signature !== measured) {
                    measured = signature
                    send(ComboboxFieldEvent.MeasuredChips({ height, width, chips: measurements }))
                  }
                }
                const resize = new window.ResizeObserver(measure)
                if (chipRows !== null) {
                  resize.observe(chipRows)
                }
                const mutations = new window.MutationObserver(measure)
                if (chipRows !== null) {
                  mutations.observe(chipRows, {
                    childList: true,
                    subtree: true,
                    characterData: true,
                  })
                }
                document.fonts.addEventListener('loadingdone', measure)
                measure()
                const completed = (event: Event) => {
                  if (!(event.target instanceof window.HTMLElement)) {
                    return
                  }
                  const chip = event.target
                  const value = chip.dataset.comboChipMotion
                  const generation = Number(chip.dataset.comboChipGeneration)
                  if (
                    value !== undefined &&
                    chip.dataset.comboChipPresent === 'false' &&
                    Number.isSafeInteger(generation) &&
                    generation >= 0
                  ) {
                    send(ComboboxFieldEvent.ChipExited({ value, generation }))
                  }
                }
                element.addEventListener(EXIT_COMPLETE_EVENT, completed, true)
                element.addEventListener('keydown', key)
                element.addEventListener('click', click)
                element.addEventListener('pointerdown', pointer)
                document.addEventListener('reset', reset, true)
                return () => {
                  live = false
                  activeChanged.disconnect()
                  resize.disconnect()
                  mutations.disconnect()
                  document.fonts.removeEventListener('loadingdone', measure)
                  element.removeEventListener(EXIT_COMPLETE_EVENT, completed, true)
                  element.removeEventListener('keydown', key)
                  element.removeEventListener('click', click)
                  element.removeEventListener('pointerdown', pointer)
                  document.removeEventListener('reset', reset, true)
                }
              }),
              (release) => Effect.sync(release),
            )
          })
        : Stream.never,
    ),
  )
