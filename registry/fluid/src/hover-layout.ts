// Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud.
import { Option, Schema } from 'effect'
import { geometryFromEntries } from './lib/indexed-geometry.js'
import type { Rect } from './lib/indexed-geometry.js'
import {
  HOVER_DISABLED_ATTR,
  HOVER_HIDDEN_ATTR,
  HOVER_SCOPE_ATTR,
  HOVER_ROOT_ATTR,
  HOVER_ITEM_ATTR,
} from './hover-attributes.js'

export const HoverRow = Schema.Struct({
  index: Schema.Finite,
  scopeKey: Schema.String,
  rowKey: Schema.optionalKey(Schema.String),
  visible: Schema.Boolean,
  disabled: Schema.Boolean,
})

export const HoverRowLayout = Schema.Array(HoverRow)

export type HoverRowLayout = typeof HoverRowLayout.Type

export const collectHoverItems = (container: HTMLElement) => {
  const items = new Map<number, HTMLElement>()

  for (const element of container.querySelectorAll<HTMLElement>(`[${HOVER_ITEM_ATTR}]`)) {
    if (element.closest(`[${HOVER_ROOT_ATTR}]`) !== container) {
      continue
    }

    const index = Number(element.getAttribute(HOVER_ITEM_ATTR))

    if (!Number.isFinite(index)) {
      continue
    }

    if (items.has(index)) {
      throw new Error(`Duplicate Fluid hover item: ${index}`)
    }

    items.set(index, element)
  }

  return items
}

export const sameHoverRows = (previous: Option.Option<HoverRowLayout>, next: HoverRowLayout) =>
  Option.isSome(previous) &&
  previous.value.length === next.length &&
  previous.value.every((row, index) => {
    const other = next[index]

    return (
      other !== undefined &&
      row.index === other.index &&
      row.scopeKey === other.scopeKey &&
      row.rowKey === other.rowKey &&
      row.visible === other.visible &&
      row.disabled === other.disabled
    )
  })

export const measureHoverLayout = (
  container: HTMLElement,
  items: ReadonlyMap<number, HTMLElement>,
  scopeKey: (element: Element) => string,
  geometryOrigin?: HTMLElement,
) => {
  const measured: Array<{ index: number; rect: Rect }> = []
  const rows: Array<typeof HoverRow.Type> = []
  let unavailableRows = 0

  for (const [index, element] of items) {
    const hidden = element.closest(`[${HOVER_HIDDEN_ATTR}]`) !== null

    const unavailable =
      element.offsetParent === null && element.offsetWidth === 0 && element.offsetHeight === 0

    const visible = !hidden && !unavailable
    rows.push({
      index,
      rowKey: scopeKey(element),
      scopeKey: scopeKey(element.closest(`[${HOVER_SCOPE_ATTR}]`) ?? container),
      visible,
      disabled: element.hasAttribute(HOVER_DISABLED_ATTR),
    })

    if (hidden) {
      continue
    }

    if (unavailable) {
      unavailableRows += 1
      continue
    }

    let top = element.offsetTop
    let left = element.offsetLeft
    let ancestor = element.offsetParent

    while (
      ancestor instanceof HTMLElement &&
      ancestor !== container &&
      container.contains(ancestor)
    ) {
      top += ancestor.offsetTop + ancestor.clientTop
      left += ancestor.offsetLeft + ancestor.clientLeft
      ancestor = ancestor.offsetParent
    }

    if (geometryOrigin !== undefined) {
      const origin = geometryOrigin.getBoundingClientRect()
      const box = element.getBoundingClientRect()
      const scaleX = origin.width / geometryOrigin.offsetWidth || 1
      const scaleY = origin.height / geometryOrigin.offsetHeight || 1
      measured.push({
        index,
        rect: {
          top:
            (box.top - origin.top) / scaleY - geometryOrigin.clientTop + geometryOrigin.scrollTop,
          left:
            (box.left - origin.left) / scaleX -
            geometryOrigin.clientLeft +
            geometryOrigin.scrollLeft,
          width: box.width / scaleX,
          height: box.height / scaleY,
        },
      })
      continue
    }

    measured.push({
      index,
      rect: { top, left, width: element.offsetWidth, height: element.offsetHeight },
    })
  }

  return {
    itemRects: geometryFromEntries(measured),
    rows,
    ready: unavailableRows === 0,
  }
}
