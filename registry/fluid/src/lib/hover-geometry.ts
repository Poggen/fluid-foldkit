/* @license Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud. */
/* @license See NOTICE */

import { geometryFromArray, integerGeometryEntries } from './indexed-geometry.js'
import type { IndexedGeometry } from './indexed-geometry.js'

const viewportItemRect: (
  rect: ItemRect,
  argument1: Pick<PickNearestInput, 'containerRect' | 'scroll' | 'border' | 'layoutSize'>,
) => ItemRect = function viewportItemRect(
  rect: ItemRect,
  {
    containerRect,
    scroll,
    border,
    layoutSize,
  }: Pick<PickNearestInput, 'containerRect' | 'scroll' | 'border' | 'layoutSize'>,
) {
  const scaleX = layoutSize.width > 0 ? containerRect.width / layoutSize.width : 1
  const scaleY = layoutSize.height > 0 ? containerRect.height / layoutSize.height : 1

  return {
    left: containerRect.left + (border.x + rect.left - scroll.x) * scaleX,
    top: containerRect.top + (border.y + rect.top - scroll.y) * scaleY,
    width: rect.width * scaleX,
    height: rect.height * scaleY,
  }
}

export const pickNearestIndexed: (
  argument0: Omit<PickNearestInput, 'rects'> & { geometry: IndexedGeometry },
) => number | null = function pickNearestIndexed({
  axis,
  point,
  geometry,
  containerRect,
  scroll,
  border,
  layoutSize,
  isDisabled,
}: Omit<PickNearestInput, 'rects'> & { geometry: IndexedGeometry }) {
  let closestIndex: number | null = null
  let closestDistance = Infinity
  let containingIndex: number | null = null

  for (const { index, rect: r } of integerGeometryEntries(geometry)) {
    if (isDisabled?.(index)) {
      continue
    }

    const { left, top, width, height } = viewportItemRect(r, {
      containerRect,
      scroll,
      border,
      layoutSize,
    })

    if (axis === 'xy') {
      if (point.x >= left && point.x <= left + width && point.y >= top && point.y <= top + height) {
        containingIndex = index
      }

      const distance = Math.hypot(point.x - (left + width / 2), point.y - (top + height / 2))

      if (distance < closestDistance) {
        closestDistance = distance
        closestIndex = index
      }

      continue
    }

    const horizontal = axis === 'x'
    const mousePos = horizontal ? point.x : point.y
    const itemStart = horizontal ? left : top
    const itemSize = horizontal ? width : height

    if (mousePos >= itemStart && mousePos <= itemStart + itemSize) {
      containingIndex = index
    }

    const distance = Math.abs(mousePos - (itemStart + itemSize / 2))

    if (distance < closestDistance) {
      closestDistance = distance
      closestIndex = index
    }
  }

  return containingIndex ?? closestIndex
}

export const resolveActivator: (element: HTMLElement) => HTMLElement = function resolveActivator(
  element: HTMLElement,
) {
  if (element.matches(ACTIVATOR_SELECTOR) || element.hasAttribute('tabindex')) {
    return element
  }

  return element.querySelector<HTMLElement>(ACTIVATOR_SELECTOR) ?? element
}

export interface ItemRect {
  top: number
  height: number
  left: number
  width: number
}

export interface PickNearestInput {
  axis: 'x' | 'y' | 'xy'
  /** The pointer, in viewport coordinates. */
  point: { x: number; y: number }
  /** Item rects in the container's layout space (sparse: unregistered slots
   *  are undefined). */
  rects: ReadonlyArray<ItemRect | undefined>
  /** The container's bounding rect and live scroll / border offsets, which
   *  map layout rects into the pointer's viewport space. */
  containerRect: { left: number; top: number; width: number; height: number }
  scroll: { x: number; y: number }
  border: { x: number; y: number }
  /** Layout size of the container, so a cumulative ancestor `transform:
   *  scale` (a popup mid scale-in) can be factored out per axis. */
  layoutSize: { width: number; height: number }
  /** Skips an item without unregistering it. */
  isDisabled?: (index: number) => boolean
}

export function isOwnEvent(e: { currentTarget?: EventTarget | null; target?: EventTarget | null }) {
  const { currentTarget, target } = e

  if (!(currentTarget instanceof Node) || !(target instanceof Node)) {
    return true
  }

  return currentTarget.contains(target)
}

export const ACTIVE_ATTR = 'data-fluid-hover-active'

export const ACTIVE_INDEX_ATTR = 'data-fluid-hover-active-index'

export const ACTIVATOR_SELECTOR =
  "a[href], button, [role='menuitem'], [role='menuitemradio'], [role='menuitemcheckbox'], [role='option'], [role='radio'], [role='checkbox'], [role='tab'], [role='link'], [role='button']"

export const pickNearest: (argument0: PickNearestInput) => number | null = ({
  rects,
  ...input
}: PickNearestInput) =>
  pickNearestIndexed({ ...input, geometry: geometryFromArray(rects) }) satisfies number | null
