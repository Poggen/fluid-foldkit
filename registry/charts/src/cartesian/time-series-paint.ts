import { cartesianCssScope } from './css-scope'
import { hoverStaticCss } from './hover-css'
import { loadingCss } from './loading-css'
import { propsFor } from './table'
import { keyIs, CLS } from '../kit/renderer-dom'
import { keyAttr } from './build-state'
import { pillTickStaticCss, writePillSameLabel } from './pill-ticks'
import type { ChartTooltipProps } from './tooltip-options'
import type { Margin } from './context-types'
import { Option } from 'effect'
import type { CartesianSnapshot } from './definition'
import type { Interaction } from './state'
import type { TimeSeriesProps } from './root-options'
import type { HoverOverlay } from './hover-overlay'
import type { bandSpring } from './band-spring'
import { toDate } from './series'
import { markerRevealDuration } from './reveal-transition'

export const timeSeriesResourceCss: <Row>(
  id: string,
  next: CartesianSnapshot<Row>,
  props: TimeSeriesProps<Row>,
  tooltip: Pick<ChartTooltipProps, 'showDatePill'> | undefined,
  focusTicks?: boolean,
) => string = function <Row>(
  id: string,
  next: CartesianSnapshot<Row>,
  props: TimeSeriesProps<Row>,
  tooltip: Pick<ChartTooltipProps, 'showDatePill'> | undefined,
  focusTicks = false,
) {
  const scope = cartesianCssScope(id).selector

  const [first, last] = next.domains.x
  const span = last.getTime() - first.getTime() || 1

  const stagger = next.series
    .filter((series) => series.showMarkers)
    .flatMap((series) => {
      const { marker } = series
      const ring = marker.strokeWidth > 0 ? marker.ringGap + marker.strokeWidth : 0

      const extent =
        marker.radius +
        ring +
        marker.outlineWidth +
        (marker.showActiveHighlight ? marker.radius * 0.35 : 0) +
        2

      return next.hover.times.map((time, index) => {
        const cx = ((time - first.getTime()) / span) * next.innerWidth
        const fraction = next.innerWidth > 0 ? Math.max(0, cx - extent) / next.innerWidth : 0

        const selectors = ['marker', 'marker-ring', 'marker-out']
          .map((part) => keyIs(keyAttr(`${series.id}:${part}:${index}`)))
          .join(',')

        return `${scope} ${CLS.marks} :is(${selectors}){--bkm-mk:${fraction}}`
      })
    })
    .join('')

  return ((focusTicks
    ? `${scope}{--bkm-marker-stagger-ms:${markerRevealDuration(props.enterTransition, props.animationDuration ?? 1100)}ms}`
    : '') +
    (next.resourceCss ?? '') +
    hoverStaticCss(scope, next.hover) +
    (focusTicks ? '' : loadingCss(scope, next.series)) +
    stagger +
    (focusTicks || (tooltip !== undefined && tooltip.showDatePill !== false)
      ? pillTickStaticCss(
          scope,
          propsFor(props.children, 'xAxis')[0]?.tickerHalfWidth ?? 50,
          focusTicks ? 'focus' : 'pill',
        )
      : '')) satisfies string
}

const writeFocusCenter: <Row>(
  element: HTMLElement,
  snapshot: CartesianSnapshot<Row>,
  activeRow: Row | undefined,
  fallback: number,
) => void = function writeFocusCenter<Row>(
  element: HTMLElement,
  snapshot: CartesianSnapshot<Row>,
  activeRow: Row | undefined,
  fallback: number,
) {
  const candle = snapshot.candleGeometry

  if (candle === undefined) {
    element.style.setProperty('--bkm-hx', fallback.toFixed(2))
  } else {
    const center =
      activeRow === undefined ? undefined : candle.centers[snapshot.rows.indexOf(activeRow)]

    if (center === undefined) {
      element.style.removeProperty('--bkm-hx')
    } else {
      element.style.setProperty('--bkm-hx', String(center))
    }
  }
}

