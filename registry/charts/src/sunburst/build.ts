import { createChartCursor } from '@tanstack/charts/cursor'
import type { ChartPoint } from '@tanstack/charts'
import { buildDefinition } from './definition'
import { buildArcs, defaultSunburstGrowPadding } from './arcs'
import type { SunburstChartProps } from './props'
import type { State } from './block'
import { createSectorFeed, createSectorLayer } from './sunburst-layer'
import type { SunburstNativeNode, SectorTrail } from './sunburst-mark'
import type { SectorPush } from './push'
import { createHoverGrowth } from './hover-growth'
import {
  defaultSunburstColors,
  sunburstCssVars,
  opacityForRelativeDepth,
  withAlpha,
} from './colors'
import type { SunburstSegmentProps, SunburstLabelsProps } from './carriers'

export function sunburstPlan(props: SunburstChartProps, state: State) {
  const model = buildArcs(props.data),
    focus =
      model.focusById.get(props.focusId ?? state.focusId ?? model.rootId) ??
      model.focusById.get(model.rootId)

  if (focus === undefined) throw new TypeError('Sunburst root focus missing')
  const segments = new Map<number, SunburstSegmentProps>()

  let labels: SunburstLabelsProps | null = null,
    hasCenter = false

  for (const child of props.children)
    switch (child.role) {
      case 'segment':
        segments.set(child.props.index, child.props)
        break
      case 'labels':
        labels = child.props
        break
      case 'center':
        hasCenter = true
        break
    }

  const size = props.size ?? 520,
    unit = state.width > 0 ? state.width / size : 1

  const fillOf = (id: string) => {
    const arc = model.arcs.find((arc) => arc.id === id)

    if (arc === undefined) return sunburstCssVars.slice1

    const override = segments.get(arc.arcIndex),
      base =
        override?.fill ??
        override?.color ??
        arc.fill ??
        arc.color ??
        defaultSunburstColors.at(arc.categoryIndex % defaultSunburstColors.length) ??
        sunburstCssVars.slice1

    return withAlpha(
      base,
      override?.fillOpacity ?? opacityForRelativeDepth(arc.depth - focus.depth),
    )
  }

  const segmentRoles = model.arcs.map((arc) => {
    const role = segments.get(arc.arcIndex)
    const base =
      role?.fill ??
      role?.color ??
      arc.fill ??
      arc.color ??
      defaultSunburstColors.at(arc.categoryIndex % defaultSunburstColors.length) ??
      sunburstCssVars.slice1
    return {
      index: arc.arcIndex,
      fill: withAlpha(base, role?.fillOpacity ?? opacityForRelativeDepth(arc.depth - focus.depth)),
    }
  })

  return {
    segmentRoles,
    model,
    focus,
    segments,
    labels,
    hasCenter,
    size,
    unit,
    fillOf,
    padding:
      (props.padding ?? defaultSunburstGrowPadding(model.maxDepth, size, props.hoverPop ?? 8)) *
      unit,
    hoverPop: (props.hoverPop ?? 8) * unit,
    sweepMs:
      props.enterTransition?.duration === undefined ? 1100 : props.enterTransition.duration * 1000,
  }
}

export function sunburstResources(size: number, now: () => number) {
  const trail: SectorTrail = new Map()

  const feed = createSectorFeed(size),
    renderStart: { current: number | null } = { current: null }

  return {
    feed,
    hover: createHoverGrowth(feed),
    renderStart,
    sectorRenderer: createSectorLayer(feed, renderStart, now),
    controller: createChartCursor<number, number>(),
    registry: new Map<string, ChartPoint<SunburstNativeNode, number, number>>(),
    pushes: new Map<string, SectorPush>(),
    trail,
  }
}

export { buildDefinition }

export function sameSunburstDrawing(a: SunburstChartProps, b: SunburstChartProps): boolean {
  const values = (p: SunburstChartProps) => [
    p.data,
    p.size,
    p.focusId,
    p.hoverPop,
    p.padding,
    p.enterTransition?.duration,
    p.enterStaggerScale,
    p.hoveredIndex === undefined,
    ...p.children.flatMap((child) =>
      child.role === 'segment'
        ? [child.props.index, child.props.color, child.props.fill, child.props.fillOpacity]
        : child.role === 'labels'
          ? [child.props.fontSize, child.props.fill, child.props.stroke, child.props.strokeWidth]
          : child.role === 'center'
            ? ['center']
            : [],
    ),
  ]

  const left = values(a),
    right = values(b)

  return (
    left.length === right.length && left.every((value, index) => Object.is(value, right[index]))
  )
}
