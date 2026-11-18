import { Effect } from 'effect'
import type { ComputePositionReturn, Middleware, Strategy, Placement } from '@floating-ui/dom'
import { flip, limitShift, offset, shift, size, computePosition } from '@floating-ui/dom'
import type { PopupConfig } from './date-picker-popup-definition.js'

export const popupPositionPolicy: (
  element: HTMLElement,
  active: () => boolean,
) => PopupPositionPolicy = function popupPositionPolicy(
  element: HTMLElement,
  active: () => boolean,
) {
  const collision = { padding: 8 }

  const sizing = size({
    ...collision,
    apply: ({ availableWidth, availableHeight, rects }) => {
      if (!active()) {
        return
      }

      const ratio = element.ownerDocument.defaultView?.devicePixelRatio ?? 1
      const snap = (value: number) => Math.round(value * ratio) / ratio
      element.style.setProperty('--popup-available-height', `${availableHeight}px`)
      element.style.setProperty('--popup-available-width', `${availableWidth}px`)
      element.style.setProperty('--popup-anchor-width', `${snap(rects.reference.width)}px`)
      element.style.setProperty('--popup-anchor-height', `${snap(rects.reference.height)}px`)
    },
  })

  const sliding = shift({ ...collision, mainAxis: true, crossAxis: false, limiter: limitShift() })

  return {
    strategy: 'absolute',
    middleware: [
      offset({ mainAxis: 6, crossAxis: 0, alignmentAxis: 0 }),
      flip({
        padding: { top: 10, right: 9, bottom: 9, left: 9 },
        mainAxis: true,
        crossAxis: 'alignment',
        fallbackAxisSideDirection: 'end',
      }),
      sliding,
      sizing,
    ],
  }
}

export const applyPopupPosition: (element: HTMLElement, position: ComputePositionReturn) => void =
  function applyPopupPosition(element: HTMLElement, position: ComputePositionReturn) {
    const ratio = element.ownerDocument.defaultView?.devicePixelRatio ?? 1
    const x = Math.round(position.x * ratio) / ratio
    const y = Math.round(position.y * ratio) / ratio
    element.style.setProperty('--popup-position', position.strategy)
    element.style.setProperty('--popup-will-change', ratio >= 1.5 ? 'transform' : 'auto')
    element.style.setProperty('--popup-transform', `translate(${x}px, ${y}px)`)
    element.style.setProperty('--popup-opacity', '1')
    element.dataset.side = position.placement.split('-')[0] ?? 'bottom'
    element.dataset.align = position.placement.split('-')[1] ?? 'center'
  }

export const samePopupPositionConfig: (current: PopupConfig, next: PopupConfig) => boolean =
  function samePopupPositionConfig(current: PopupConfig, next: PopupConfig) {
    return (
      next.id === current.id &&
      next.anchorId === current.anchorId &&
      next.align === current.align &&
      next.kind === current.kind
    )
  }

export const popupPlacement: (align: PopupConfig['align']) => Placement = function popupPlacement(
  align: PopupConfig['align'],
) {
  if (align === 'center') {
    return 'bottom'
  }

  return align === 'start' ? 'bottom-start' : 'bottom-end'
}

interface PopupPositionPolicy {
  readonly strategy: Strategy
  readonly middleware: Array<Middleware>
}

export function positionPopup(
  element: HTMLElement,
  anchor: HTMLElement,
  config: PopupConfig,
  policy: PopupPositionPolicy,
  current: () => boolean,
) {
  return Effect.promise(
    computePosition.bind(null, anchor, element, {
      placement: popupPlacement(config.align),
      ...policy,
    }),
  ).pipe(
    Effect.map((position) => {
      if (current()) {
        applyPopupPosition(element, position)
      }

      return position
    }),
  )
}
