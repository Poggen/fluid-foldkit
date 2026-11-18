import { Predicate } from 'effect'
import { HoverMotion } from './hover-motion'
import { createCrosshairPaint } from './crosshair-paint'
import type { HoverGlide } from './hover-motion'
import type { OverlayDot, HoverOverlayModel, OverlayPlot } from './hover-overlay-model'
import {
  canRetainHover,
  hoverPresentationKey,
  overlaySpotOf,
  overlayXOf,
} from './hover-overlay-model'
import { CROSSHAIR_SPRING, DATE_PILL_SPRING } from '../kit/motion/springs'
import type { Margin as ChartMargin } from './context-types'
import { PILL_LIVE_X } from './date-pill'

export { overlayPlotOf } from './hover-overlay-model'

export type {
  OverlayDot,
  HoverOverlayModel,
  OverlayPlot,
  OverlayShape,
} from './hover-overlay-model'

const writeVar: (element: HTMLElement, key: string, value: string) => void = (
  element: HTMLElement,
  key: string,
  value: string,
) => {
  element.style.setProperty(key, value)
}

const SVG_NS = 'http://www.w3.org/2000/svg'

const PILL_ROW = 24

const translate: (v: ReadonlyArray<number>) => string = (v: ReadonlyArray<number>) =>
  `translate(${v[0] ?? 0}px,${v[1] ?? 0}px)`

const translateX: (v: ReadonlyArray<number>) => string = (v: ReadonlyArray<number>) =>
  `translateX(${v[0] ?? 0}px)`

const translateXDevicePx: (v: ReadonlyArray<number>) => string = (v: ReadonlyArray<number>) => {
  const dpr = window.devicePixelRatio || 1

  return `translateX(${Math.round((v[0] ?? 0) * dpr) / dpr}px)`
}

const translateY: (v: ReadonlyArray<number>) => string = (v: ReadonlyArray<number>) =>
  `translateY(${v[0] ?? 0}px)`

const div: (cls: string, parent?: HTMLElement) => HTMLDivElement = (
  cls: string,
  parent?: HTMLElement,
) => {
  const el = document.createElement('div')
  el.className = cls
  parent?.append(el)

  return el
}

interface DotView<Row> {
  readonly dot: OverlayDot<Row>
  readonly el: HTMLElement
  readonly glide: HoverGlide | null
}

interface PillView {
  readonly el: HTMLElement
  readonly glide: HoverGlide
  readonly months: HoverGlide | null
  readonly days: HoverGlide | null
  readonly text: HTMLElement | null
}

/** Imperative hover indicator for one chart host. `mount` once, `update` after each draw, `focus` on every focus change. */
export class HoverOverlay<Row> {
  private readonly uid: string
  private readonly clock: () => number
  constructor(uid: string, clock: () => number) {
    this.uid = uid
    this.clock = clock
  }
  private gradientCount = 0
  destroy() {
    this.motion.clear()
    this.el?.remove()
    this.el = null
    this.focused = null
    this.paintRule = null
  }
  private el: HTMLDivElement | null = null
  private model: HoverOverlayModel<Row> | null = null
  private plot: OverlayPlot | null = null
  private margin: ChartMargin | null = null
  private ruleGlide: HoverGlide | null = null
  private paintRule: ((color: string) => void) | null = null
  private dots: Array<DotView<Row>> = []
  private pill: PillView | null = null
  private focused: { readonly time: number; readonly row: Row } | null = null
  private entered = false
  private presentationKey = ''
  private monthRun = -1
  private readonly motion = new HoverMotion()

  /** Built on first client use: the overlay is created during render, which also runs on the server. */
  get root() {
    if (!this.el) {
      this.el = div('bkm-hov')
      this.el.setAttribute('aria-hidden', 'true')
    }

    return this.el satisfies HTMLDivElement
  }

