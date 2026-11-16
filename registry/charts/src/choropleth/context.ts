import { geoPath } from 'd3-geo'
import type { GeoPermissibleObjects } from 'd3-geo'
import type { Html } from 'foldkit/html'
import type { ChoroplethChartProps, ChoroplethContextValue, ChoroplethTooltipData } from './types'
import type { State } from './block'
import { makeProjection } from './projection'
import { centroidOf } from './focus'

export interface ChoroplethActions<Action = void> {
  readonly hover: (index: number | null) => Action
  readonly transform: (scale: number, x: number, y: number) => Action
}

export function choroplethContext<Action>(
  props: ChoroplethChartProps,
  state: State,
  actions: ChoroplethActions<Action>,
  container: HTMLDivElement | null,
): ChoroplethContextValue<Action> {
  const margin = { top: 0, right: 0, bottom: 0, left: 0, ...props.margin }

  const bounds = {
    x: margin.left,
    y: margin.top,
    width: state.width - margin.left - margin.right,
    height: state.height - margin.top - margin.bottom,
  }

  const projection = makeProjection(bounds, {
      center: props.center ?? [0, 20],
      scale: props.scale,
      translate: props.translate,
      k: state.scale,
      tx: state.translateX,
      ty: state.translateY,
    }),
    path = geoPath(projection)

  const raw = (geo: GeoPermissibleObjects): string | null => path(geo)
  let paths: Array<string | null> | undefined

  const feature =
      state.hoveredIndex === null ? undefined : props.data.features.at(state.hoveredIndex),
    point = feature === undefined ? undefined : projection([...centroidOf(feature)])

  const baseProjection = makeProjection(bounds, {
    center: props.center ?? [0, 20],
    scale: props.scale,
    translate: props.translate,
    k: 1,
    tx: 0,
    ty: 0,
  })

  const base = feature === undefined ? null : baseProjection([...centroidOf(feature)])

  const tooltipData =
    feature === undefined || point === null || point === undefined
      ? null
      : {
          feature,
          featureIndex: state.hoveredIndex ?? 0,
          x: Math.max(bounds.x + 60, Math.min(bounds.x + bounds.width - 60, base?.[0] ?? point[0])),
          y: Math.max(
            bounds.y + 60,
            Math.min(bounds.y + bounds.height - 60, base?.[1] ?? point[1]),
          ),
        }

  const setTooltipData = (
    next:
      | ChoroplethTooltipData
      | null
      | ((value: ChoroplethTooltipData | null) => ChoroplethTooltipData | null),
  ) => {
    const value = typeof next === 'function' ? next(tooltipData) : next

    return actions.hover(value?.featureIndex ?? null)
  }

  return {
    features: props.data.features,
    featureCollection: props.data,
    get featurePaths() {
      return (paths ??= props.data.features.map(raw))
    },
    pathGenerator: (feature) => raw(feature) ?? undefined,
    rawPathGenerator: raw,
    projectPoint: (coords) => {
      const point = projection(coords)

      return point && point.every(Number.isFinite) ? point : null
    },
    unprojectPoint: (point) => {
      const coords = projection.invert?.(point)

      return coords && coords.every(Number.isFinite) ? coords : null
    },
    width: state.width,
    height: state.height,
    innerWidth: Math.max(0, bounds.width),
    innerHeight: Math.max(0, bounds.height),
    margin,
    containerRef: { current: container },
    isLoaded: state.entered,
    animationDuration: props.animationDuration ?? 800,
    ...(props.enterTransition === undefined ? {} : { enterTransition: props.enterTransition }),
    revealEpoch: state.epoch,
    hoveredFeatureIndex: state.hoveredIndex,
    setHoveredFeatureIndex: actions.hover,
    tooltipData,
    setTooltipData,
  }
}

export const useChoropleth = <Action>(
  context: ChoroplethContextValue<Action>,
): ChoroplethContextValue<Action> => context

export const ChoroplethProvider = <Action>({
  value,
  children,
}: {
  readonly value: ChoroplethContextValue<Action>
  readonly children: (value: ChoroplethContextValue<Action>) => Html
}): Html => children(value)
