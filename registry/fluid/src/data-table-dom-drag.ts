import { gridIds, type DataTableObservedMessage } from './data-table-observation.js'
/* @license Derived from Fluid Functionalism f8014098. MIT, copyright 2026 Micka Touillaud. */
/* @license See NOTICE */
import type { Message } from './data-table-definition.js'

type Constructors = typeof Message
type Emit = (message: DataTableObservedMessage) => void

export const observeDataTableDrag: (
  root: Element,
  messages: Constructors,
  emit: Emit,
) => () => void = function observeDataTableDrag(root: Element, messages: Constructors, emit: Emit) {
  const document = root.ownerDocument
  const owns = (element: Element) =>
    root.contains(element) ||
    Boolean(document.getElementById(`${root.id}-view-menu`)?.contains(element))
  const view = document.defaultView
  let state: {
    kind: 'row' | 'column'
    id: string
    x: number
    y: number
    pointer: number
    handle: HTMLElement
    source: HTMLElement
    ghost: HTMLElement | null
    target: HTMLElement | null
    left: number
    top: number
    clientX: number
    clientY: number
  } | null = null
  let frame = 0
  let lastTime = 0
  let suppressClick = false
  const cleanup = () => {
    cancelAnimationFrame(frame)
    frame = 0
    lastTime = 0
    if (state) {
      state.ghost?.remove()
      state.source.style.opacity = ''
      state.target?.removeAttribute('data-grid-drop-target')
    }
    state = null
  }
  const scroll = (time: number) => {
    if (!state?.ghost) return
    const dt = Math.min(50, lastTime ? time - lastTime : 16) / 1000
    lastTime = time
    const area = root.querySelector<HTMLElement>('[data-grid-scroll]')
    const rect = area?.getBoundingClientRect()
    const speed = (point: number, start: number, end: number) =>
      point < start + 48
        ? -Math.min(1, (start + 48 - point) / 48) * 720
        : point > end - 48
          ? Math.min(1, (point - end + 48) / 48) * 720
          : 0
    if (area && rect) area.scrollLeft += speed(state.clientX, rect.left, rect.right) * dt
    const dy = speed(state.clientY, 0, view?.innerHeight ?? 768) * dt
    if (dy) view?.scrollBy(0, dy)
    frame = requestAnimationFrame(scroll)
  }
  const down = (event: Event) => {
    if (
      !(event instanceof PointerEvent) ||
      event.button !== 0 ||
      !(event.target instanceof Element)
    )
      return
    const handle = event.target.closest<HTMLElement>('[data-grid-drag]')
    if (!handle || root.getAttribute('aria-disabled') === 'true') return
    const kind = handle.dataset.gridDrag?.startsWith('column') ? 'column' : 'row'
    const source = handle.closest<HTMLElement>(
      kind === 'column'
        ? '[data-grid-header], [data-grid-column-menu-row]'
        : '[data-grid-body-row]',
    )
    if (!source) return
    const rect = source.getBoundingClientRect()
    state = {
      kind,
      id: kind === 'row' ? (handle.dataset.gridRow ?? '') : (handle.dataset.gridColumn ?? ''),
      x: event.clientX,
      y: event.clientY,
      pointer: event.pointerId,
      handle,
      source,
      ghost: null,
      target: null,
      left: rect.left,
      top: rect.top,
      clientX: event.clientX,
      clientY: event.clientY,
    }
    handle.setPointerCapture(event.pointerId)
  }
  const move = (event: Event) => {
    if (!state || !(event instanceof PointerEvent) || event.pointerId !== state.pointer) return
    state.clientX = event.clientX
    state.clientY = event.clientY
    const dx = event.clientX - state.x,
      dy = event.clientY - state.y
    if (!state.ghost && Math.hypot(dx, dy) < 4) return
    event.preventDefault()
    if (!state.ghost) {
      const ghost = document.createElement('div')
      ghost.setAttribute('aria-hidden', 'true')
      ghost.inert = true
      const rect = state.source.getBoundingClientRect()
      const table = document.createElement('table')
      table.className = 'w-full table-fixed border-separate border-spacing-0'
      const cloned = state.source.cloneNode(true)
      table.append(cloned)
      const widths = [...state.source.querySelectorAll('th,td')].map(
        (cell) => cell.getBoundingClientRect().width,
      )
      table.querySelectorAll<HTMLElement>('th,td').forEach((cell, index) => {
        cell.style.width = `${widths[index] ?? 166}px`
        cell.style.minWidth = cell.style.width
      })
      if (state.source.hasAttribute('data-grid-column-menu-row'))
        ghost.append(state.source.cloneNode(true))
      else ghost.append(table)
      ghost.className =
        'pointer-events-none fixed z-[100] overflow-hidden rounded-lg border border-border bg-background text-sm text-foreground shadow-lg'
      Object.assign(ghost.style, {
        left: `${state.left}px`,
        top: `${state.top}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
      })
      document.body.append(ghost)
      state.ghost = ghost
      state.source.style.opacity = '0.35'
      frame = requestAnimationFrame(scroll)
    }
    state.ghost.style.transform = `translate3d(${dx}px,${dy}px,0)`
    const target =
      document
        .elementFromPoint(event.clientX, event.clientY)
        ?.closest<HTMLElement>(
          state.kind === 'column'
            ? '[data-grid-header], [data-grid-column-menu-row]'
            : '[data-grid-body-row]',
        ) ?? null
    if (target !== state.target) {
      state.target?.removeAttribute('data-grid-drop-target')
      state.target = target && owns(target) ? target : null
      state.target?.setAttribute('data-grid-drop-target', '')
    }
  }
  const up = (event: Event) => {
    if (!state || !(event instanceof PointerEvent) || event.pointerId !== state.pointer) return
    if (state.ghost) {
      suppressClick = true
      const current = state
      if (current.target) {
        if (current.kind === 'row') {
          const selected = gridIds(root, 'data-grid-selected')
          const targetId = current.target.dataset.gridRow ?? ''
          emit(
            messages.RowsMoved({
              ids: selected.includes(current.id) ? selected : [current.id],
              targetId,
              place:
                event.clientY >
                current.target.getBoundingClientRect().top +
                  current.target.getBoundingClientRect().height / 2
                  ? 'after'
                  : 'before',
            }),
          )
        } else {
          const ids = gridIds(root, 'data-grid-columns')
          const from = ids.indexOf(current.id),
            to = ids.indexOf(current.target.dataset.gridColumn ?? '')
          if (from >= 0 && to >= 0) {
            ids.splice(from, 1)
            ids.splice(to, 0, current.id)
            emit(messages.ColumnOrderChanged({ ids }))
          }
        }
      }
    }
    cleanup()
  }
  const cancel = () => cleanup()
  const click = (event: Event) => {
    if (suppressClick) {
      suppressClick = false
      event.preventDefault()
      event.stopImmediatePropagation()
    }
  }
  const key = (event: Event) => {
    if (event instanceof KeyboardEvent && event.key === 'Escape' && state?.ghost) {
      event.preventDefault()
      event.stopImmediatePropagation()
      suppressClick = true
      cleanup()
      return
    }
    if (!(event instanceof KeyboardEvent) || !event.altKey || !(event.target instanceof Element))
      return
    const handle = event.target.closest<HTMLElement>('[data-grid-drag]')
    if (!handle) return
    if (handle.dataset.gridDrag === 'row' && ['ArrowUp', 'ArrowDown'].includes(event.key)) {
      const rows = [...root.querySelectorAll<HTMLElement>('[data-grid-body-row]')]
      const sourceId = handle.dataset.gridRow ?? ''
      const selected = gridIds(root, 'data-grid-selected')
      const ids = selected.includes(sourceId) ? selected : [sourceId]
      const positions = rows.flatMap((row, index) =>
        ids.includes(row.dataset.gridRow ?? '') ? [index] : [],
      )
      const target =
        rows[event.key === 'ArrowDown' ? Math.max(...positions) + 1 : Math.min(...positions) - 1]
      if (target) {
        event.preventDefault()
        emit(
          messages.RowsMoved({
            ids,
            targetId: target.dataset.gridRow ?? '',
            place: event.key === 'ArrowDown' ? 'after' : 'before',
          }),
        )
      }
    }
    if (
      (handle.dataset.gridDrag === 'column' && ['ArrowLeft', 'ArrowRight'].includes(event.key)) ||
      (handle.dataset.gridDrag === 'column-menu' && ['ArrowUp', 'ArrowDown'].includes(event.key))
    ) {
      const ids = gridIds(root, 'data-grid-columns'),
        id = handle.dataset.gridColumn ?? '',
        from = ids.indexOf(id),
        to = from + (event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1)
      if (from >= 0 && to >= 0 && to < ids.length) {
        event.preventDefault()
        ids.splice(from, 1)
        ids.splice(to, 0, id)
        emit(messages.ColumnOrderChanged({ ids }))
      }
    }
  }
  const menuDown = (event: Event) => {
    if (
      event.target instanceof Element &&
      event.target.closest('[data-grid-column-menu-row]') &&
      owns(event.target)
    )
      down(event)
  }
  const menuKey = (event: Event) => {
    if (
      event instanceof KeyboardEvent &&
      event.altKey &&
      ['ArrowUp', 'ArrowDown'].includes(event.key) &&
      event.target instanceof Element &&
      event.target.closest('[data-grid-column-menu-row]') &&
      owns(event.target)
    ) {
      event.preventDefault()
      event.stopImmediatePropagation()
      key(event)
    }
  }
  const ownedClick = (event: Event) => {
    if (event.target instanceof Element && owns(event.target)) click(event)
  }
  root.addEventListener('pointerdown', down)
  document.addEventListener('pointerdown', menuDown)
  document.addEventListener('pointermove', move)
  document.addEventListener('pointerup', up)
  document.addEventListener('pointercancel', cancel)
  document.addEventListener('click', ownedClick, true)
  root.addEventListener('keydown', key)
  document.addEventListener('keydown', menuKey, true)
  return () => {
    cleanup()
    root.removeEventListener('pointerdown', down)
    document.removeEventListener('pointerdown', menuDown)
    document.removeEventListener('pointermove', move)
    document.removeEventListener('pointerup', up)
    document.removeEventListener('pointercancel', cancel)
    document.removeEventListener('click', ownedClick, true)
    root.removeEventListener('keydown', key)
    document.removeEventListener('keydown', menuKey, true)
  }
}