  /** The model and plot of the latest draw; rebuilds the elements (a draw is a resize or a data change, never a hover move) and replays the current focus without motion. */
  update(model: HoverOverlayModel<Row> | null, plot: OverlayPlot, margin: ChartMargin) {
    const key =
      model?.sourceMotion === true
        ? hoverPresentationKey(model, plot) +
          JSON.stringify([plot.height, plot.innerWidth, plot.innerHeight, margin])
        : ''

    const retained = canRetainHover(this.model, model, this.presentationKey === key)

    this.model = model
    this.plot = plot
    this.margin = margin
    this.presentationKey = key

    if (typeof document === 'undefined') {
      return
    }

    if (retained && model !== null) {
      this.dots = this.dots.map((view, index) => ({ ...view, dot: model.dots[index] ?? view.dot }))
      this.focus(this.focused?.time ?? null, this.focused?.row ?? null, true)

      return
    }

    this.root.replaceChildren()
    this.motion.clear()
    this.ruleGlide = null
    this.paintRule = null
    this.dots = []
    this.pill = null
    this.monthRun = -1
    this.entered = false

    if (!model) {
      return
    }

    if (model.crosshair) {
      this.buildRule(model.crosshair, plot, margin)
    }

    for (const dot of model.dots) {
      this.dots.push(this.buildDot(dot, plot))
    }

    if (model.pill) {
      this.pill = this.buildPill(model.pill, plot)
    }

    const held = this.focused
    this.focused = null
    this.focus(held?.time ?? null, held?.row ?? null)
  }

  /** Moves the indicator to the focused row (`null` hides it at once, like bklit unmounting the crosshair and dots). */
  focus(time: number | null, row: Row | null, force = false) {
    const { model, plot, margin } = this

    if (time === null || row === null || !model || !plot || !margin) {
      this.motion.stopSource()
      this.focused = null
      this.entered = false
      delete this.root.dataset.on

      return
    }

    if (!force && this.focused?.row === row && this.focused.time === time) {
      return
    }

    this.focused = { row, time }
    const color = model.crosshair?.color

    if (color !== undefined) {
      this.paintRule?.(Predicate.isFunction(color) ? color(row) : color)
    }

    const enter = !this.entered
    this.entered = true
    const x = margin.left + overlayXOf(model, plot, time)

    this.ruleGlide?.[enter || model.animatePosition === false ? 'jump' : 'glide']([x])

    this.focusDots(row, time, x, plot, margin.top, enter)

    this.focusPill(model, time, x, enter)
    this.root.dataset.on = ''
  }

  private focusDots(
    row: Row,
    time: number,
    x: number,
    plot: OverlayPlot,
    top: number,
    enter: boolean,
  ) {
    for (const view of this.dots) {
      const { colorOf } = view.dot

      if (colorOf !== undefined) {
        const color = colorOf(row)

        for (const shape of view.el.querySelectorAll<SVGElement>('circle,rect')) {
          shape.style.setProperty(
            view.dot.colorTarget === 'stroke' ? '--bkm-dot-stroke' : '--bkm-dot-fill',
            color,
          )
        }
      }

      const spot = overlaySpotOf(view.dot, row, plot, time, top)
      view.el.classList.toggle('hidden', !spot)

      if (spot) {
        const at = [x + spot.dx, spot.y]
        view.glide?.[enter ? 'jump' : 'glide'](at)

        if (!view.glide) {
          view.el.style.setProperty('--bkm-dot-position', translate(at))
        }
      }
    }
  }

  private focusPill(model: HoverOverlayModel<Row>, time: number, x: number, enter: boolean) {
    const { pill } = this

    if (!pill || !model.pill) {
      return
    }

    pill.glide[enter || model.animatePosition === false ? 'jump' : 'glide']([x])
    const index = model.indexOf(time)
    const { layout } = model.pill

    if (pill.text) {
      pill.text.textContent = model.pill.labels[index] ?? ''

      return
    }

    if (!layout) {
      return
    }

    const run = layout.monthOf[index] ?? 0

    if (enter && model.sourceMotion === true) {
      pill.days?.jump([-index * PILL_ROW])
      pill.months?.jump([-run * PILL_ROW])
      this.monthRun = run

      return
    }

    if (enter) {
      pill.days?.jump([0])
      pill.months?.jump([0])
      this.monthRun = -1
    }

    pill.days?.glide([-index * PILL_ROW])

    if (this.monthRun !== run) {
      pill.months?.glide([-run * PILL_ROW])
      this.monthRun = run
    }
  }

  private positionSpring() {
    return { ...CROSSHAIR_SPRING, ...this.model?.springConfig }
  }

