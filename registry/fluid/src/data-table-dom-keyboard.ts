import type { DataTableObservedMessage } from './data-table-observation.js'
/* @license Derived from Fluid Functionalism f8014098. MIT, copyright 2026 Micka Touillaud. */
/* @license See NOTICE */
import type { Message } from './data-table-definition.js'

type Constructors = typeof Message
type Emit = (message: DataTableObservedMessage) => void

export const observeDataTableKeyboard: (
  root: Element,
  messages: Constructors,
  emit: Emit,
  startEdit: (cell: HTMLElement) => void,
  focusCell: (cell: HTMLElement) => void,
) => () => void = function observeDataTableKeyboard(
  root: Element,
  messages: Constructors,
  emit: Emit,
  startEdit: (cell: HTMLElement) => void,
  focusCell: (cell: HTMLElement) => void,
) {
  let hovered: HTMLElement | null = null
  let rangeAnchor: string | null = null
  let beforeRange: ReadonlyArray<string> = []
  const owner = root.ownerDocument
  const pointer = (event: Event) => {
    hovered =
      event.target instanceof Element
        ? event.target.closest<HTMLElement>('[data-grid-body-row]')
        : null
  }
  const leave = () => {
    hovered = null
  }
  const selectRow = (rowId: string) =>
    root.querySelectorAll<HTMLElement>('[data-grid-action="select"]').forEach((button) => {
      if (button.dataset.gridRow === rowId) button.click()
    })
  const keydown = (event: Event) => {
    if (
      !(event instanceof KeyboardEvent) ||
      event.defaultPrevented ||
      !(event.target instanceof Element)
    )
      return
    if (root.getAttribute('aria-disabled') === 'true') return
    const target = event.target
    if (
      target.closest('button,a') &&
      !target.closest('[data-grid-cell]') &&
      event.key !== 'ArrowDown' &&
      !event.altKey
    )
      return
    if (target.closest('[data-grid-rich-editor]')) return
    if (target.closest('a') && event.key !== 'F2') return
    if (
      target.matches('input,textarea,select') &&
      !(event.key === 'ArrowDown' && target.matches('input[type=search]'))
    )
      return
    const editor = target.closest('[data-grid-editor]')
    if (editor) return
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
      event.preventDefault()
      emit(event.shiftKey ? messages.RedoRequested() : messages.UndoRequested())
      return
    }
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'a') {
      if (root.querySelector('[data-grid-action="select"]')) {
        event.preventDefault()
        emit(messages.AllSelectionChanged({ selected: true }))
      }
      return
    }
    if (event.key === 'Escape') {
      emit(messages.MenuChanged({ menu: null }))
      root.querySelector<HTMLElement>('[data-grid-clear-selection]')?.click()
      return
    }
    const rows = [...root.querySelectorAll<HTMLElement>('[data-grid-body-row]')]
    const cell =
      target.closest<HTMLElement>('[data-grid-cell]') ??
      hovered?.querySelector<HTMLElement>('[data-grid-cell]') ??
      null
    if (!cell) {
      if (
        event.key === 'ArrowDown' &&
        (target.closest('[data-grid-header]') || target.matches('input[type=search]'))
      ) {
        const first = rows[0]?.querySelector<HTMLElement>('[data-grid-cell]')
        if (first) {
          event.preventDefault()
          focusCell(first)
        }
      }
      return
    }
    const row = cell.closest<HTMLElement>('[data-grid-body-row]')
    if (!row) return
    const cells = [...row.querySelectorAll<HTMLElement>('[data-grid-cell]')],
      x = cells.indexOf(cell),
      y = rows.indexOf(row),
      rowId = row.dataset.gridRow ?? ''
    const selected = root.getAttribute('data-grid-selected')?.split('\u001f').filter(Boolean) ?? []
    if (event.altKey && ['ArrowUp', 'ArrowDown'].includes(event.key)) {
      const ids = selected.includes(rowId) ? selected : [rowId]
      const ordered = rows.map((item) => item.dataset.gridRow ?? '')
      const positions = ids.map((id) => ordered.indexOf(id)).filter((index) => index >= 0)
      const targetIndex =
        event.key === 'ArrowUp' ? Math.min(...positions) - 1 : Math.max(...positions) + 1
      const targetId = ordered[targetIndex]
      if (targetId) {
        event.preventDefault()
        emit(
          messages.RowsMoved({
            ids,
            targetId,
            place: event.key === 'ArrowDown' ? 'after' : 'before',
          }),
        )
      }
      return
    }
    if (event.key === 'F2' || (event.key === 'Enter' && cell.dataset.gridEditable === 'true')) {
      event.preventDefault()
      startEdit(cell)
      return
    }
    if (event.key === ' ' || event.key.toLowerCase() === 'x' || event.key === 'Enter') {
      const checkbox = row.querySelector('[data-grid-action="select"]')
      const expansion = row.querySelector<HTMLButtonElement>('button[aria-expanded]')
      if (checkbox) {
        event.preventDefault()
        selectRow(rowId)
      } else if (expansion) {
        event.preventDefault()
        expansion.click()
      }
      return
    }
    const expand = x === 0 ? row.querySelector<HTMLButtonElement>('button[aria-expanded]') : null
    if (event.key === 'ArrowRight' && expand) {
      event.preventDefault()
      if (expand.getAttribute('aria-expanded') === 'false') expand.click()
      else {
        const next = rows[y + 1]?.querySelector<HTMLElement>('[data-grid-cell]')
        if (next) focusCell(next)
      }
      return
    }
    if (event.key === 'ArrowLeft' && x === 0) {
      if (expand?.getAttribute('aria-expanded') === 'true') {
        event.preventDefault()
        expand.click()
        return
      }
      const parent = rows
        .find((item) => item.dataset.gridRow === row.dataset.gridParent)
        ?.querySelector<HTMLElement>('[data-grid-cell]')
      if (parent) {
        event.preventDefault()
        focusCell(parent)
        return
      }
    }
    let destination: HTMLElement | undefined
    if (event.key === 'ArrowLeft') destination = cells[x - 1]
    if (event.key === 'ArrowRight') destination = cells[x + 1]
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown')
      destination =
        rows[y + (event.key === 'ArrowDown' ? 1 : -1)]?.querySelectorAll<HTMLElement>(
          '[data-grid-cell]',
        )[x]
    if (event.key === 'Home' || event.key === 'End')
      destination =
        rows[event.key === 'Home' ? 0 : rows.length - 1]?.querySelectorAll<HTMLElement>(
          '[data-grid-cell]',
        )[x]
    if (event.key === 'Tab') {
      const all = [...root.querySelectorAll<HTMLElement>('[data-grid-cell]')]
      destination = all[all.indexOf(cell) + (event.shiftKey ? -1 : 1)]
    }
    if (destination) {
      event.preventDefault()
      if (
        event.shiftKey &&
        ['ArrowUp', 'ArrowDown'].includes(event.key) &&
        root.querySelector('[data-grid-action="select"]')
      ) {
        if (rangeAnchor === null) {
          rangeAnchor = rowId
          beforeRange = selected
        }
        const anchor = rows.findIndex((item) => item.dataset.gridRow === rangeAnchor)
        const next = rows.findIndex((item) => item === destination.closest('[data-grid-body-row]'))
        const lower = Math.min(anchor, next),
          upper = Math.max(anchor, next)
        rows.forEach((item, index) => {
          const id = item.dataset.gridRow ?? ''
          emit(
            messages.SelectionChanged({
              id,
              selected: (index >= lower && index <= upper) || beforeRange.includes(id),
            }),
          )
        })
      } else {
        rangeAnchor = null
        beforeRange = []
      }
      focusCell(destination)
    }
  }
  const enterRows = (event: Event) => {
    if (
      event instanceof KeyboardEvent &&
      event.key === 'Escape' &&
      event.target instanceof Element &&
      event.target.matches('[data-grid-search-input][data-grid-search-collapsible=true]')
    ) {
      event.preventDefault()
      event.stopImmediatePropagation()
      emit(messages.SearchClosed())
      return
    }

    if (
      !(event instanceof KeyboardEvent) ||
      event.key !== 'ArrowDown' ||
      event.altKey ||
      event.metaKey ||
      event.ctrlKey ||
      !(event.target instanceof Element) ||
      root.getAttribute('aria-disabled') === 'true'
    )
      return
    if (!event.target.closest('[data-grid-header]') && !event.target.matches('input[type=search]'))
      return
    const first = root.querySelector<HTMLElement>('[data-grid-cell]')
    if (first) {
      event.preventDefault()
      event.stopImmediatePropagation()
      focusCell(first)
    }
  }
  const outside = (event: Event) => {
    if (
      hovered &&
      event.target instanceof Element &&
      !root.contains(event.target) &&
      !event.target.closest('input,textarea,select,[contenteditable=true]')
    )
      keydown(event)
  }
  root.addEventListener('keydown', enterRows, true)
  root.addEventListener('keydown', keydown)
  root.addEventListener('pointermove', pointer)
  root.addEventListener('pointerleave', leave)
  owner.addEventListener('keydown', outside)
  return () => {
    root.removeEventListener('keydown', enterRows, true)
    root.removeEventListener('keydown', keydown)
    root.removeEventListener('pointermove', pointer)
    root.removeEventListener('pointerleave', leave)
    owner.removeEventListener('keydown', outside)
  }
}
