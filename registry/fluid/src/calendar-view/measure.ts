import { Observation } from './state.js'
import type { Rect } from './state.js'

const layoutRect: (
  window: Window & typeof globalThis,
  button: HTMLElement,
  container: HTMLElement,
) => typeof Rect.Type = function layoutRect(
  window: Window & typeof globalThis,
  button: HTMLElement,
  container: HTMLElement,
) {
  let top = button.offsetTop
  let left = button.offsetLeft
  let ancestor = button.offsetParent

  while (
    ancestor instanceof window.HTMLElement &&
    ancestor !== container &&
    container.contains(ancestor)
  ) {
    top += ancestor.offsetTop + ancestor.clientTop
    left += ancestor.offsetLeft + ancestor.clientLeft
    ancestor = ancestor.offsetParent
  }

  return { top, left, width: button.offsetWidth, height: button.offsetHeight }
}

const monthStride: (
  first: HTMLElement | undefined,
  second: HTMLElement | undefined,
  stacked: boolean,
) => number | null = function monthStride(
  first: HTMLElement | undefined,
  second: HTMLElement | undefined,
  stacked: boolean,
) {
  if (first === undefined || (stacked && second === undefined)) {
    return null
  }

  return stacked && second !== undefined
    ? second.offsetTop - first.offsetTop
    : first.offsetWidth + 24
}

function dayRects(months: HTMLElement, window: Window & typeof globalThis) {
  const rects: Record<string, typeof Rect.Type> = {}

  for (const button of months.querySelectorAll<HTMLElement>('[data-calendar-index]')) {
    const ordinal = button.dataset.calendarOrdinal ?? null

    if (ordinal === null || button.closest('[data-calendar-present="false"]') !== null) {
      continue
    }
    rects[ordinal] = layoutRect(window, button, months)
  }

  return rects
}

function updateColumnGeometry(element: HTMLElement, months: HTMLElement, stacked: boolean) {
  const fill = (element.dataset.calendarFill ?? null) === 'true'
  const cell = months.querySelector<HTMLElement>('[role="gridcell"]')

  if (fill && cell !== null) {
    const box = months.getBoundingClientRect().width
    months.style.setProperty(
      '--calendar-col',
      `${cell.getBoundingClientRect().width * (box === 0 ? 1 : months.offsetWidth / box)}px`,
    )
  } else {
    months.style.setProperty('--calendar-col', 'var(--cell-size)')
  }

  const row = months.querySelector<HTMLElement>('[data-calendar-sticky-weekdays]')

  const strip = months.querySelector<HTMLElement>('[data-calendar-strip]')

  if (stacked && row !== null && strip !== null) {
    strip.style.setProperty(
      '--strip-clip-top',
      `${row.getBoundingClientRect().bottom - strip.getBoundingClientRect().top}px`,
    )
  }
}

function panelHeights(months: HTMLElement) {
  const heights: Record<string, number> = {}

  for (const panel of months.querySelectorAll<HTMLElement>('[data-calendar-present="true"]')) {
    const index = panel.dataset.calendarDisplayIndex ?? null

    if (index !== null) {
      heights[index] = panel.offsetHeight
    }
  }

  return heights
}

function navigationRects(months: HTMLElement, window: Window & typeof globalThis) {
  const navRects: Record<string, typeof Rect.Type> = {}

  for (const group of months.querySelectorAll<HTMLElement>('[data-calendar-nav-group]')) {
    const id = group.dataset.calendarNavGroup ?? null

    for (const button of group.querySelectorAll<HTMLElement>('[data-calendar-nav]')) {
      const direction = button.dataset.calendarNav ?? null

      if (id !== null && direction !== null) {
        navRects[`${id}:${direction}`] = layoutRect(window, button, group)
      }
    }
  }

  return navRects
}

export function measureCalendar(
  element: HTMLElement,
  window: Window & typeof globalThis,
  reducedMotion: boolean,
) {
  const months = element.querySelector<HTMLElement>('[data-slot="calendar-months"]')

  if (months === null) {
    return null
  }

  const slots = months.querySelectorAll<HTMLElement>('[data-slot="calendar-month"]')

  const [first, second] = slots
  const stacked = (months.dataset.orientation ?? null) === 'vertical'
  const cellSize = Number(element.dataset.calendarCellSize ?? null)
  const parent = element.parentElement
  const parentStyle = parent === null ? null : window.getComputedStyle(parent)

  const width =
    parent === null || parentStyle === null
      ? Infinity
      : parent.clientWidth -
        Number.parseFloat(parentStyle.paddingLeft) -
        Number.parseFloat(parentStyle.paddingRight)

  const needed =
    (7 + ((element.dataset.calendarShowWeekNumber ?? null) === 'true' ? 0.75 : 0)) * cellSize * 2 +
    24 +
    16

  const stride = monthStride(first, second, stacked)

  const rects = dayRects(months, window)

  updateColumnGeometry(element, months, stacked)

  const heights = panelHeights(months)

  const navRects = navigationRects(months, window)

  return Observation.cases.Measured.make({
    navRects,
    generation: Number(element.dataset.calendarGeneration ?? null),
    heights,
    fits: width >= needed,
    stride,
    rects,
    reduceMotion: reducedMotion,
  })
}
