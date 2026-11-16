import type { ChartLayerRenderer } from '@tanstack/charts'
import type { RadarRow } from './rows'
import { buildDefinition } from './definition'
import { extract } from './extract'
import { radarAreaColor } from './area'
import type { RadarChartProps } from './options'

export function radarDefinition(
  props: RadarChartProps,
  areaRenderer?: ChartLayerRenderer<RadarRow, string | number, number>,
) {
  const { areas, ...parts } = extract(props.children)

  return buildDefinition({
    ...(areaRenderer === undefined ? {} : { areaRenderer }),
    ...(parts.grid === undefined ? {} : { grid: parts.grid }),
    ...(parts.axis === undefined ? {} : { axis: parts.axis }),
    ...(parts.labels === undefined ? {} : { labels: parts.labels }),
    motionReplayKey: props.motionReplayKey ?? '',
    data: props.data,
    metrics: props.metrics,
    areas: areas
      .map((area, role) => ({ ...area, role }))
      .filter((a) => Number.isInteger(a.index) && a.index >= 0 && a.index < props.data.length)
      .map((a) => ({
        ...a,
        color: radarAreaColor(a, props.data),
        showGlow: a.showGlow ?? true,
        showPoints: a.showPoints ?? true,
        showStroke: a.showStroke ?? true,
      })),
    levels: props.levels ?? 5,
    margin: props.margin ?? 60,
    radius: Math.max(1, ((props.size ?? 400) - (props.margin ?? 60) * 2) / 2),
    animate: props.animate ?? true,
    enterDurationMs: props.enterDurationMs ?? 1100,
    staggerScale: props.staggerScale ?? 1,
    ...(props.enterTransition === undefined ? {} : { enterTransition: props.enterTransition }),
  })
}
