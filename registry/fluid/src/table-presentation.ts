import { Effect, Layer, Schema } from 'effect'
import type { Html, VNode } from 'foldkit/html'

import { HIGHLIGHT_FRAME_EVENT, HighlightBox } from './highlight-frame.js'
export type { HighlightBox } from './highlight-frame.js'
interface Presentation {
  readonly onHighlightFrame?: (box: HighlightBox) => void
}

function observePresentation(root: HTMLElement, input: () => Presentation) {
  let edges: ReadonlyArray<{ row: HTMLTableRowElement; bottom: number }> | undefined
  const rules = new WeakMap<HTMLTableRowElement, boolean>()
  const invalidate = () => {
    edges = undefined
  }
  const sizes = new ResizeObserver(invalidate)
  sizes.observe(root)
  const paint = (frame?: HighlightBox) => {
    const fills = root.querySelectorAll<HTMLElement>('.table-row-highlight')
    const fill = fills.item(fills.length - 1)
    if (edges === undefined) {
      const coordinateOrigin = root.querySelector('table')?.parentElement ?? root
      const origin = coordinateOrigin.getBoundingClientRect()
      const scale = origin.height / coordinateOrigin.offsetHeight || 1
      edges = Array.from(root.querySelectorAll<HTMLTableRowElement>('thead > tr,tbody > tr')).map(
        (row) => ({
          row,
          bottom:
            row.offsetParent === coordinateOrigin
              ? row.offsetTop + row.offsetHeight
              : (row.getBoundingClientRect().bottom - origin.top) / scale,
        }),
      )
    }
    const style = fill === null ? undefined : getComputedStyle(fill)
    const matrix =
      style === undefined || style.transform === 'none'
        ? undefined
        : new DOMMatrixReadOnly(style.transform)
    const box = frame ?? {
      y: (matrix?.m42 ?? 0) + (Number.parseFloat(style?.top ?? '') || 0),
      height: Number.parseFloat(style?.height ?? '') || 0,
      opacity: style === undefined ? 0 : Number.parseFloat(style.opacity),
    }
    for (const { row, bottom } of edges) {
      const covered =
        box.opacity >= 0.5 && bottom >= box.y - 1.5 && bottom <= box.y + box.height + 1.5
      if (rules.get(row) === covered) continue
      rules.set(row, covered)
      row.toggleAttribute('data-under-highlight', covered)
    }
    input().onHighlightFrame?.(box)
  }
  const onFrame = (event: Event) => {
    if (
      event instanceof CustomEvent &&
      event.target instanceof Element &&
      event.target.matches('.table-row-highlight') &&
      event.target.closest('[data-fluid-table]') === root &&
      Schema.is(HighlightBox)(event.detail)
    )
      paint(event.detail)
  }
  root.addEventListener(HIGHLIGHT_FRAME_EVENT, onFrame)
  const observer = new MutationObserver((records) => {
    const layoutChanged = records.some((record) => {
      const target = record.target instanceof Element ? record.target : record.target.parentElement
      return (
        target?.closest('table')?.closest('[data-fluid-table]') === root ||
        (record.type === 'childList' &&
          [...record.addedNodes, ...record.removedNodes].some(
            (node) =>
              node instanceof Element &&
              (node.matches('table') || node.querySelector('table') !== null),
          ))
      )
    })
    if (layoutChanged) invalidate()
    if (
      layoutChanged ||
      records.some(
        (record) =>
          record.target instanceof Element &&
          (record.target.matches('.table-row-highlight') || record.type === 'childList'),
      )
    )
      paint()
  })
  observer.observe(root, {
    attributes: true,
    attributeFilter: ['style', 'class', 'hidden', 'colspan', 'rowspan'],
    characterData: true,
    childList: true,
    subtree: true,
  })
  paint()
  return () => {
    sizes.disconnect()
    observer.disconnect()
    root.removeEventListener(HIGHLIGHT_FRAME_EVENT, onFrame)
  }
}

export function createTablePresentation() {
  const mounted = new Map<HTMLElement, { inputs: Presentation; release: () => void }>()
  const update = (node: VNode, inputs: Presentation) => {
    if (!(node.elm instanceof HTMLElement)) return
    const current = mounted.get(node.elm)
    if (current !== undefined) {
      current.inputs = inputs
      return
    }
    const record = { inputs, release: () => {} }
    record.release = observePresentation(node.elm, () => record.inputs)
    mounted.set(node.elm, record)
  }
  const layer = Layer.effectDiscard(
    Effect.addFinalizer(() =>
      Effect.sync(() => {
        for (const record of mounted.values()) record.release()
        mounted.clear()
      }),
    ),
  )
  const node = (html: Html, inputs: Presentation): Html => {
    if (html === null) return null
    const previous = html.data?.hook
    return {
      ...html,
      data: {
        ...html.data,
        hook: {
          ...previous,
          insert(vnode) {
            previous?.insert?.(vnode)
            update(vnode, inputs)
          },
          postpatch(before, after) {
            previous?.postpatch?.(before, after)
            update(after, inputs)
          },
          destroy(vnode) {
            if (vnode.elm instanceof HTMLElement) {
              mounted.get(vnode.elm)?.release()
              mounted.delete(vnode.elm)
            }
            previous?.destroy?.(vnode)
          },
        },
      },
    }
  }
  return { layer, node }
}
