// Derived from Fluid Functionalism 200b4534 and its pinned Base UI primitive. MIT.
import { Option, Schema } from 'effect'

export const ScrollOrientation = Schema.Literals(['vertical', 'horizontal', 'both'])

export const ScrollAxis = Schema.Literals(['x', 'y'])

export const ScrollSettings = Schema.Struct({
  orientation: ScrollOrientation,
  direction: Schema.Literals(['ltr', 'rtl']),
})

export interface ScrollAreaConfig {
  readonly id: string
  readonly orientation?: typeof ScrollOrientation.Type
  readonly direction?: 'ltr' | 'rtl'
}

export const ScrollMeasurement = Schema.Struct({
  width: Schema.Finite,
  height: Schema.Finite,
  scrollWidth: Schema.Finite,
  scrollHeight: Schema.Finite,
  left: Schema.Finite,
  top: Schema.Finite,
  trackX: Schema.Finite,
  trackY: Schema.Finite,
  paddingX: Schema.Finite,
  paddingY: Schema.Finite,
  marginX: Schema.Finite,
  marginY: Schema.Finite,
})

export const ScrollDrag = Schema.Struct({
  pointer: Schema.Int,
  axis: ScrollAxis,
  start: Schema.Finite,
  position: Schema.Finite,
  trackStart: Schema.Finite,
  thumbOffset: Schema.Finite,
})

export const ScrollAreaModel = Schema.Struct({
  id: Schema.String,
  settings: ScrollSettings,
  geometry: ScrollMeasurement,
  touch: Schema.Boolean,
  ready: Schema.Boolean,
  hovered: Schema.Boolean,
  scrollingX: Schema.Boolean,
  scrollingY: Schema.Boolean,
  generationX: Schema.Natural,
  generationY: Schema.Natural,
  drag: Schema.OptionFromNullOr(ScrollDrag),
})

export type ScrollAreaModel = typeof ScrollAreaModel.Type

export const emptyScrollGeometry: typeof ScrollMeasurement.Type = {
  width: 0,
  height: 0,
  scrollWidth: 0,
  scrollHeight: 0,
  left: 0,
  top: 0,
  trackX: 0,
  trackY: 0,
  paddingX: 0,
  paddingY: 0,
  marginX: 8,
  marginY: 8,
}

export function scrollSettings(config: ScrollAreaConfig): typeof ScrollSettings.Type {
  return {
    orientation: config.orientation ?? 'vertical',
    direction: config.direction ?? 'ltr',
  }
}

export function scrollAreaInitial(config: ScrollAreaConfig): ScrollAreaModel {
  return {
    id: config.id,
    settings: scrollSettings(config),
    geometry: emptyScrollGeometry,
    touch: false,
    ready: false,
    hovered: false,
    scrollingX: false,
    scrollingY: false,
    generationX: 0,
    generationY: 0,
    drag: Option.none(),
  }
}

export function scrollAxisMetrics(model: ScrollAreaModel, axis: typeof ScrollAxis.Type) {
  const g = model.geometry
  const viewport = axis === 'x' ? g.width : g.height
  const content = axis === 'x' ? g.scrollWidth : g.scrollHeight
  const track = (axis === 'x' ? g.trackX : g.trackY) || viewport
  const padding = axis === 'x' ? g.paddingX : g.paddingY
  const margin = axis === 'x' ? g.marginX : g.marginY
  const ratio = content === 0 ? 0 : viewport / content

  const restingSize = Math.max(16, Math.min(track, viewport - padding - margin) * ratio)

  const maximum = Math.max(0, content - viewport)
  const raw = axis === 'x' ? g.left : g.top
  const rtl = axis === 'x' && model.settings.direction === 'rtl'
  const position = Math.max(rtl ? -maximum : 0, Math.min(rtl ? 0 : maximum, raw))
  const travel = Math.max(0, track - padding - margin - restingSize)
  const fromStart = rtl ? -raw : raw
  const clamped = Math.max(0, Math.min(maximum, fromStart))
  const overscroll = fromStart - clamped

  const size = Math.max(16, (restingSize * content) / (content + Math.abs(overscroll) || 1))

  const offset =
    maximum === 0
      ? 0
      : (rtl ? -1 : 1) * ((clamped / maximum) * travel + (overscroll > 0 ? restingSize - size : 0))

  return {
    viewport,
    content,
    track,
    padding,
    margin,
    size,
    maximum,
    position,
    travel,
    offset,
    rtl,
    restingSize,
  }
}

export function scrollPointerPosition(model: ScrollAreaModel, coordinate: number): number {
  if (Option.isNone(model.drag)) return 0
  const drag = model.drag.value
  const metric = scrollAxisMetrics(model, drag.axis)

  if (metric.travel <= 0) return 0

  const delta = coordinate - drag.start
  const next = drag.position + (delta / metric.travel) * metric.maximum

  return Math.max(metric.rtl ? -metric.maximum : 0, Math.min(metric.rtl ? 0 : metric.maximum, next))
}

export function scrollBarPolicy(
  model: ScrollAreaModel,
  axis: typeof ScrollAxis.Type,
  keepMounted = false,
) {
  const metric = scrollAxisMetrics(model, axis)
  const overflow = metric.content > metric.viewport

  if (model.touch) return { mounted: false, visible: false, overflow }

  return {
    mounted: overflow || keepMounted,
    visible: model.hovered || (axis === 'x' ? model.scrollingX : model.scrollingY),
    overflow,
  }
}
