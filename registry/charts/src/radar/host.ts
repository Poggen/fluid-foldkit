import { motion } from '@tanstack/charts/motion'
import { mountChartRenderer } from '@tanstack/charts/renderer'
import type {
  ChartRendererHost,
  ChartRendererHostOptions,
  ChartInteractionController,
} from '@tanstack/charts'
import { applyChartStyle } from '../cartesian/style'
import { alignEntranceStart } from '../kit/entrance/entrance-origin'
import type { PolarHost } from '../pie/private/block'
import { createKeyboardHold } from '../kit/interaction/keyboard-hold'
import { mountTapFocus } from '../kit/interaction/tap-focus'
import { radarDefinition } from './build'
import { extract } from './extract'
import { radarAreaColor } from './area'
import { isAreaPoint } from './definition'
import { createRadarAreaLayer } from './area-layer'
import { radarEntranceKey, radarEntranceResource } from './entrance'
import type { EntranceOrigin } from '../kit/entrance/entrance-origin'
import type { RadarData, RadarRow } from './rows'
import { radarEntranceProperties } from './host-style'
import type { RadarChartProps } from './options'

const renderer = motion({ initial: 'always', respectReducedMotion: true })

export class RadarHost implements PolarHost<RadarData> {
  readonly #id: string
  readonly #motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)')
  readonly #onMotionPreference = () => this.#paint()
  readonly #entranceStyle = document.createElement('style')
  #entranceOrigins: Readonly<Record<string, EntranceOrigin>> = {}
  #props: RadarChartProps
  #data: ReadonlyArray<RadarData>
  #focus: number | null
  #previous: number | null = null
  #lastReported: number | null = null
  #chart: ChartRendererHost<RadarRow, string | number, number> | undefined
  #interaction: ChartInteractionController<RadarRow, string | number, number> | undefined
  #points: Array<
    Parameters<
      NonNullable<ChartRendererHostOptions<RadarRow, string | number, number>['onFocusChange']>
    >[0]
  > = []
  readonly #root = document.createElement('div')
  readonly #surface = document.createElement('div')
  readonly #areas = createRadarAreaLayer()
  readonly #observer: ResizeObserver
  readonly #hold: ReturnType<typeof createKeyboardHold<RadarRow, string | number, number>>
  readonly #releaseTap: () => void
  #releaseEntrance: (() => void) | undefined
  #size = 0
  #frame = 0
  #destroyed = false
  readonly #clock: () => number
  readonly #observe: (index: number | null) => void
  readonly #observeSize: (size: number) => void
  constructor(
    element: HTMLElement,
    id: string,
    props: RadarChartProps,
    data: ReadonlyArray<RadarData>,
    focus: number | null,
    observe: (index: number | null) => void,
    clock: () => number,
    observeSize: (size: number) => void,
  ) {
    this.#id = id
    this.#props = props
    this.#data = data
    this.#focus = focus
    this.#clock = clock
    this.#observe = observe
    this.#observeSize = observeSize
    this.#root.dataset.bkmRadar = ''
    this.#root.dataset.bkmRadarScope = radarEntranceKey(id)
    this.#surface.className =
      'relative w-[var(--bkm-radar-surface-size,100%)] h-[var(--bkm-radar-surface-size,100%)]'
    this.#root.append(this.#entranceStyle, this.#surface)
    element.append(this.#root)
    this.#hold = createKeyboardHold(this.#root, () => this.#interaction)
    this.#releaseTap = mountTapFocus(this.#root, () => this.#interaction)
    this.#observer = new ResizeObserver(() => {
      const fixedSize = this.#props.size

      if (fixedSize !== undefined && fixedSize !== 0 && !Number.isNaN(fixedSize)) {
        return
      }

      cancelAnimationFrame(this.#frame)
      this.#frame = requestAnimationFrame(() => {
        const bounds = this.#root.getBoundingClientRect()
        const size = Math.min(bounds.width, bounds.height)

        if (Math.abs(size - this.#size) >= 0.5) {
          this.#paint()
        }
      })
    })
    this.#observer.observe(this.#root)
    this.#motionPreference.addEventListener('change', this.#onMotionPreference)
    this.#paint()
  }
  #hover() {
    const next = this.#focus
    const prior = this.#previous
    this.#previous = next

    if (next === null) {
      delete this.#root.dataset.hover
      delete this.#root.dataset.bkmGlow
    } else {
      this.#root.dataset.hover = String(next)
      const area = extract(this.#props.children).areas.find((a) => a.index === next)

      if (area?.showGlow ?? true) {
        this.#root.dataset.bkmGlow = ''
      } else {
        delete this.#root.dataset.bkmGlow
      }

      if (area !== undefined) {
        this.#root.style.setProperty('--bkm-radar-glow', radarAreaColor(area, this.#data))
      }
    }

    if (prior !== next) {
      this.#areas.hover(next)
    }
  }
  #controlled() {
    if (this.#props.hoveredIndex === undefined) {
      return
    }

    const target = this.#props.hoveredIndex
    this.#interaction?.setControlledFocus(
      target === null
        ? null
        : (this.#points.find((p) => p !== null && isAreaPoint(p) && p.datum.series === target) ??
            null),
      { source: 'pointer' },
    )
  }
  #fixed() {
    const { size } = this.#props

    return size !== undefined && size !== 0 && !Number.isNaN(size)
  }
  #presentation(p: RadarChartProps, fixed: boolean) {
    this.#root.className = [
      'bk-radar',
      fixed
        ? 'bk-radar-fixed w-[var(--bkm-radar-fixed-size)] h-[var(--bkm-radar-fixed-size)]'
        : 'bk-radar-fluid',
      p.className ?? '',
    ]
      .filter(Boolean)
      .join(' ')
    this.#root.removeAttribute('style')
    if (fixed) this.#root.style.setProperty('--bkm-radar-fixed-size', `${p.size}px`)
    const entrance = radarEntranceResource(this.#id, p.levels ?? 5)
    const css = entrance.css

    if (this.#entranceStyle.textContent !== css) {
      this.#entranceStyle.textContent = css
    }

    this.#entranceOrigins = entrance.origins
    const vars = radarEntranceProperties(p)

    if (p.animate ?? true) {
      this.#root.dataset.bkmEnter = ''
      applyChartStyle(this.#root, vars)
    } else {
      delete this.#root.dataset.bkmEnter
      this.#releaseEntrance?.()
      this.#releaseEntrance = undefined
    }

    applyChartStyle(this.#root, p.style)
  }
  #paint() {
    if (this.#destroyed) {
      return
    }

    const p = {
      ...this.#props,
      animate: (this.#props.animate ?? true) && !this.#motionPreference.matches,
    }
    const fixedSize = p.size
    const fixed = this.#fixed()

    this.#presentation(p, fixed)
    const bounds = this.#root.getBoundingClientRect()

    const size =
      fixed && fixedSize !== undefined ? fixedSize : Math.min(bounds.width, bounds.height)

    this.#size = size
    this.#observeSize(size)

    if (p.metrics.length === 0 || size < 10) {
      this.#chart?.destroy()
      this.#chart = undefined
      this.#surface.hidden = true

      return
    }

    this.#surface.hidden = false

    this.#surface.style.setProperty('--bkm-radar-surface-size', `${size}px`)

    this.#areas.configure({ ...p, data: this.#data, size })

    const options: ChartRendererHostOptions<RadarRow, string | number, number> = {
      definition: radarDefinition({ ...p, data: this.#data, size }, this.#areas.layer),
      width: size,
      height: size,
      renderer,
      ariaLabel: p.ariaLabel ?? 'Radar chart',
      onFocusChange: (point) => {
        this.#hold.onFocus(point)
        const next = point !== null && isAreaPoint(point) ? point.datum.series : null

        if (next === this.#lastReported) {
          return
        }

        this.#lastReported = next
        this.#observe(next)
        p.onHoverChange?.(next)
      },
      onRender: (ctx) => {
        this.#interaction = ctx.interaction
        this.#points = [...ctx.scene.points]
        this.#controlled()
      },
    }

    const hostOptions =
      p.ariaDescription === undefined ? options : { ...options, ariaDescription: p.ariaDescription }

    const fresh = this.#chart === undefined

    if (fresh) {
      this.#chart = mountChartRenderer(this.#surface, hostOptions)
    } else {
      this.#chart?.update(hostOptions)
    }

    if (fresh && (p.animate ?? true)) {
      this.#releaseEntrance?.()
      this.#releaseEntrance = alignEntranceStart(
        this.#root,
        this.#entranceOrigins,
        this.#clock(),
        false,
        this.#clock,
      )
    }

    this.#hover()
  }
  configure(props: RadarChartProps) {
    if (props === this.#props) {
      return
    }

    this.#props = props
    this.#paint()
  }
  update(data: ReadonlyArray<RadarData>, focus: number | null) {
    const changed = data !== this.#data
    this.#data = data
    this.#focus = focus

    if (changed) {
      this.#paint()
    } else {
      this.#hover()
    }
  }
  destroy() {
    if (this.#destroyed) {
      return
    }

    this.#destroyed = true
    this.#motionPreference.removeEventListener('change', this.#onMotionPreference)
    this.#observer.disconnect()
    cancelAnimationFrame(this.#frame)
    this.#releaseEntrance?.()
    this.#hold.destroy()
    this.#releaseTap()
    this.#chart?.destroy()
    this.#areas.destroy()
    this.#root.remove()
  }
}
