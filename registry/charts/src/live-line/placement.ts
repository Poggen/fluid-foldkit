import { resolveChartTooltipPlacement } from '@tanstack/charts/tooltip/model'
import type { ChartTooltipPortalExtension } from '@tanstack/charts/tooltip/portal'

export const familyTooltipPlacement: (
  mode: 'live' | 'heatmap',
  bottomInset: number,
) => ChartTooltipPortalExtension = function familyTooltipPlacement(
  mode: 'live' | 'heatmap',
  bottomInset: number,
) {
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
            const flipped = anchor.x + measured.width + offset > scene.width
            element.style.setProperty(
              '--bkm-tooltip-left',
              `${flipped ? anchor.x - offset - measured.width : anchor.x + offset}px`,
            )
            element.style.setProperty(
              '--bkm-tooltip-top',
              `${Math.max(offset, Math.min(anchor.y - measured.height / 2, scene.height - bottomInset - measured.height - offset))}px`,
            )
            element.dataset.placement = flipped ? 'left' : 'right'
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
