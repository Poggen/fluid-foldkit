import { mountStageFade } from './stage-fade'
import { prefersReducedMotion } from './private/reduced-motion'
import { mountChartRenderer } from '@tanstack/charts/renderer'
import { motion } from '@tanstack/charts/motion'
import type {
  ChartRendererHost,
  ChartPoint,
  ChartScene,
  ChartInteractionController,
} from '@tanstack/charts'
import { createKeyboardHold } from '../kit/interaction/keyboard-hold'
import { mountTapFocus } from '../kit/interaction/tap-focus'
import { sunburstPlan, sunburstResources, buildDefinition, sameSunburstDrawing } from './build'
import { buildEnterDelays } from './arcs'
import type { SunburstChartProps } from './props'
import { isHub } from './hub'
import type { SunburstDatum } from './hub'
import { createPushWriter } from './push'
import type { State, Host, Inputs, Observation } from './block'

const renderer = motion({ initial: 'always', respectReducedMotion: true })

export const SUNBURST_DESCRIPTION =
  'Use arrow keys to inspect segments and Enter or Space to zoom into a branch. Once zoomed in, press Escape, or arrow to the center disc and press Enter or Space, to zoom out.'

export class SunburstHost implements Host {
  readonly root = document.createElement('div')
  readonly #stage = document.createElement('div')
  readonly #writer = createPushWriter()
  readonly #observe: (event: Observation) => void
  readonly #clock: () => number
  #props: SunburstChartProps
  #state: State
  readonly #fade: () => void
  #plan: ReturnType<typeof sunburstPlan>
  #resources: ReturnType<typeof sunburstResources>
  #chart: ChartRendererHost<SunburstDatum, number, number> | undefined
  #scene: ChartScene<SunburstDatum, number, number> | null = null
  #interaction: ChartInteractionController<SunburstDatum, number, number> | undefined
  #hold: ReturnType<typeof createKeyboardHold<SunburstDatum, number, number>> | undefined
  #tap: (() => void) | undefined
  #timer = 0
  #movingTimer = 0
  #moving = false
  #keyZoom = false
  #pendingFocus: string | null = null
  #hoverPath: ReadonlyArray<number> = []
  #center: { readonly x: number; readonly y: number } | null = null
  #playKey = 0
  constructor(
    element: HTMLElement,
    state: State,
    props: SunburstChartProps,
    observe: (event: Observation) => void,
    clock: () => number,
  ) {
    this.#state = state
    this.#props = props
    this.#observe = observe
    this.#clock = clock
    this.#plan = sunburstPlan(props, state)
    this.#resources = sunburstResources(this.#plan.size, clock)
    element.replaceChildren(this.root)
    this.#mount()
    this.#fade = mountStageFade(this.#stage)
  }
  #mount() {
    this.#playKey = this.#props.playKey ?? 0
    this.root.className = `max-w-full w-[var(--bkm-sb-size)] ${this.#props.className ?? ''}`
    this.root.style.setProperty('--bkm-sb-size', `${this.#plan.size}px`)
    this.#stage.className = 'bk-sb-stage [aspect-ratio:1_/_1] max-w-[var(--bkm-sb-size)]'
    this.root.replaceChildren(this.#stage)

    const delays = buildEnterDelays(this.#plan.model.arcs, this.#props.enterStaggerScale ?? 1),
      sweep = this.#plan.sweepMs

    this.root.toggleAttribute('data-bk-intro', !prefersReducedMotion())
    this.root.style.setProperty('--bkm-sb-label-delay', `${delays.maxDelay + sweep * 0.85}ms`)
    this.root.style.setProperty('--bkm-sb-label-dur', `${sweep}ms`)
    this.#resources.renderStart.current = this.#clock()
    this.#resources.feed.onPainted = () => this.#writer.reapplyPush(this.root)
    this.#hold = createKeyboardHold(this.root, () => this.#interaction)
    this.#tap = mountTapFocus(this.root, () => this.#interaction, 'press')
    this.root.addEventListener('keydown', this.#escape)
    this.root.addEventListener('pointermove', this.#markMoving, true)
    this.root.addEventListener('click', this.#clickOnlyZoom, true)

    if (this.#plan.model.maxDepth > 0)
      this.#chart = mountChartRenderer(this.#stage, this.#options())
    this.#timer =
      this.root.ownerDocument.defaultView?.setTimeout(
        () => this.#observe({ _tag: 'ObservedEntered' }),
        delays.maxDelay + sweep + sweep * 0.85,
      ) ?? 0
    this.#applyHover()
  }
  #options() {
    const p = this.#plan,
      r = this.#resources

    return {
      idPrefix: this.#state.id,
      renderer,
      aspectRatio: 1,
      ariaDescription: SUNBURST_DESCRIPTION,
      ariaLabel: `Sunburst chart of ${this.#props.data.name}`,
      definition: buildDefinition({
        now: this.#clock,
        controller: r.controller,
        enterStaggerScale: this.#props.enterStaggerScale ?? 1,
        fillOf: p.fillOf,
        segmentRoles: p.segmentRoles,
        focus: p.focus,
        feed: r.feed,
        sectorRenderer: r.sectorRenderer,
        isIntro: () => !this.#state.entered,
        center: () => this.#center,
        controlled: this.#props.hoveredIndex !== undefined,
        introAt: () => r.renderStart.current,
        hasCenter: p.hasCenter,
        labels: p.labels,
        hoverPop: p.hoverPop,
        model: p.model,
        padding: p.padding,
        pushes: r.pushes,
        registry: r.registry,
        scene: () => this.#scene,
        noteSource: (source) => {
          this.#keyZoom = source === 'keyboard'
        },
        moving: () => this.#moving,
        hoveredId: () =>
          this.#state.hoveredIndex === null
            ? null
            : (p.model.arcs.at(this.#state.hoveredIndex)?.id ?? null),
        trail: r.trail,
        sweepMs: p.sweepMs,
        enterTransition: this.#props.enterTransition,
      }),
      onRender: ({
        scene,
        interaction,
      }: {
        scene: ChartScene<SunburstDatum, number, number>
        interaction: ChartInteractionController<SunburstDatum, number, number>
      }) => {
        this.#scene = scene
        this.#interaction = interaction
        this.#center = {
          x: scene.chart.x + scene.chart.width / 2,
          y: scene.chart.y + scene.chart.height / 2,
        }

        if (scene.width !== this.#state.width || scene.height !== this.#state.height)
          this.#observe({ _tag: 'ObservedSize', width: scene.width, height: scene.height })

        if (this.#pendingFocus !== null) {
          const target =
            scene.points.find(
              (point) => !isHub(point.datum) && point.datum.id === this.#pendingFocus,
            ) ?? scene.points.find((point) => isHub(point.datum))

          this.#pendingFocus = null

          if (target !== undefined) this.#hold?.setKeyboardFocus(target)
        }

        this.#controlledCursor()
        this.#applyHover()
      },
      onFocusChange: (point: ChartPoint<SunburstDatum, number, number> | null) => {
        this.#hold?.onFocus(point)
        this.root.toggleAttribute('data-bk-hub', isHub(point?.datum))

        const index =
          point === null || isHub(point.datum)
            ? null
            : (p.model.arcs.find((arc) => arc.id === point.datum.id)?.arcIndex ?? null)

        this.#hover(index)
      },
      onSelect: (point: ChartPoint<SunburstDatum, number, number> | null) =>
        this.#selectZoom(point),
    }
  }
  #hover(index: number | null) {
    if (this.#props.hoveredIndex !== undefined) {
      this.#props.onHoverChange?.(index)
      this.#observe({ _tag: 'ObservedControlledHover', index })

      return
    }

    if (this.#state.hoveredIndex === index) return
    this.#observe({ _tag: 'ObservedHover', index })
  }
  #applyHover() {
    const p = this.#plan,
      index =
        this.#props.hoveredIndex === undefined
          ? this.#state.hoveredIndex
          : this.#props.hoveredIndex,
      arc = index === null ? null : (p.model.arcs.at(index) ?? null)

    this.#resources.hover.sync({
      arcs: p.model.arcs,
      focusDepth: p.focus.depth,
      hovered: arc,
      maxDepth: p.model.maxDepth,
      popOut: p.hoverPop,
      sectors: this.#resources.pushes,
    })

    if (arc === null) {
      this.#writer.setFlag(this.root, 'a', 'data-bk-d', [])
      this.#writer.setFlag(this.root, 'a', 'data-bk-p', [])
      this.#writer.setFlag(this.root, 'p', 'data-bk-p', [])
      this.#writer.setFlag(this.root, 'l', 'data-bk-r', [])

      for (const name of ['data-bk-pop', 'data-bk-path', 'data-bk-hov'])
        this.root.removeAttribute(name)
      this.#resources.feed.paintHover?.()

      return
    }

    const path: Array<number> = [],
      below: Array<number> = []

    for (const other of p.model.arcs) {
      if (other.id === arc.id || arc.id.startsWith(`${other.id} / `)) path.push(other.arcIndex)
      else if (other.id.startsWith(`${arc.id} / `)) below.push(other.arcIndex)
    }

    this.#hoverPath = path
    this.root.removeAttribute('data-bk-snap')
    this.#writer.setFlag(this.root, 'a', 'data-bk-s', [])
    this.#writer.setFlag(this.root, 'a', 'data-bk-d', below)
    this.#writer.setFlag(this.root, 'a', 'data-bk-p', path)
    this.#writer.setFlag(this.root, 'p', 'data-bk-p', path)
    this.#writer.setFlag(this.root, 'l', 'data-bk-r', [...path, ...below])
    this.root.setAttribute('data-bk-pop', String(arc.arcIndex))
    this.root.setAttribute('data-bk-path', path.join(' '))
    this.root.setAttribute('data-bk-hov', '')
    this.#resources.feed.paintHover?.()
  }
  #controlledCursor() {
    if (this.#props.hoveredIndex === undefined) return

    const arc =
        this.#props.hoveredIndex === null
          ? undefined
          : this.#plan.model.arcs.at(this.#props.hoveredIndex),
      point = arc === undefined ? undefined : this.#resources.registry.get(arc.id)

    this.#resources.controller.setState(
      point === undefined
        ? null
        : {
            anchor: 'value',
            origin: { datumIndex: point.datumIndex, key: point.key, markId: point.markId },
            pinned: false,
            source: 'pointer',
            value: { x: point.xValue, y: point.yValue },
          },
    )
  }
  #zoomable(datum: SunburstDatum) {
    return isHub(datum)
      ? this.#plan.focus.parentId !== null
      : this.#plan.model.arcs.find((arc) => arc.id === datum.id)?.hasChildren === true
  }
  #zoomTo(id: string) {
    if (id === this.#plan.focus.id || !this.#plan.model.focusById.has(id)) return
    this.root.setAttribute('data-bk-snap', '')
    this.#resources.hover.clear()
    this.#writer.setFlag(this.root, 'a', 'data-bk-s', this.#hoverPath)
    this.#hover(null)

    if (this.#props.focusId !== undefined) {
      this.#props.onFocusChange?.(id)
      this.#observe({ _tag: 'ObservedControlledFocus', id })
    } else this.#observe({ _tag: 'ObservedFocus', id })
  }
  #selectZoom(point: ChartPoint<SunburstDatum, number, number> | null) {
    if (point === null) return

    if (isHub(point.datum)) {
      const parent = this.#plan.focus.parentId

      if (parent !== null) {
        this.#pendingFocus = this.#keyZoom ? this.#plan.focus.id : null
        this.#zoomTo(parent)
      }
    } else if (this.#zoomable(point.datum)) {
      this.#pendingFocus = this.#keyZoom
        ? (this.#plan.model.arcs.find((arc) => arc.parentId === point.datum.id)?.id ?? null)
        : null
      this.#zoomTo(point.datum.id)
    }
  }
  readonly #escape = (event: KeyboardEvent) => {
    if (
      event.key === 'Escape' &&
      !(event.altKey || event.ctrlKey || event.metaKey || event.defaultPrevented) &&
      this.#plan.focus.parentId !== null
    ) {
      this.#pendingFocus = this.#plan.focus.id
      this.#zoomTo(this.#plan.focus.parentId)
      event.preventDefault()
      event.stopPropagation()
    }
  }
  readonly #markMoving = () => {
    this.#moving = true
    const view = this.root.ownerDocument.defaultView
    view?.clearTimeout(this.#movingTimer)
    this.#movingTimer =
      view?.setTimeout(() => {
        this.#moving = false
      }, 0) ?? 0
  }
  readonly #clickOnlyZoom = (event: MouseEvent) => {
    this.#moving = false
    const datum = this.#interaction?.resolvePointer(event.clientX, event.clientY)?.point.datum

