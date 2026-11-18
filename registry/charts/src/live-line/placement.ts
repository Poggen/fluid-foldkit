import { resolveChartTooltipPlacement } from '@tanstack/charts/tooltip/model'
import type { ChartTooltipPortalExtension } from '@tanstack/charts/tooltip/portal'
import { tooltipBoxTarget } from '../cartesian/tooltip-box-geometry'

export function familyTooltipPlacement(
  mode: 'live' | 'heatmap',
  bottomInset: number,
): ChartTooltipPortalExtension {
  return {
    id: 'heatmap-live-tooltip-placement',
    create: ({ element, schedulePosition }) => {
      let size: { width: number; height: number } | undefined

      const observer = new ResizeObserver((entries) => {
        const box = entries.at(-1)?.borderBoxSize[0]

        if (box !== undefined && box.inlineSize > 0 && box.blockSize > 0) {
          size = { width: Math.round(box.inlineSize), height: Math.round(box.blockSize) }
          schedulePosition()
        }
      })

      observer.observe(element)
      element.classList.add(
        'bottom-auto',
        'm-0',
        'absolute',
        'right-auto',
        'z-[1]',
        'left-[var(--bkm-tooltip-left)]',
        'top-[var(--bkm-tooltip-top)]',
        'w-max',
      )

      return {
        destroy: () => observer.disconnect(),
        update: () => {},
        hide: () => {},
        position: ({ anchor, placement, offset = 16, scene }) => {
          const measured = (size ??= { width: element.offsetWidth, height: element.offsetHeight })

          if (mode === 'heatmap') {
            const target = tooltipBoxTarget(
              {
                x: anchor.x,
                y: anchor.y,
                containerWidth: scene.width,
                containerHeight: scene.height - bottomInset,
                offset,
              },
              measured,
            )
            element.style.setProperty('--bkm-tooltip-left', `${target.left}px`)
            element.style.setProperty('--bkm-tooltip-top', `${target.top}px`)
            element.dataset.placement = target.flipped ? 'left' : 'right'
          } else {
            const resolved = resolveChartTooltipPlacement(
              anchor,
              measured,
              { left: 0, top: 0, right: scene.width, bottom: scene.height },
              placement,
              offset,
            )

            element.style.setProperty('--bkm-tooltip-left', `${resolved.left}px`)
            element.style.setProperty('--bkm-tooltip-top', `${resolved.top}px`)
            element.dataset.placement = resolved.placement
          }

          return true
        },
      }
    },
  }
}
