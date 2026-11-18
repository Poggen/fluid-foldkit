import type { DataTableObservedMessage } from './data-table-observation.js'
import { observeDataTablePinnedHighlights } from './data-table-dom-pins.js'
import { observeDataTableKeyboard } from './data-table-dom-keyboard.js'
import { observeDataTableDrag } from './data-table-dom-drag.js'
/* @license Derived from Fluid Functionalism f8014098. MIT, copyright 2026 Micka Touillaud. */
/* @license See NOTICE */
import type { Message as DataTableMessage } from './data-table-definition.js'
type Constructors = typeof DataTableMessage

type Emit = (message: DataTableObservedMessage) => void

export const observeDataTable: (root: Element, emit: Emit, messages: Constructors) => () => void =
  function observeDataTable(root: Element, emit: Emit, messages: Constructors) {
    let resize: { id: string; x: number; width: number; pointer: number } | null = null
    let anchor: string | null = null
    let focusFrame = 0
    const releasePins = observeDataTablePinnedHighlights(root)
    const releaseDrag = observeDataTableDrag(root, messages, emit)
    const targetOf = (event: Event) => (event.target instanceof Element ? event.target : null)
    const act = (event: Event) => targetOf(event)?.closest<HTMLElement>('[data-grid-action]')
    const focusCell = (cell: HTMLElement) => {
      cell.focus({ preventScroll: true })
      cell.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    }
    const focusEditor = () => {
      cancelAnimationFrame(focusFrame)
      focusFrame = requestAnimationFrame(() => {
        const input =
          root.querySelector<HTMLElement>(
            '[data-grid-editor], [data-grid-rich-editor] input:not([type=hidden])',
          ) ??
          root.querySelector<HTMLElement>(
            '[data-grid-rich-editor] button[role=combobox], [data-grid-rich-editor] button',
          )
        input?.focus()
        if (input instanceof HTMLInputElement && !['date', 'number'].includes(input.type))
          input.select()
      })
    }
    const startEdit = (cell: HTMLElement) => {
      if (cell.dataset.gridEditable !== 'true') return
      emit(
        messages.EditStarted({
          rowId: cell.dataset.gridRow ?? '',
          columnId: cell.dataset.gridColumn ?? '',
        }),
      )
      focusEditor()
    }
    const click = (event: Event) => {
      const control = act(event)
      if (!control) {
        const target = targetOf(event)
        if (target?.closest('button,a,input,select,textarea,[data-grid-rich-editor]')) return
        const cell = target?.closest<HTMLElement>('[data-grid-cell]')
        if (cell) startEdit(cell)
        return
      }
      if (control.closest('[data-fluid-data-table]') !== root) return
      const { gridAction: action, gridRow: rowId = '', gridColumn: id = '' } = control.dataset
      switch (action) {
        case 'header':
          if (event instanceof MouseEvent && event.shiftKey)
            emit(messages.SortChanged({ id, multi: true }))
          else if (root.getAttribute('data-grid-header-menu') !== id)
            emit(messages.MenuChanged({ menu: { kind: 'column', id } }))
          break
        case 'select': {
          const selected = control.getAttribute('aria-checked') !== 'true'
          if (event instanceof MouseEvent && event.shiftKey && anchor) {
            const rows = [...root.querySelectorAll<HTMLElement>('[data-grid-action="select"]')]
            const from = rows.findIndex((row) => row.dataset.gridRow === anchor)
            const to = rows.indexOf(control)
            for (const row of rows.slice(Math.max(0, Math.min(from, to)), Math.max(from, to) + 1)) {
              emit(messages.SelectionChanged({ id: row.dataset.gridRow ?? '', selected }))
            }
          } else emit(messages.SelectionChanged({ id: rowId, selected }))
          anchor = rowId
          break
        }
        case 'select-all':
          emit(
            messages.AllSelectionChanged({
              selected: control.getAttribute('aria-checked') !== 'true',
            }),
          )
          break
      }
    }
    const focus = (event: Event) => {
      const cell = targetOf(event)?.closest<HTMLElement>('[data-grid-cell]')
      if (cell)
        emit(
          messages.FocusChanged({
            rowId: cell.dataset.gridRow ?? '',
            columnId: cell.dataset.gridColumn ?? '',
          }),
        )
    }
    const doubleClick = (event: Event) => {
      const cell = targetOf(event)?.closest<HTMLElement>('[data-grid-cell]')
      if (cell) startEdit(cell)
    }
    const pointerDown = (event: Event) => {
      if (!(event instanceof PointerEvent)) return
      const handle = targetOf(event)?.closest<HTMLElement>('[data-grid-resize]')
      if (!handle) return
      event.preventDefault()
      resize = {
        id: handle.dataset.gridColumn ?? '',
        x: event.clientX,
        width: handle.closest('th')?.getBoundingClientRect().width ?? 166,
        pointer: event.pointerId,
      }
      handle.setPointerCapture(event.pointerId)
    }
    const pointerMove = (event: Event) => {
      if (resize && event instanceof PointerEvent)
        emit(
          messages.ColumnWidthChanged({
            id: resize.id,
            width: Math.max(48, Math.round(resize.width + event.clientX - resize.x)),
          }),
        )
    }
    const pointerUp = () => {
      resize = null
    }
    const releaseKeyboard = observeDataTableKeyboard(root, messages, emit, startEdit, focusCell)
    const listeners: ReadonlyArray<readonly [string, EventListener]> = [
      ['click', click],
      ['focusin', focus],
      ['dblclick', doubleClick],
      ['pointerdown', pointerDown],
      ['pointermove', pointerMove],
      ['pointerup', pointerUp],
      ['pointercancel', pointerUp],
    ]
    listeners.forEach(([name, listener]) => root.addEventListener(name, listener))
    return () => {
      releasePins()
      releaseDrag()
      releaseKeyboard()
      listeners.forEach(([name, listener]) => root.removeEventListener(name, listener))
      cancelAnimationFrame(focusFrame)
    }
  }