    if (datum === undefined || !this.#zoomable(datum)) event.stopPropagation()
  }
  configure(props: SunburstChartProps) {
    if (this.#props === props) return
    const unchanged = sameSunburstDrawing(this.#props, props)
    this.root.className = `max-w-full w-[var(--bkm-sb-size)] ${props.className ?? ''}`

    if (unchanged && this.#playKey === (props.playKey ?? 0)) {
      this.#props = props
      this.#controlledCursor()
      this.#applyHover()

      return
    }

    const replay = this.#playKey !== (props.playKey ?? 0) || this.#plan.size !== (props.size ?? 520)
    this.#props = props
    this.#plan = sunburstPlan(props, this.#state)

    if (replay) {
      if (this.#playKey !== (props.playKey ?? 0) && this.#state.entered) {
        this.#observe({ _tag: 'ObservedReplay' })

        return
      }

      this.#release()
      this.#resources = sunburstResources(this.#plan.size, this.#clock)
      this.#mount()
    } else this.#chart?.update(this.#options())
  }
  update(state: State, inputs: Inputs) {
    const previous = this.#state
    this.#state = state
    inputs.configure(this)

    if (!state.entered && this.#playKey !== (this.#props.playKey ?? 0)) {
      this.#release()
      this.#resources = sunburstResources(this.#plan.size, this.#clock)
      this.#mount()
    }

    if (state.focusId !== previous.focusId || state.width !== previous.width) {
      this.#plan = sunburstPlan(this.#props, state)
      this.#chart?.update(this.#options())
    }

    if (state.entered) {
      this.root.removeAttribute('data-bk-intro')
      this.root.style.removeProperty('--bkm-sb-label-delay')
      this.root.style.removeProperty('--bkm-sb-label-dur')
    }

    this.#controlledCursor()
    this.#applyHover()
  }
  #release() {
    this.#resources.hover.clear()
    this.#chart?.destroy()
    this.#hold?.destroy()
    this.#tap?.()
    this.root.ownerDocument.defaultView?.clearTimeout(this.#timer)
    this.root.ownerDocument.defaultView?.clearTimeout(this.#movingTimer)
    this.root.removeEventListener('keydown', this.#escape)
    this.root.removeEventListener('pointermove', this.#markMoving, true)
    this.root.removeEventListener('click', this.#clickOnlyZoom, true)
    this.#resources.feed.onPainted = null
  }
  destroy() {
    this.#fade()
    this.#release()
    this.root.remove()
  }
}
