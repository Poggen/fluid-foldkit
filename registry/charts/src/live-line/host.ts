import { mountChartRenderer } from '@tanstack/charts/renderer'
import { motion } from '@tanstack/charts/motion'
import type { LiveTooltipValue } from './tooltip-view'
import type { ChartRendererHost, ChartTooltipBodyTarget, ChartPoint } from '@tanstack/charts'
import type { LiveHost } from './block'
import type { LiveLineChartProps, LiveLinePoint, LiveCursor } from './options'
import type { LiveState, LiveClock } from './state'
import { liveMetrics } from './state'
import type { Frame } from './live-frame'
import type { LiveRow } from './definition'
import { buildLiveYAxisDefinition } from './definition'
import { liveBuilt } from './built'
import { liveHostVars } from './host-style'
import { defaultFormatTime, defaultFormatValue } from './live-format'
import { createLivePulse, createLivePillFilter } from './pulse'
import { createLiveFocusResource } from './focus-resource'
import { createKeyboardHold } from '../kit/interaction/keyboard-hold'
import { applyChartStyle } from '../cartesian/style'

const renderer = motion({ initial: false })

export class LiveLineHost implements LiveHost<LiveLinePoint> {
  #props: LiveLineChartProps
  #configuration: LiveLineChartProps
  #state: LiveState
  #cursor: LiveCursor | null
  readonly #observeCursor: (cursor: LiveCursor | null) => void
  readonly #focusResource: ReturnType<typeof createLiveFocusResource>
  readonly #hold: ReturnType<typeof createKeyboardHold<LiveRow, Date, number>>
  readonly #root = document.createElement('div')
  readonly #surface = document.createElement('div')
  readonly #labels = document.createElement('div')
  readonly #style = document.createElement('style')
  readonly #observer: ResizeObserver
  readonly #clock: () => number
  readonly #wallClock: () => number
  readonly #observeClock: (clock: LiveClock) => void
  readonly #id: string
  readonly #observeTooltip: (tooltip: LiveTooltipValue | null) => void
  #lastTooltip: LiveTooltipValue | null = null
  readonly #pulse: ReturnType<typeof createLivePulse>
  readonly #releaseFilter: () => void
  #chart: ChartRendererHost<LiveRow, Date, number> | undefined
  #labelChart: ChartRendererHost<LiveRow, Date, number> | undefined
  #paintedFrame: Frame | null = null
  #labelDomain: readonly [number, number] | undefined
  #labelInterval = 0
  #width = 0
  #frame = 0
  #resizeFrame = 0
  #destroyed = false
  #clockNeeded = true
  #lastTime = 0
  #displayFrameMs = 1000 / 60
  #measureLeft = 8
  #bestFrame = Number.POSITIVE_INFINITY
  constructor(
    element: HTMLElement,
    props: LiveLineChartProps,
    id: string,
    state: LiveState,
    clock: () => number,
    observeSize: (size: number) => void,
    observeClock: (clock: LiveClock) => void,
    wallClock: () => number,
    observeTooltip: (tooltip: LiveTooltipValue | null) => void,
    observeCursor: (cursor: LiveCursor | null) => void,
    cursor: LiveCursor | null,
    needsClock: boolean,
  ) {
    this.#clockNeeded = needsClock
    this.#cursor = cursor
    this.#observeCursor = observeCursor
    this.#props = props
    this.#configuration = props
    this.#id = id
    this.#state = state
    this.#clock = clock
    this.#wallClock = wallClock
    this.#observeTooltip = observeTooltip
    this.#observeClock = observeClock
    this.#root.dataset.bkmChart = 'liveline'
    this.#root.dataset.uid = id
    this.#root.classList.add('w-full')
    this.#root.classList.add('relative')
    this.#labels.dataset.bkmLiveYlabels = ''
    this.#labels.setAttribute('aria-hidden', 'true')
    this.#labels.className = 'absolute inset-0 pointer-events-none'
    this.#root.append(this.#style, this.#labels, this.#surface)
    element.append(this.#root)
    this.#pulse = createLivePulse(this.#root)
    this.#releaseFilter = createLivePillFilter(this.#root)
    this.#observer = new ResizeObserver(() => {
      cancelAnimationFrame(this.#resizeFrame)
      this.#resizeFrame = requestAnimationFrame(() => {
        const width = Math.round(this.#root.getBoundingClientRect().width)

        if (width !== this.#width) {
          this.#width = width
          observeSize(width)
          this.#paint()

          if (this.#clockNeeded && this.#frame === 0)
            this.#frame = requestAnimationFrame(this.#tick)
        }
      })
    })
    this.#observer.observe(this.#root)
    this.#hold = createKeyboardHold(this.#root, () => this.#chart?.interaction)
    this.#focusResource = createLiveFocusResource(
      this.#root,
      () => {
        const { margin, innerHeight, plot } = liveMetrics(
          this.#props,
          this.#width,
          this.#state.state,
        )

        return {
          frame: this.#state.frame,
          roll: this.#state.state.roll,
          cursor: this.#cursor,
          left: margin.left,
          right: this.#width - margin.right,
          bottom: margin.top + innerHeight,
          x0: this.#state.frame?.xDomain[0] ?? 0,
          pxPerMs: plot.pxPerMs,
          top: margin.top,
          height: innerHeight,
        }
      },
      this.#clock,
    )
  }
  readonly #tick = (time: number) => {
    if (this.#destroyed) return
    const diff = time - this.#lastTime

    if (this.#measureLeft > 0) {
      if (this.#lastTime > 0 && diff >= 4) this.#bestFrame = Math.min(this.#bestFrame, diff)
      this.#measureLeft -= 1

      if (this.#measureLeft === 0 && this.#bestFrame <= 50)
        for (const hz of [30, 48, 50, 60, 72, 75, 90, 100, 120, 144, 165, 240]) {
          const period = 1000 / hz

          if (Math.abs(period - this.#bestFrame) < Math.abs(this.#displayFrameMs - this.#bestFrame))
            this.#displayFrameMs = period
        }
    }

    this.#lastTime = time
    this.#frame = requestAnimationFrame(this.#tick)
    this.#observeClock({
      timeOrigin: performance.timeOrigin,
      now: this.#clock(),
      wallNow: this.#wallClock(),
      timelineNow: time,
      displayFrameMs: this.#displayFrameMs,
    })
  }
  readonly #focus = (point: ChartPoint<LiveRow, Date, number> | null) => {
    this.#hold.onFocus(point?.datum.key === 'live:cursor' ? null : point)
    this.#observeCursor(
      point === null
        ? null
        : {
            key: point.datum.key,
            t: point.datum.t,
            v: point.datum.v,
            x: point.x,
            y: point.y,
            index: point.datumIndex,
          },
    )
  }
  readonly #tooltip = (target: ChartTooltipBodyTarget<LiveRow, Date, number> | null) => {
    const point = target?.points[0]

    const next =
      point === undefined || target === null
        ? null
        : {
            time: point.xValue.getTime(),
            value: point.yValue,
            x: point.x,
            y: point.y,
            pinned: target.pinned,
          }

    const previous = this.#lastTooltip

    if (previous === null && next === null) return

    if (
      previous !== null &&
      next !== null &&
      Math.round(previous.x) === Math.round(next.x) &&
      Math.round(previous.y) === Math.round(next.y) &&
      previous.pinned === next.pinned
    )
      return
    this.#lastTooltip = next
    this.#observeTooltip(next)
  }
  #paint() {
    if (this.#destroyed) return

    const props = this.#props,
      state = this.#state,
      frame = state.frame

    const { margin, height, innerHeight, plot, yAxis } = liveMetrics(
      props,
      this.#width,
      state.state,
    )

    this.#root.className = [
      'relative w-full [height:var(--bkm-live-height)]',
      props.className ?? '',
    ]
      .filter(Boolean)
      .join(' ')
    this.#root.style.setProperty('--bkm-live-height', `${height}px`)
    applyChartStyle(this.#root, props.style)

    if (frame === null) {
      this.#pulse.hide()
      this.#chart?.destroy()
      this.#chart = undefined
      this.#paintedFrame = null
      this.#labelChart?.destroy()
      this.#labelChart = undefined

      return
    }

    const line = props.children.find((c) => c.kind === 'liveLine')?.props
    const xAxis = props.children.find((c) => c.kind === 'liveXAxis')?.props
    const tooltip = props.children.find((c) => c.kind === 'tooltip')?.props

    const stroke =
      line?.momentumColors?.[frame.momentum] ?? line?.stroke ?? 'var(--chart-line-primary)'

    const dotColor =
      line?.momentumColors?.[frame.momentum] ??
      (frame.momentum === 'up'
        ? 'var(--chart-1)'
        : frame.momentum === 'down'
          ? 'var(--chart-5)'
          : stroke)

    const formatValue = line?.formatValue ?? defaultFormatValue
    const formatTime = xAxis?.formatTime ?? defaultFormatTime

    if (this.#paintedFrame !== frame) {
      this.#paintedFrame = frame
      this.#pulse.update(
        frame,
        dotColor,
        line?.dotSize ?? 4,
        this.#width,
        innerHeight,
        plot.plotMargin,
        line?.pulse !== false,
      )

      const result = liveBuilt({
        frame,
        width: this.#width,
        margin,
        plotMargin: plot.plotMargin,
        innerHeight,
        windowSecs: props.window ?? 30,
        numXTicks: props.numXTicks ?? 5,
        lerpSpeed: props.lerpSpeed ?? 0.08,
        pxPerMs: plot.pxPerMs,
        uid: this.#id,
        dataKey: line?.dataKey ?? props.dataKey ?? 'value',
        momentumStroke: stroke,
        dotColor,
        line,
        xAxis,
        yAxis,
        tooltipCfg: tooltip,
        tooltipEnabled: tooltip !== undefined,
        formatValue,
        formatTime,
      })

      if (result.built === null) return
      this.#style.textContent = result.headCss

      if (!frame.seed) this.#root.dataset.bkmRolling = ''
      else delete this.#root.dataset.bkmRolling

      if (frame.jump && !frame.seed) this.#root.dataset.bkmJump = String(frame.parity)
      else delete this.#root.dataset.bkmJump

      if (!frame.seed) this.#root.dataset.bkmRoll = String(frame.parity)
      else delete this.#root.dataset.bkmRoll
      applyChartStyle(
        this.#root,
        liveHostVars({
          frame,
          pad: result.pad,
          bklitWidth: plot.bklitWidth,
          plotRight: plot.plotRight,
          plotLeft: margin.left,
          clipExt: plot.clipExt,
          lerpSpeed: props.lerpSpeed ?? 0.08,
          introEaseCss: result.introEaseCss,
          fillRamp: result.built.fillRamp,
        }),
      )

      const options = {
        idPrefix: this.#id,
        definition: result.built.definition,
        onFocusChange: this.#focus,
        width: this.#width,
        height,
        renderer,
        onTooltipBodyChange: this.#tooltip,
        ariaLabel: props.ariaLabel ?? 'Live line chart',
        ...(props.ariaDescription === undefined ? {} : { ariaDescription: props.ariaDescription }),
      }

      if (this.#chart === undefined) this.#chart = mountChartRenderer(this.#surface, options)
      else this.#chart.update(options)
    }

    this.#focusResource.apply()

    if (this.#labelDomain !== state.labelDomain || this.#labelInterval !== state.labelInterval) {
      this.#labelDomain = state.labelDomain
      this.#labelInterval = state.labelInterval
      const ticks = state.labelValues
      const format = yAxis?.formatValue ?? formatValue
      const widest = Math.max(0, ...ticks.map((v) => format(v).length)) * 7.2
      const labelBox = (yAxis?.position === 'right' ? margin.right : margin.left) - 8

      const definition = buildLiveYAxisDefinition({
        xDomain: frame.xDomain,
        yDomain: state.labelDomain,
        margin: plot.plotMargin,
        formatValue: format,
        yPosition: yAxis?.position ?? 'left',
        yTicks: [...ticks, ...state.leavingLabels].sort((a, b) => a - b),
        yLeaving: state.leavingLabels,
        yLabelPad: 8 + plot.labelShift - Math.max(0, widest - labelBox),
        plotHeight: innerHeight,
      })

      const options = {
        idPrefix: `${this.#id}-ylabels`,
        definition,
        width: this.#width,
        height,
        renderer,
        ariaLabel: '',
        tabIndex: -1,
      }

      if (this.#labelChart === undefined)
        this.#labelChart = mountChartRenderer(this.#labels, options)
      else this.#labelChart.update(options)
    }
  }
  configure(props: LiveLineChartProps) {
    if (props === this.#configuration) return
    this.#configuration = props
    this.#props = props
    this.#paintedFrame = null
    this.#labelDomain = undefined
    this.#paint()
  }
  update(
    data: ReadonlyArray<LiveLinePoint>,
    _focus: number | null,
    state: LiveState,
    cursor: LiveCursor | null,
    needsClock: boolean,
  ) {
    this.#props = { ...this.#props, data }
    this.#clockNeeded = needsClock

    if (needsClock && this.#frame === 0) this.#frame = requestAnimationFrame(this.#tick)

    if (!needsClock) {
      cancelAnimationFrame(this.#frame)
      this.#frame = 0
    }

    this.#state = state
    this.#cursor = cursor
    this.#paint()
  }
  destroy() {
    if (this.#destroyed) return
    this.#destroyed = true
    cancelAnimationFrame(this.#frame)
    cancelAnimationFrame(this.#resizeFrame)
    this.#observer.disconnect()
    this.#chart?.destroy()
    this.#labelChart?.destroy()
    this.#focusResource.destroy()
    this.#hold.destroy()
    this.#pulse.destroy()
    this.#releaseFilter()
    this.#root.remove()
  }
}
