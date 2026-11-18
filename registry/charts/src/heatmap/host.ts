import { mountChartRenderer } from '@tanstack/charts/renderer'
import { motion } from '@tanstack/charts/motion'
import type { ChartRendererHost, ChartInteractionController, ChartPoint } from '@tanstack/charts'
import type { HeatmapHostContract } from './block'
import type { HeatmapChartProps } from './options'
import type { HeatmapScene } from './focus'
import type { CellDatum } from './definition'
import { loadingLabel } from '../cartesian/loading-label'
import { tooltipBoxTarget } from '../cartesian/tooltip-box-geometry'
import { gridTarget } from './keyboard'
import { heatmapDefinition, heatmapPlan } from './build'
import { heatmapTooltipContent } from './tooltip-content'
import { heatmapResources, resourceElement } from './resources'
import { createKeyboardHold } from '../kit/interaction/keyboard-hold'
import { mountTapFocus } from '../kit/interaction/tap-focus'
import { keyStarts, keyHas } from '../kit/renderer-dom'

const renderer = motion({ initial: 'always', respectReducedMotion: true })

type Point = ChartPoint<Readonly<CellDatum>, number | string, string>

export class HeatmapHost implements HeatmapHostContract<HeatmapChartProps['data'][number]> {
  #props: HeatmapChartProps
  #data: HeatmapChartProps['data']
  #level: number | null
  #entered: boolean
  readonly #observeEntered: () => void
  readonly #observeReplay: () => void
  #entryFrame = 0
  #focus: number | null
  #plan: ReturnType<typeof heatmapPlan> | undefined
  #activeCell: Element | null = null
  #scene: HeatmapScene | null = null
  #chart: ChartRendererHost<Readonly<CellDatum>, number | string, string> | undefined
  #interaction: ChartInteractionController<Readonly<CellDatum>, number | string, string> | undefined
  readonly #date: Readonly<Date>
  readonly #root = document.createElement('div')
  readonly #surface = document.createElement('div')
  readonly #resources = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  readonly #hoverStyle = document.createElement('style')
  readonly #tooltip = document.createElement('div')
  readonly #tooltipBody = document.createElement('div')
  readonly #tooltipContent = heatmapTooltipContent(this.#tooltipBody)
  readonly #label = document.createElement('div')
  #loadingLabel: ReturnType<typeof loadingLabel> | undefined
  #loadingText = ''
  readonly #observer: ResizeObserver
  readonly #clock: () => number
  readonly #observe: (index: number | null) => void
  readonly #observeSize: (size: number) => void
  readonly #id: string
  readonly #hold: ReturnType<
    typeof createKeyboardHold<Readonly<CellDatum>, number | string, string>
  >
  readonly #releaseTap: () => void
  #frame = 0
  #hide = 0
  #show = 0
  #destroyed = false
  #width = 720
  #origin: number | null = null
  readonly #enterClock: import('./motion').HeatmapEnterClock = {
    at: null,
    origin: () => this.#origin,
    now: () => this.#clock(),
  }
  constructor(
    element: HTMLElement,
    props: HeatmapChartProps,
    id: string,
    data: HeatmapChartProps['data'],
    focus: number | null,
    level: number | null,
    observe: (index: number | null) => void,
    clock: () => number,
    observeSize: (size: number) => void,
    currentDate: Readonly<Date>,
    entered: boolean,
    observeEntered: () => void,
    observeReplay: () => void,
  ) {
    this.#entered = entered
    this.#observeEntered = observeEntered
    this.#observeReplay = observeReplay
    this.#date = currentDate
    this.#props = props
    this.#data = data
    this.#entered = entered
    this.#focus = focus
    this.#level = level
    this.#observe = observe
    this.#clock = clock
    this.#observeSize = observeSize
    this.#id = id
    this.#root.dataset.bkmChart = 'heatmap'
    this.#root.dataset.slot = 'chart'
    this.#tooltip.id = `${id}-tooltip`
    this.#root.dataset.hmId = id
    this.#root.classList.add('relative')
    this.#root.classList.add('w-full')
    this.#surface.classList.add(
      'relative',
      '[width:var(--bkm-hm-surface-width)]',
      '[height:var(--bkm-hm-surface-height)]',
      '[margin-bottom:var(--bkm-hm-surface-margin)]',
    )
    this.#root.classList.add('h-full')
    this.#tooltip.hidden = true
    this.#tooltip.classList.add(
      'absolute',
      '[left:var(--bkm-hm-tooltip-left)]',
      '[top:var(--bkm-hm-tooltip-top)]',
    )
    this.#tooltip.classList.add('pointer-events-none')
    this.#tooltip.setAttribute('role', 'status')
    this.#tooltipBody.className =
      'ts-chart-tooltip__body min-w-[140px] overflow-hidden rounded-lg text-chart-tooltip-foreground shadow-lg bg-chart-tooltip-background backdrop-blur-md'
    this.#tooltipBody.setAttribute('inert', '')
    this.#tooltip.append(this.#tooltipBody)
    this.#label.className =
      'ts-bkm-heatmap-loading-box absolute grid [place-items:center] pointer-events-none data-[hidden]:hidden [left:var(--bkm-hm-label-left)] [top:var(--bkm-hm-label-top)] [width:var(--bkm-hm-label-width)] [height:var(--bkm-hm-label-height)]'
    this.#resources.setAttribute('width', '0')
    this.#resources.setAttribute('height', '0')
    this.#resources.setAttribute('aria-hidden', 'true')
    this.#resources.classList.add('absolute')
    this.#root.append(this.#resources, this.#hoverStyle, this.#surface, this.#tooltip, this.#label)
    element.append(this.#root)
    this.#hold = createKeyboardHold(this.#root, () => this.#interaction)
    this.#releaseTap = mountTapFocus(this.#root, () => this.#interaction, 'press')
    this.#root.addEventListener('keydown', this.#key, true)
    this.#root.addEventListener('blur', this.#blur, true)
    this.#observer = new ResizeObserver(() => {
      cancelAnimationFrame(this.#frame)
      this.#frame = requestAnimationFrame(() => {
        const width = this.#root.getBoundingClientRect().width

        if (this.#chart === undefined || Math.abs(width - this.#width) >= 0.5) {
          this.#width = width
          this.#paint()
        }
      })
    })
    this.#observer.observe(this.#root)
  }
  readonly #leave = () => this.#interaction?.setControlledFocus(null)
  readonly #blur = (event: FocusEvent) => {
    if (!(event.relatedTarget instanceof Node) || !this.#root.contains(event.relatedTarget)) {
      this.#leave()
    }
  }
  readonly #key = (event: KeyboardEvent) => {
    const plan = this.#plan

    if (plan === undefined) return

    if (
      !(plan.cells?.interactive ?? true) ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey
    ) {
      return
    }

    const points = this.#scene?.points ?? []

    const current = points.find(
      (point) => point.datum.column * plan.rowCount + point.datum.row === this.#focus,
    )

    if (current === undefined) {
      return
    }

    const target = gridTarget(points, current, event.key, plan.columns.length, plan.rowCount)

    if (target === undefined) {
      return
    }

    event.preventDefault()
    event.stopPropagation()
    this.#interaction?.setControlledFocus(target, { source: 'programmatic' })
  }
  #tooltipFor(point: Point | null) {
    window.clearTimeout(this.#hide)
    window.clearTimeout(this.#show)
    const props = this.#props.children?.find((c) => c.kind === 'heatmapTooltip')?.props

    if (point === null || props === undefined) {
      this.#hide = window.setTimeout(() => {
        this.#tooltip.hidden = true
      }, props?.hideDelay ?? 120)

      return
    }

    const paint = () => {
      this.#tooltipContent(point.datum, props)
      this.#tooltip.hidden = false
      const anchorX = point.x + (this.#props.gap ?? 2) / 2
      const anchorY = point.y + (this.#props.gap ?? 2) / 2

      const size = this.#tooltip.getBoundingClientRect(),
        p = this.#plan

      if (p === undefined) return

      const target = tooltipBoxTarget(
        { x: anchorX, y: anchorY, containerWidth: p.chartWidth, containerHeight: p.chartHeight },
        size,
      )
      this.#tooltip.style.setProperty('--bkm-hm-tooltip-left', `${target.left}px`)
      this.#tooltip.style.setProperty('--bkm-hm-tooltip-top', `${target.top}px`)
    }

    if (this.#tooltip.hidden && (props.showDelay ?? 0) > 0) {
      this.#show = window.setTimeout(paint, props.showDelay)
    } else {
      paint()
    }
  }
  #hover() {
    const p = this.#plan

    if (p === undefined) return

    const c = p.cells

    const point = this.#scene?.points.find(
      (point) => point.datum.column * p.rowCount + point.datum.row === this.#focus,
    )

    const scope = `[data-hm-id="${this.#id}"]`
    const base = `${scope} rect${keyStarts('heatmap-cells-')}{--bkm-hm-hover-opacity:attr(opacity type(<number>),1);--bkm-hm-hover-transform:scale(1)}`
    const dim = `${scope}[data-hm-focused] rect${keyStarts('heatmap-cells-')}{--bkm-hm-hover-opacity:${c?.inactiveOpacity ?? 0.3};--bkm-hm-hover-transform:scale(${c?.inactiveScale ?? 1})}`

    const target = `${scope} rect${keyStarts('heatmap-cells-')}[data-hm-active]{--bkm-hm-hover-opacity:1;--bkm-hm-hover-transform:scale(${c?.activeScale ?? 1})}`
    const activeCell =
      point === undefined
        ? null
        : this.#surface.querySelector(
            `rect${keyStarts('heatmap-cells-')}${keyHas(`:${point.datum.column}-${point.datum.row}:`)}`,
          )

    if (activeCell !== this.#activeCell) {
      this.#activeCell?.removeAttribute('data-hm-active')
      activeCell?.setAttribute('data-hm-active', '')
      this.#activeCell = activeCell
    }

    this.#root.toggleAttribute('data-hm-focused', point !== undefined)

    const legend =
      this.#level === null
        ? ''
        : `${scope} g${keyStarts('heatmap-cells-')}:not(${keyStarts(`heatmap-cells-l${this.#level}-`)}) rect{--bkm-hm-hover-opacity:${c?.inactiveOpacity ?? 0.3};--bkm-hm-hover-transform:scale(${c?.inactiveScale ?? 1})}${scope} g${keyStarts(`heatmap-cells-l${this.#level}-`)} rect{--bkm-hm-hover-transform:scale(${c?.activeScale ?? 1})}`

    const css = base + dim + target + (point === undefined ? legend : '')

    if (this.#hoverStyle.textContent !== css) this.#hoverStyle.textContent = css
    this.#tooltipFor(point ?? null)
  }
  #paint() {
    if (this.#destroyed) {
      return
    }

    const props = { ...this.#props, data: this.#data },
      p = heatmapPlan(props, this.#width, this.#date)

    this.#plan = p

    this.#resources.replaceChildren(
      ...heatmapResources(
        p.levelStyles,
        this.#id,
        p.margin.left,
        p.margin.top,
        p.separator,
        p.innerHeight,
      ).map(resourceElement),
    )
    this.#root.style.setProperty('--bkm-hm-load-max', String(props.loadingCellMaxOpacity ?? 0.85))
    this.#observeSize(this.#width)
    this.#root.className = [
      'relative w-full h-full [opacity:var(--bkm-hm-root-opacity)] [aspect-ratio:var(--bkm-hm-root-aspect)]',
      props.className ?? '',
    ]
      .filter(Boolean)
      .join(' ')
    this.#root.classList.add('w-full')
    this.#surface.style.setProperty('--bkm-hm-surface-width', `${p.chartWidth}px`)
    this.#surface.style.setProperty(
      '--bkm-hm-surface-height',
      `${p.chartHeight + (props.gap ?? 2) / 2}px`,
    )
    this.#surface.style.setProperty('--bkm-hm-surface-margin', `${-(props.gap ?? 2) / 2}px`)
    this.#root.style.setProperty(
      '--bkm-hm-root-opacity',
      String(props.status === 'loading' ? (props.loadingOpacity ?? 1) : 1),
    )
    this.#root.style.setProperty('--bkm-hm-root-aspect', props.aspectRatio ?? '')
    this.#label.hidden =
      props.status !== 'loading' || (props.loadingLabel ?? '').trim().length === 0
    this.#label.toggleAttribute('data-hidden', this.#label.hidden)

    if ((props.loadingLabel ?? '') !== this.#loadingText) {
      this.#loadingText = props.loadingLabel ?? ''
      this.#loadingLabel = loadingLabel(this.#loadingText)
      this.#label.replaceChildren(this.#loadingLabel.element)
    }

    this.#loadingLabel?.update(!this.#label.hidden, false)
    Object.entries({
      '--bkm-hm-label-left': `${p.margin.left}px`,
      '--bkm-hm-label-top': `${p.margin.top}px`,
      '--bkm-hm-label-width': `${p.innerWidth}px`,
      '--bkm-hm-label-height': `${p.innerHeight}px`,
    }).forEach(([name, value]) => this.#label.style.setProperty(name, value))

    if (p.cells === undefined || p.chartWidth < 10 || p.chartHeight < 10) {
      this.#chart?.destroy()
      this.#chart = undefined

      return
    }

    const options = {
      idPrefix: this.#id,
      definition: heatmapDefinition(
        props,
        this.#width,
        this.#id,
        this.#enterClock,
        () => this.#scene,
        this.#date,
        this.#entered,
      ),
      width: p.chartWidth,
      height: p.chartHeight + (props.gap ?? 2) / 2,
      renderer,
      ariaLabel: props.ariaLabel ?? p.cells?.ariaLabel ?? 'Heatmap chart',
      ...((props.ariaDescription ?? p.cells?.ariaDescription) === undefined
        ? {}
        : { ariaDescription: props.ariaDescription ?? p.cells?.ariaDescription ?? '' }),
      onFocusChange: (point: Point | null) => {
        this.#hold.onFocus(point)
        this.#observe(point === null ? null : point.datum.column * p.rowCount + point.datum.row)
      },
      onRender: (ctx: {
        scene: HeatmapScene
        interaction: ChartInteractionController<Readonly<CellDatum>, number | string, string>
      }) => {
        this.#scene = ctx.scene
        this.#interaction = ctx.interaction
      },
    }

    if (this.#chart === undefined) {
      this.#origin = this.#clock()
      this.#chart = mountChartRenderer(this.#surface, options)
    } else {
      this.#chart.update(options)
    }

    if (!this.#entered && this.#entryFrame === 0 && (props.status ?? 'ready') === 'ready') {
      this.#entryFrame = requestAnimationFrame(() => {
        this.#entryFrame = 0
        this.#observeEntered()
      })
    }

    this.#hover()
  }
  configure(props: HeatmapChartProps) {
    if (props === this.#props) {
      return
    }

    if ((props.revealSignature ?? '') !== (this.#props.revealSignature ?? '')) {
      this.#enterClock.at = null
      this.#origin = null
    }

    if (props.status === 'loading' && this.#props.status !== 'loading') {
      this.#observeReplay()
      this.#enterClock.at = null
      this.#origin = null
    }

    this.#props = props
    this.#paint()
  }
  update(
    data: HeatmapChartProps['data'],
    focus: number | null,
    level: number | null,
    entered: boolean,
  ) {
    const changed = data !== this.#data || entered !== this.#entered

    if (!changed && focus === this.#focus && level === this.#level) return

    if (level !== null && level !== this.#level) {
      this.#interaction?.setControlledFocus(null)
    }

    this.#data = data
    this.#entered = entered
    this.#focus = focus
    this.#level = level

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
    this.#observer.disconnect()
    cancelAnimationFrame(this.#frame)
    cancelAnimationFrame(this.#entryFrame)
    window.clearTimeout(this.#show)
    window.clearTimeout(this.#hide)
    this.#root.removeEventListener('keydown', this.#key, true)
    this.#root.removeEventListener('blur', this.#blur, true)
    this.#hold.destroy()
    this.#releaseTap()
    this.#chart?.destroy()
    this.#root.remove()
  }
}