export const paintTimeSeriesFocus: <Row extends Readonly<Record<string, unknown>>>(
  argument0: TimeSeriesFocusPaint<Row>,
) => boolean = function paintTimeSeriesFocus<Row extends Readonly<Record<string, unknown>>>({
  element,
  state,
  data,
  focusedIndex,
  props,
  snapshot,
  overlay,
  band,
  bandActive,
}: TimeSeriesFocusPaint<Row>) {
  const row = focusedIndex === null ? undefined : data[focusedIndex]
  const active = row !== undefined && state.revealReady && state.phase === 'ready'
  const activeRow = active ? row : undefined
  const x = props.x ?? ((item: Row) => toDate(item[props.xDataKey ?? 'date']))

  overlay.focus(activeRow === undefined ? null : x(activeRow).getTime(), activeRow ?? null)

  if (active && snapshot?.hoverEnabled !== false) {
    element.dataset.bkmHover = ''
  } else {
    delete element.dataset.bkmHover
  }

  const dragging = Option.getOrNull(state.selection)?.active === true

  if (dragging) {
    element.dataset.bkmDrag = ''
  } else {
    delete element.dataset.bkmDrag
  }

  if (snapshot === undefined) {
    delete element.dataset.bkmSegon

    return bandActive satisfies boolean
  }

  const range = focusBandRange(snapshot, state.selection, activeRow, x)

  if (range.dragging) {
    const lo = Math.min(range.a, range.b)
    const hi = Math.max(range.a, range.b)

    element.style.setProperty('--bkm-hl0', lo.toFixed(2))
    element.style.setProperty('--bkm-hl1', hi.toFixed(2))

    if (hi - lo > 5) {
      element.dataset.bkmSegon = ''
    } else {
      delete element.dataset.bkmSegon
    }
  } else {
    delete element.dataset.bkmSegon
  }

  band.set(Math.min(range.a, range.b), Math.max(range.a, range.b), !bandActive)

  if (active) {
    writeFocusCenter(element, snapshot, activeRow, range.px(range.time))

    writePillSameLabel(element, snapshot.tickTimes, range.time, range.px)
  }

  return (active || range.dragging) satisfies boolean
}

export const paintTimeSeriesGeometry: (
  element: HTMLElement,
  next: Pick<
    CartesianSnapshot<never>,
    'resourceAttrs' | 'resourceStyle' | 'innerWidth' | 'margin' | 'gridAttrs'
  >,
  duration: number,
) => Margin = function paintTimeSeriesGeometry(
  element: HTMLElement,
  next: Pick<
    CartesianSnapshot<never>,
    'resourceAttrs' | 'resourceStyle' | 'innerWidth' | 'margin' | 'gridAttrs'
  >,
  duration: number,
) {
  for (const [name, value] of Object.entries(next.resourceAttrs ?? {})) {
    element.setAttribute(name, value)
  }

  for (const [name, value] of Object.entries(next.resourceStyle ?? {})) {
    element.style.setProperty(name, value)
  }

  const { margin } = next
  element.style.setProperty('--bkm-wipe-w', `${next.innerWidth}px`)
  element.style.setProperty('--bkm-enter-ms', `${duration}ms`)
  element.style.setProperty(
    '--bkm-plot-clip',
    `inset(${margin.top}px ${margin.right}px ${margin.bottom - 20}px ${margin.left}px)`,
  )
  element.style.setProperty(
    '--bkm-clip',
    `inset(${margin.top}px ${margin.right}px ${margin.bottom}px ${margin.left}px)`,
  )

  for (const [attribute, value] of Object.entries(next.gridAttrs)) {
    if (value === undefined) {
      element.removeAttribute(attribute)
    } else {
      element.setAttribute(attribute, value)
    }
  }

  return margin
}

function focusBandRange<Row>(
  snapshot: CartesianSnapshot<Row>,
  selection: Interaction['selection'],
  activeRow: Row | undefined,
  x: (row: Row) => Date,
) {
  const range = Option.getOrNull(selection)
  const dragging = range?.active === true
  const time = activeRow === undefined ? 0 : x(activeRow).getTime()
  const index = snapshot.rows.findIndex((item) => x(item).getTime() === time)
  const previous = snapshot.rows[Math.max(0, index - 1)]
  const next = snapshot.rows[Math.min(snapshot.rows.length - 1, index + 1)]
  let left = time
  let right = time

  if (dragging) {
    left = range.startX
    right = range.endX
  } else {
    if (previous !== undefined) {
      left = x(previous).getTime()
    }

    if (next !== undefined) {
      right = x(next).getTime()
    }
  }

  const px = (value: number) =>
    snapshot.margin.left +
    ((value - snapshot.domains.x[0].getTime()) /
      (snapshot.domains.x[1].getTime() - snapshot.domains.x[0].getTime() || 1)) *
      snapshot.innerWidth

  const a = dragging ? snapshot.margin.left + left : px(left)
  const b = dragging ? snapshot.margin.left + right : px(right)

  return { a, b, time, px, dragging }
}

interface TimeSeriesFocusPaint<Row> {
  readonly element: HTMLElement
  readonly state: Interaction
  readonly data: ReadonlyArray<Row>
  readonly focusedIndex: number | null
  readonly props: TimeSeriesProps<Row>
  readonly snapshot: CartesianSnapshot<Row> | undefined
  readonly overlay: Pick<HoverOverlay<Row>, 'focus'>
  readonly band: Pick<ReturnType<typeof bandSpring>, 'set'>
  readonly bandActive: boolean
}
