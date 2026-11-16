import { constUndefined } from 'effect/Function'
import { mountChartRenderer } from '@tanstack/charts/renderer'
import { motion } from '@tanstack/charts/motion'
import type { ChartRendererHost, ChartInteractionController, ChartPoint } from '@tanstack/charts'
import { applyChartStyle } from '../cartesian/style'
import { createKeyboardHold } from '../kit/interaction/keyboard-hold'
import { mountTapFocus } from '../kit/interaction/tap-focus'
import { createSpringDriver } from '../pie/private/spring-driver'
import type { PolarHost } from '../pie/private/block'
import { createFunnelEntrance } from './entrance-resource'
import { alignEntranceStart } from '../kit/entrance/entrance-origin'
import { funnelDefinition } from './definition'
import { funnelEntranceVars, funnelHoverVars, funnelStageCss } from './host-vars'
import { createFunnelPop } from './pop-spring'
import { popExtra, stageColor } from './marks'
import { FUNNEL_FOCUS_LAYER } from './focus'
import type { FunnelDatum } from './focus'
import type { FunnelChartProps, FunnelStage } from './options'

const renderer = motion({
  initial: 'always',
  respectReducedMotion: false,
  transition: { duration: 200, easing: 'ease-out', type: 'tween' },
})

export class FunnelHost implements PolarHost<FunnelStage> {
  #props: FunnelChartProps
  #data: ReadonlyArray<FunnelStage>
  #focus: number | null
  #lastReported: number | null = null
  #chart: ChartRendererHost<FunnelDatum, number, number> | undefined
  #interaction: ChartInteractionController<FunnelDatum, number, number> | undefined
  #points: ReadonlyArray<ChartPoint<FunnelDatum, number, number>> = []
  readonly #id: string
  readonly #root = document.createElement('div')
  readonly #surface = document.createElement('div')
  readonly #stageStyles = document.createElement('style')
  readonly #resources = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  readonly #driver: ReturnType<typeof createSpringDriver>
  #pop: ReturnType<typeof createFunnelPop> | undefined
  readonly #hold: ReturnType<typeof createKeyboardHold<FunnelDatum>>
  readonly #releaseTap: () => void
  readonly #observer: ResizeObserver
  readonly #entrance = createFunnelEntrance((index) => this.#pop?.restart(index))
  #releaseEntrance: () => void = constUndefined
  #width = 0
  #height = 0
  #layoutReady = false
  #hasObservedLayout = false
  #destroyed = false
  readonly #clock: () => number
  readonly #observe: (index: number | null) => void
  readonly #observeSize: (size: number) => void
  constructor(
    element: HTMLElement,
    props: FunnelChartProps,
    id: string,
    data: ReadonlyArray<FunnelStage>,
    focus: number | null,
    observe: (index: number | null) => void,
    clock: () => number,
    observeSize: (size: number) => void,
  ) {
    this.#props = props
    this.#id = id
    this.#data = data
    this.#focus = focus
    this.#observe = observe
    this.#clock = clock
    this.#observeSize = observeSize
    this.#driver = createSpringDriver(clock)
    this.#root.dataset.bkmChart = 'funnel'
    this.#root.dataset.bkmFunnelId = encodeURIComponent(id)
    this.#root.dataset.slot = 'chart'
    this.#surface.className =
      'inset-0 overflow-visible absolute [width:var(--bkm-funnel-width,100%)] [height:var(--bkm-funnel-height)]'
    this.#resources.classList.add(
      '[height:0]',
      'overflow-hidden',
      'pointer-events-none',
      'absolute',
      '[width:0]',
    )
    this.#resources.setAttribute('aria-hidden', 'true')
    this.#resources.setAttribute('focusable', 'false')
    this.#resources.setAttribute('height', '0')
    this.#resources.setAttribute('width', '0')
    this.#resources.id = `${id}-fp-resources`
    this.#root.append(this.#surface, this.#resources, this.#stageStyles)
    element.append(this.#root)
    this.#hold = createKeyboardHold(this.#root, () => this.#interaction)
    this.#releaseTap = mountTapFocus(this.#root, () => this.#interaction)
    this.#observer = new ResizeObserver(() => {
      this.#measure()
    })
    this.#observer.observe(this.#root)
    this.#paint()
  }
  #hover() {
    const index =
      this.#focus === null || this.#focus < 0 || this.#focus >= this.#data.length
        ? null
        : this.#focus

    if (index === null) {
      delete this.#root.dataset.hover
    } else {
      this.#root.dataset.hover = String(index)
    }

    this.#pop?.to(index)
  }
  #patterns(width: number, height: number) {
    this.#resources.replaceChildren()
    const render = this.#props.renderPattern

    if (render === undefined) {
      return
    }

    const horizontal = this.#props.orientation !== 'vertical'
    const prefix = `${this.#id}-fp`

    const step =
      ((horizontal ? width : height) + (this.#props.gap ?? 4)) / Math.max(1, this.#data.length)

    const defs = document.createElementNS(this.#resources.namespaceURI, 'defs')

    for (const [index, stage] of this.#data.entries()) {
      const resource = render(
        `${prefix}-${index}`,
        stageColor(stage, this.#props.color ?? 'var(--chart-1)'),
      )

      for (const node of [resource, ...resource.querySelectorAll('[id]')]) {
        const old = node.getAttribute('id')

        if (old !== null && !old.startsWith(`${prefix}-`)) {
          node.setAttribute('id', `${prefix}-${old}`)
        }
      }

      for (const node of [resource, ...resource.querySelectorAll('*')]) {
        for (const name of ['href', 'xlink:href']) {
          const attr = node.getAttributeNode(name)

          if (attr?.value.startsWith('#') === true) {
            const key = attr.value.slice(1)
            attr.value = `#${key.startsWith(`${prefix}-`) ? key : `${prefix}-${key}`}`
          }
        }
      }

      const patterns =
        resource.tagName.toLowerCase() === 'pattern'
          ? [resource]
          : [...resource.querySelectorAll('pattern')]

      for (const pattern of patterns) {
        pattern.setAttribute(
          'patternTransform',
          `translate(${horizontal ? index * step : 0} ${horizontal ? 0 : index * step}) ${pattern.getAttribute('patternTransform') ?? ''}`,
        )
      }

      defs.append(resource)
    }

    this.#resources.append(defs)
  }
  #measure() {
    const measured = this.#root.getBoundingClientRect()

    if (
      measured.width > 0 &&
      measured.height > 0 &&
      (!this.#hasObservedLayout ||
        measured.width !== this.#width ||
        measured.height !== this.#height)
    ) {
      this.#hasObservedLayout = true
      this.#width = measured.width
      this.#height = measured.height
      this.#layoutReady = false
      this.#observeSize(this.#width)
    }
  }
  #applyStyles() {
    const p = this.#props
    const horizontal = p.orientation !== 'vertical'
    const aspect = horizontal ? 2.2 : 1 / 1.8

    this.#root.className = [
      '[aspect-ratio:var(--bkm-funnel-aspect)] relative select-none w-full',
      p.className ?? '',
    ]
      .filter(Boolean)
      .join(' ')
    this.#root.style.cssText = `--bkm-funnel-aspect:${aspect}`
    applyChartStyle(this.#root, funnelHoverVars(Math.max(1, p.layers ?? 3), horizontal, popExtra))
    applyChartStyle(
      this.#root,
      funnelEntranceVars({
        durationSec: p.enterTransition?.duration ?? 1.1,
        ease: Array.isArray(p.enterTransition?.ease) ? p.enterTransition.ease : undefined,
        horizontal,
        staggerDelaySec: p.staggerDelay ?? 0.12,
      }),
    )
    applyChartStyle(this.#root, p.style)
  }
  #paint() {
    if (this.#destroyed) {
      return
    }

    const p = this.#props
    const horizontal = p.orientation !== 'vertical'
    this.#applyStyles()
    this.#root.hidden = this.#data.length === 0

    if (this.#data.length === 0) {
      this.#chart?.destroy()
      this.#chart = undefined
      this.#entrance.clear()
      this.#stageStyles.textContent = ''

      return
    }

    if (!this.#layoutReady) {
      return
    }

    const height = this.#height
    this.#surface.style.setProperty('--bkm-funnel-width', `${this.#width}px`)
    this.#surface.style.setProperty('--bkm-funnel-height', `${height}px`)
    this.#pop ??= createFunnelPop(
      this.#root,
      { horizontal, layers: Math.max(1, p.layers ?? 3), popOf: popExtra },
      this.#driver,
    )
    const fresh = this.#chart === undefined

    const options = {
      definition: funnelDefinition({ ...p, data: this.#data }, this.#id, true),
      width: this.#width,
      height,
      idPrefix: this.#id,
      renderer,
      ariaLabel: p.ariaLabel ?? 'Funnel chart',
      onFocusChange: (point: ChartPoint<FunnelDatum, number, number> | null) => {
        this.#hold.onFocus(point)
        const index = point?.datum.stage ?? null

        if (index === this.#lastReported) {
          return
        }

        this.#lastReported = index
        this.#observe(index)
        p.onHoverChange?.(index)
      },
      onRender: (
        ctx: Parameters<
          NonNullable<
            Parameters<typeof mountChartRenderer<FunnelDatum, number, number>>[1]['onRender']
          >
        >[0],
      ) => {
        this.#interaction = ctx.interaction
        this.#points = ctx.scene.points
      },
    }

    const describedOptions =
      p.ariaDescription === undefined ? options : { ...options, ariaDescription: p.ariaDescription }

    if (fresh) {
      this.#chart = mountChartRenderer(this.#surface, describedOptions)
    } else {
      this.#chart?.update(describedOptions)
    }

    this.#stageStyles.textContent = funnelStageCss(
      this.#id,
      this.#root.querySelector('.bkm-stages')?.children.length ?? 0,
      Math.max(1, p.layers ?? 3),
    )
    this.#patterns(this.#width, height)
    this.#entrance.sync(this.#root, this.#data, p)

    if (fresh) {
      this.#releaseEntrance()
      this.#releaseEntrance = alignEntranceStart(
        this.#root,
        { 'bkm-funnel-label-in': 'frame' },
        this.#clock(),
        false,
        this.#clock,
      )
    }

    this.#controlled()
    this.#hover()
  }
  #controlled() {
    const target = this.#props.hoveredIndex

    if (target === undefined) {
      return
    }

    this.#interaction?.setControlledFocus(
      target === null
        ? null
        : (this.#points.find(
            (p) => p.datum.stage === target && p.datum.layer === FUNNEL_FOCUS_LAYER,
          ) ?? null),
    )
  }
  configure(props: FunnelChartProps) {
    if (props === this.#props) {
      return
    }

    if (props.orientation !== this.#props.orientation || props.layers !== this.#props.layers) {
      this.#pop?.dispose()
      this.#pop = undefined
    }

    this.#props = props
    this.#paint()
  }
  acceptLayout(size: number, ready: boolean) {
    if (!this.#hasObservedLayout || !ready || size !== this.#width || this.#layoutReady) {
      return
    }

    this.#layoutReady = true
    this.#paint()
  }
  update(data: ReadonlyArray<FunnelStage>, focus: number | null) {
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
    this.#observer.disconnect()

    this.#entrance.clear()

    this.#releaseEntrance()
    this.#hold.destroy()
    this.#releaseTap()
    this.#pop?.dispose()
    this.#chart?.destroy()
    this.#driver.destroy()
    this.#root.remove()
  }
}