  private buildRule(
    rule: NonNullable<HoverOverlayModel<Row>['crosshair']>,
    plot: OverlayPlot,
    margin: ChartMargin,
  ) {
    const height = Math.max(0, plot.innerHeight)
    const wrap = div(
      'bkm-hov-x [top:var(--bkm-rule-top)] [height:var(--bkm-rule-height)]',
      this.root,
    )
    wrap.style.setProperty('--bkm-rule-top', `${margin.top}px`)
    wrap.style.setProperty('--bkm-rule-height', `${height}px`)

    const svg = document.createElementNS(SVG_NS, 'svg')
    svg.setAttribute('width', '1')
    svg.setAttribute('height', String(height))
    svg.classList.add('overflow-visible')

    const { mark, paint } = createCrosshairPaint({
      svg,
      rule,
      height,
      gradientId: `bkm-hov-grad-${this.uid}-${this.gradientCount}`,
    })

    this.gradientCount += 1
    this.paintRule = paint

    svg.append(mark)
    wrap.append(svg)
    this.paintRule?.(Predicate.isString(rule.color) ? rule.color : 'var(--chart-crosshair)')

    this.ruleGlide = this.motion.create(
      mark,
      this.positionSpring(),
      1,
      translateX,
      this.clock,
      this.model?.sourceMotion === true,
    )
  }

  private buildDot(dot: OverlayDot<Row>, plot: OverlayPlot) {
    const el = div('bkm-hov-dot', this.root)
    if (!dot.glide) el.classList.add('[transform:var(--bkm-dot-position)]')
    const svg = document.createElementNS(SVG_NS, 'svg')

    svg.setAttribute('width', '1')
    svg.setAttribute('height', '1')
    svg.classList.add('overflow-visible')

    for (const c of Predicate.isFunction(dot.shapes) ? dot.shapes(plot) : dot.shapes) {
      let shape: SVGElement

      if (c.corner === undefined) {
        shape = document.createElementNS(SVG_NS, 'circle')
        shape.setAttribute('r', String(c.r))
      } else {
        shape = document.createElementNS(SVG_NS, 'rect')
        shape.setAttribute('x', String(-c.r))
        shape.setAttribute('y', String(-c.r))
        shape.setAttribute('width', String(c.r * 2))
        shape.setAttribute('height', String(c.r * 2))
        shape.setAttribute('rx', String(c.corner))
      }

      shape.classList.add(
        '[fill:var(--bkm-dot-fill)]',
        '[stroke:var(--bkm-dot-stroke)]',
        '[stroke-width:var(--bkm-dot-stroke-width)]',
      )
      shape.style.setProperty('--bkm-dot-fill', c.fill)
      shape.style.setProperty('--bkm-dot-stroke', c.stroke)
      shape.style.setProperty('--bkm-dot-stroke-width', String(c.strokeWidth))
      svg.append(shape)
    }

    el.append(svg)

    return {
      dot,
      el,
      glide: dot.glide
        ? this.motion.create(
            el,
            this.positionSpring(),
            2,
            translate,
            this.clock,
            this.model?.sourceMotion === true,
          )
        : null,
    } satisfies DotView<Row>
  }

  private pillGlide(wrap: HTMLElement) {
    const source = this.model?.sourceMotion === true

    const glide = this.motion.create(
      wrap,
      this.positionSpring(),
      1,
      source ? ([x = 0]) => `${x}px` : translateXDevicePx,
      this.clock,
      source,
      source ? 'left' : 'transform',
    )

    glide.onMove = ([x = 0]) => {
      const host = this.root.parentElement

      if (host) {
        writeVar(host, PILL_LIVE_X, x.toFixed(1))
      }
    }

    return glide satisfies HoverGlide
  }

  private buildPill(spec: NonNullable<HoverOverlayModel<Row>['pill']>, plot: OverlayPlot) {
    const wrap = div('bkm-hov-pill [top:var(--bkm-pill-top)]', this.root)

    wrap.style.setProperty('--bkm-pill-top', `${plot.height - 36}px`)
    const box = div('bkm-hov-pill-box', wrap)
    const { layout } = spec

    if (!layout) {
      const text = document.createElement('span')
      text.className = 'bkm-hov-pill-text'
      div('bkm-hov-pill-row', box).append(text)

      return {
        days: null,
        el: wrap,
        glide: this.pillGlide(wrap),
        months: null,
        text,
      } satisfies PillView
    }

    const column: (values: ReadonlyArray<string>) => HoverGlide = (
      values: ReadonlyArray<string>,
    ) => {
      const col = div('bkm-hov-pill-col', box)
      const stack = div('bkm-hov-pill-stack', col)

      for (const value of values) {
        const row = div('bkm-hov-pill-row', stack)
        row.textContent = value
      }

      return this.motion.create(
        stack,
        DATE_PILL_SPRING,
        1,
        translateY,
        this.clock,
        this.model?.sourceMotion === true,
      )
    }

    const months = column(layout.months)

    const days = column(layout.days)

    return { days, el: wrap, glide: this.pillGlide(wrap), months, text: null } satisfies PillView
  }
}
