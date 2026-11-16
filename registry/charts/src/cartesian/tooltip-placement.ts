import type { ChartTooltipPortalExtension } from '@tanstack/charts/tooltip/portal'

interface PanelSize {
  readonly width: number
  readonly height: number
}

export function bklitTooltipPlacement(): ChartTooltipPortalExtension {
  return {
    id: 'bklit-native-tooltip-placement',
    create: ({ element }) => {
      let size: PanelSize | undefined

      const observer = new ResizeObserver((entries) => {
        const box = entries.at(-1)?.borderBoxSize[0]

        if (box !== undefined && box.inlineSize > 0 && box.blockSize > 0)
          size = { width: Math.round(box.inlineSize), height: Math.round(box.blockSize) }
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
      let showFlip: boolean | null = null
      let anchorX = NaN
      let anchorY = NaN

      const place = (
        x: number,
        y: number,
        measured: PanelSize,
        offset: number,
        scene: PanelSize,
      ) => {
        const flipped = x + measured.width + offset > scene.width
        const left = `${flipped ? x - offset - measured.width : x + offset}px`
        const top = `${y}px`

        if (element.style.getPropertyValue('--bkm-tooltip-left') !== left)
          element.style.setProperty('--bkm-tooltip-left', left)

        if (element.style.getPropertyValue('--bkm-tooltip-top') !== top)
          element.style.setProperty('--bkm-tooltip-top', top)

        return flipped
      }

      return {
        destroy: () => observer.disconnect(),
        hide: () => {
          showFlip = null
          element.removeAttribute('data-bkm-settle')
        },
        update: () => {},
        position: ({ anchor, offset = 16, scene }) => {
          const measured = (size ??= { width: element.offsetWidth, height: element.offsetHeight })
          const same = anchor.x === anchorX && anchor.y === anchorY
          anchorX = anchor.x
          anchorY = anchor.y

          if (showFlip === null) {
            element.removeAttribute('data-bkm-settle')
            showFlip = place(anchor.x, anchor.y, { width: 180, height: 80 }, offset, scene)
            getComputedStyle(element).getPropertyValue('left')
            element.setAttribute('data-bkm-settle', '')
            place(anchor.x, anchor.y, measured, offset, scene)
          } else if (same) place(anchor.x, anchor.y, measured, offset, scene)
          else {
            element.removeAttribute('data-bkm-settle')
            showFlip = place(anchor.x, anchor.y, measured, offset, scene)
          }

          const side = showFlip ? 'left' : 'right'

          if (element.dataset.placement !== side) element.dataset.placement = side

          return true
        },
      }
    },
  }
}
