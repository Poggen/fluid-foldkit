import { applyChartStyle } from '../../cartesian/style'
import { createKeyboardHold } from '../../kit/interaction/keyboard-hold'
import { mountTapFocus } from '../../kit/interaction/tap-focus'
import type {
  ChartRendererHost,
  ChartRendererHostOptions,
  ChartInteractionController,
} from '@tanstack/charts'
import { mountChartRenderer } from '@tanstack/charts/renderer'
import type { PolarHost } from './block'
import { createPolarCenter } from './center'
import type { CenterOptions } from './center'

export interface PolarFrame<Row, Mark> {
  readonly family: 'pie' | 'ring'
  readonly size?: number
  readonly className?: string
  readonly style?: Readonly<Record<string, string | number>>
  readonly scrubbing: boolean
  readonly onHoverChange?: (index: number | null) => void
  readonly indexOf: (mark: Mark) => number
  readonly definition: (
    data: ReadonlyArray<Row>,
    size: number,
  ) => Omit<ChartRendererHostOptions<Mark, number, number>, 'width' | 'height'>
  readonly geometry: (root: HTMLElement, data: ReadonlyArray<Row>, size: number) => void
  readonly hover: (root: HTMLElement, previous: number | null, next: number | null) => void
  readonly centers: (
    data: ReadonlyArray<Row>,
    size: number,
    index: number | null,
  ) => ReadonlyArray<{
    readonly options: CenterOptions
    readonly radius: number
    readonly value: number
    readonly label: string
    readonly custom: boolean
  }>
  readonly cleanup: () => void
}

export interface ConfigurablePolarHost<Row, Mark> extends PolarHost<Row> {
  configure(frame: PolarFrame<Row, Mark>): void
}

export function mountPolar<Row, Mark>(
  element: HTMLElement,
  initialData: ReadonlyArray<Row>,
  initialFocus: number | null,
  observe: (index: number | null) => void,
  clock: () => number,
  initial: PolarFrame<Row, Mark>,
  observeSize: (size: number) => void,
): ConfigurablePolarHost<Row, Mark> {
  const root = document.createElement('div'),
    surface = document.createElement('div'),
    overlay = document.createElement('div')

  root.dataset.bkmChart = initial.family
  root.dataset.slot = 'chart'
  surface.className = 'ts-chart-host relative w-full h-full'
  overlay.className = 'items-center flex inset-0 justify-center pointer-events-none absolute'
  root.append(surface, overlay)
  element.append(root)

  let frame = initial,
    data = initialData,
    focused = initialFocus,
    size = 0,
    chart: ChartRendererHost<Mark, number, number> | undefined,
    interaction: ChartInteractionController<Mark, number, number> | undefined

  let previous: number | null = null,
    destroyed = false,
    resizeFrame = 0

  let measured = false
  let centers: Array<ReturnType<typeof createPolarCenter>> = []

  const reading = () => {
    const records = frame.centers(data, size, focused)

    while (centers.length > records.length) {
      centers.pop()?.destroy()
    }

    records.forEach((r, i) => {
      let center = centers[i]

      if (center === undefined) {
        center = createPolarCenter()
        centers.push(center)
        overlay.append(center.node)
      }

      center.update(r.options, r.radius, r.value, r.label, r.custom)
      center.commit()
    })
  }

  const applyHover = () => {
    const next = frame.scrubbing ? null : focused

    if (next === previous) {
      reading()

      return
    }

    const prior = previous
    previous = next

    if (next === null) {
      delete root.dataset.hover
    } else {
      root.dataset.hover = String(next)
    }

    frame.hover(root, prior, next)
    reading()
  }

  const report = (index: number | null) => {
    observe(index)
    frame.onHoverChange?.(index)
  }

  const paint = () => {
    if (destroyed) {
      return
    }

    const fixed = frame.size !== undefined && frame.size !== 0
    const nextSize = fixed ? (frame.size ?? 640) : root.getBoundingClientRect().width
    const priorSize = size
    size = nextSize < 10 ? 0 : nextSize

    if (!measured || size !== priorSize) {
      measured = true
      observeSize(size)
    }

    root.className = [
      'items-center flex justify-center relative',
      fixed
        ? '[width:var(--bkm-polar-size)] [height:var(--bkm-polar-size)]'
        : '[aspect-ratio:1_/_1] w-full',
      frame.className ?? '',
    ]
      .filter(Boolean)
      .join(' ')
    root.style.cssText = fixed ? `--bkm-polar-size:${frame.size}px` : ''
    applyChartStyle(root, frame.style)

    if (size < 10) {
      chart?.destroy()
      chart = undefined
      surface.hidden = true
      overlay.hidden = true

      return
    }

    surface.hidden = false
    overlay.hidden = false
    frame.geometry(root, data, size)

    const options: ChartRendererHostOptions<Mark, number, number> = {
      ...frame.definition(data, size),
      width: size,
      height: size,
      measureText: () => ({ width: 0, height: 0, x: 0, y: 0 }),
      onFocusChange: (p) => {
        hold.onFocus(p)
        report(p === null ? null : frame.indexOf(p.datum))
      },
      onRender: (ctx) => {
        interaction = ctx.interaction
      },
    }

    if (chart === undefined) {
      chart = mountChartRenderer(surface, options)
    } else {
      chart.update(options)
    }

    applyHover()
  }

  const hold = createKeyboardHold(root, () => interaction)
  const releaseTap = mountTapFocus(root, () => interaction)

  const observer = new ResizeObserver(() => {
    if (frame.size !== undefined && frame.size !== 0) {
      return
    }

    cancelAnimationFrame(resizeFrame)
    resizeFrame = requestAnimationFrame(() => {
      const width = root.getBoundingClientRect().width

      if (Math.abs(width - size) >= 0.5) {
        paint()
      }
    })
  })

  observer.observe(root)
  paint()

  return {
    configure(next) {
      frame = next
      paint()
    },
    update(next, index) {
      const changed = data !== next
      data = next
      focused = index

      if (changed) {
        paint()
      } else {
        applyHover()
      }
    },
    destroy() {
      if (destroyed) {
        return
      }

      destroyed = true
      observer.disconnect()
      cancelAnimationFrame(resizeFrame)
      hold.destroy()
      releaseTap()
      chart?.destroy()

      for (const center of centers) {
        center.destroy()
      }

      frame.cleanup()
      root.remove()
    },
  }
}
