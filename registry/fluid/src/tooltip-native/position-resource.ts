import { Option } from 'effect'
import {
  arrow,
  autoUpdate,
  computePosition,
  flip,
  limitShift,
  offset,
  shift,
  size,
} from '@floating-ui/dom'
import type { Boundary } from '@floating-ui/dom'
import type { Side } from './domain.js'

export function positionTooltip(
  window: Window,
  trigger: HTMLElement,
  element: HTMLElement,
  readConfiguration: () => Option.Option<{ readonly side: Side; readonly sideOffset: number }>,
) {
  let disposed = false
  let revision = 0
  element.classList.add(
    'top-0',
    'left-0',
    '[position:var(--tooltip-position,absolute)]',
    '[visibility:var(--tooltip-visibility,hidden)]',
    '[transform:var(--tooltip-transform)]',
  )
  element.style.setProperty('--tooltip-position', 'absolute')
  element.style.setProperty('--tooltip-visibility', 'hidden')

  {
    element.style.setProperty('--available-width', '100vw')
    element.style.setProperty('--available-height', '100vh')
  }
  const update = () => {
    if (disposed) return
    const request = ++revision
    const configuration = readConfiguration()
    if (Option.isNone(configuration)) return
    const { side, sideOffset } = configuration.value
    const padding = 5
    const boundary: Boundary = 'clippingAncestors'
    const overflow = { padding, boundary }
    const flipPadding = {
      top: 6 + (side === 'bottom' ? 1 : 0),
      bottom: 6 + (side === 'top' ? 1 : 0),
      left: 6 + (side === 'right' ? 1 : 0),
      right: 6 + (side === 'left' ? 1 : 0),
    }
    const middleware = [
      offset({ mainAxis: sideOffset, alignmentAxis: 0, crossAxis: 0 }),
      shift({ ...overflow, mainAxis: true, crossAxis: false, limiter: limitShift() }),
      flip({
        boundary,
        padding: flipPadding,
        mainAxis: true,
        crossAxis: 'alignment',
        fallbackAxisSideDirection: 'end',
      }),
      size({
        ...overflow,
        apply: ({ elements, rects, availableWidth, availableHeight }) => {
          if (disposed || request !== revision) return
          const current = readConfiguration()
          if (
            Option.isNone(current) ||
            current.value.side !== side ||
            !Object.is(current.value.sideOffset, sideOffset)
          )
            return
          const style = elements.floating.style
          {
            const dpr = window.devicePixelRatio || 1
            const { x, y, width, height } = rects.reference
            style.setProperty('--available-width', `${availableWidth}px`)
            style.setProperty('--available-height', `${availableHeight}px`)
            style.setProperty(
              '--anchor-width',
              `${(Math.round((x + width) * dpr) - Math.round(x * dpr)) / dpr}px`,
            )
            style.setProperty(
              '--anchor-height',
              `${(Math.round((y + height) * dpr) - Math.round(y * dpr)) / dpr}px`,
            )
          }
        },
      }),
    ]
    middleware.push(arrow({ element: element.ownerDocument.createElement('div'), padding: 0 }))

    void computePosition(trigger, element, {
      placement: side,
      strategy: 'absolute',
      middleware,
    }).then((result) => {
      if (disposed || request !== revision) return
      const current = readConfiguration()
      if (
        Option.isNone(current) ||
        current.value.side !== side ||
        !Object.is(current.value.sideOffset, sideOffset)
      )
        return
      const dpr = window.devicePixelRatio || 1
      element.style.setProperty('--tooltip-position', result.strategy)
      element.style.setProperty(
        '--tooltip-transform',
        `translate(${Math.round(result.x * dpr) / dpr}px, ${Math.round(result.y * dpr) / dpr}px)`,
      )
      element.style.setProperty('--tooltip-visibility', 'visible')
      element.dataset.placement = result.placement
      element.dataset.side = result.placement.split('-')[0]
      element.dataset.align = 'center'
      const actualSide = result.placement.split('-')[0]
      const vertical = actualSide === 'top' || actualSide === 'bottom'
      const crossOrigin = `${
        vertical ? (result.middlewareData.arrow?.x ?? 0) : (result.middlewareData.arrow?.y ?? 0)
      }px`
      const sideOrigin =
        actualSide === 'top' || actualSide === 'left'
          ? `calc(100% + ${sideOffset}px)`
          : `${-sideOffset}px`
      const origin = vertical ? `${crossOrigin} ${sideOrigin}` : `${sideOrigin} ${crossOrigin}`
      element.style.setProperty('--transform-origin', origin)
    })
  }
  let stop = autoUpdate(trigger, element, update)
  return {
    update,
    refresh: () => {
      if (disposed) return
      stop()
      stop = autoUpdate(trigger, element, update)
    },
    dispose: () => {
      disposed = true
      stop()
    },
  }
}
