// Derived from Fluid Functionalism 200b4534 and its pinned Radix/Base primitives. MIT.
import { Option } from 'effect'
import { DropdownObservation } from './dropdown-observation.js'
import type { DropdownPanelObservation } from './dropdown-observation.js'
interface PanelKeys {
  readonly element: HTMLElement
  readonly inline: boolean
  readonly owned: (target: EventTarget | null) => boolean
  readonly search: () => HTMLInputElement | undefined
  readonly rows: () => ReadonlyArray<HTMLElement>
  readonly rowFor: (target: EventTarget | null) => HTMLElement | null
  readonly activate: (row: HTMLElement, event: MouseEvent | KeyboardEvent) => void
  readonly generation: () => number
  readonly send: (event: DropdownPanelObservation) => void
  readonly changeSearch: (field: HTMLInputElement, value: string) => void
}
const searchKey = (
  context: PanelKeys,
  event: KeyboardEvent,
  field: HTMLInputElement | undefined,
) => {
  if (field !== undefined && event.target === field) {
    event.stopPropagation()
    if (event.key === 'Enter') {
      event.preventDefault()
    }
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault()
      const enabled = context.rows().filter((row) => row.getAttribute('aria-disabled') !== 'true')
      const target = event.key === 'ArrowUp' ? enabled.at(-1) : enabled[0]
      target?.focus({ preventScroll: true })
    }
    return true
  }
  if (
    field !== undefined &&
    ((event.key.length === 1 && event.key !== ' ') || event.key === 'Backspace')
  ) {
    event.preventDefault()
    event.stopPropagation()
    field.focus({ preventScroll: true })
    context.changeSearch(
      field,
      event.key === 'Backspace' ? field.value.slice(0, -1) : field.value + event.key,
    )
    return true
  }
  return false
}
const rowKey = (context: PanelKeys, event: KeyboardEvent, field: HTMLInputElement | undefined) => {
  const row = context.rowFor(event.target)
  const navigation = [
    'ArrowDown',
    'ArrowUp',
    'Home',
    'End',
    ...(context.inline ? ['ArrowLeft', 'ArrowRight'] : []),
  ]
  if (navigation.includes(event.key)) {
    event.preventDefault()
    context.send(
      DropdownObservation.PressedNavigationKey({
        key: event.key,
        searchId: Option.fromNullishOr(field?.id),
      }),
    )
  } else if (event.key === ' ' && (context.element.dataset.typeaheadQuery ?? '') !== '') {
    event.preventDefault()
    context.send(DropdownObservation.TypedCharacter({ character: ' ' }))
  } else if ((event.key === 'Enter' || event.key === ' ') && row !== null) {
    // The activation callback must be able to veto before this adapter cancels the key default.
    context.activate(row, event)
    event.preventDefault()
  } else if (!context.inline && event.key.length === 1) {
    context.send(DropdownObservation.TypedCharacter({ character: event.key }))
  }
}
export const dropdownPanelKeys =
  (context: PanelKeys) =>
  (event: KeyboardEvent): void => {
    if (
      !context.owned(event.target) ||
      event.defaultPrevented ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.isComposing
    ) {
      return
    }
    if (
      context.element.dataset.sub === 'true' &&
      event.key === (context.element.dataset.direction === 'rtl' ? 'ArrowRight' : 'ArrowLeft')
    ) {
      event.preventDefault()
      context.send(
        DropdownObservation.Dismissed({
          restore: true,
          generation: context.generation(),
          reason: 'left',
        }),
      )
      return
    }
    if (event.key === 'Escape') {
      return
    }
    if (event.key === 'Tab') {
      context.send(
        DropdownObservation.Dismissed({
          restore: false,
          generation: context.generation(),
          reason: 'tab',
        }),
      )
      return
    }
    const field = context.search()
    if (searchKey(context, event, field)) {
      return
    }
    rowKey(context, event, field)
  }
