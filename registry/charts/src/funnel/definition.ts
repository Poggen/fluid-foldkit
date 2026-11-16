import { defineChart } from '@tanstack/charts/scene'
import type { DomChartDefinition } from '@tanstack/charts'
import { scaleLinear } from '@tanstack/charts/scales/linear'
import { createFunnelFocus } from './focus'
import type { FunnelDatum } from './focus'
import { buildFunnelGradients, createFunnelMark } from './marks'
import type { FunnelMarkConfig } from './marks'
import type { FunnelChartProps } from './options'

export function funnelDefinition(props: FunnelChartProps, id: string, measureText: boolean) {
  const horizontal = props.orientation !== 'vertical'
  const stage = scaleLinear().domain(horizontal ? [0, props.data.length] : [props.data.length, 0])
  const cross = scaleLinear().domain([-0.5, 0.5])
  const g = props.grid === true ? {} : props.grid || undefined

  const grid: FunnelMarkConfig['grid'] =
    g === undefined
      ? null
      : {
          bands: g.bands ?? true,
          bandColor: g.bandColor ?? 'var(--bkm-muted)',
          lines: g.lines ?? true,
          lineColor: g.lineColor ?? 'var(--chart-grid)',
          lineOpacity: g.lineOpacity ?? 1,
          lineWidth: g.lineWidth ?? 1,
        }

  const spec = {
    focus: createFunnelFocus(horizontal),
    focusRing: false,
    gradients: buildFunnelGradients(props.data, horizontal),
    guides: false,
    margin: { bottom: 0, left: 0, right: 0, top: 0 },
    marks: [
      createFunnelMark({
        color: props.color ?? 'var(--chart-1)',
        curved: props.edges !== 'straight',
        formatPercentage: props.formatPercentage ?? ((pct) => `${Math.round(pct)}%`),
        formatValue: props.formatValue ?? ((value) => value.toLocaleString('en-US')),
        gapPx: props.gap ?? 4,
        grid,
        horizontal,
        labelAlign: props.labelAlign ?? 'center',
        labelLayout: props.labelLayout ?? 'spread',
        labelOrientation: props.labelOrientation,
        layers: Math.max(1, props.layers ?? 3),
        measureText,
        patternPrefix: props.renderPattern === undefined ? undefined : `${id}-fp`,
        showLabels: props.showLabels ?? true,
        showPercentage: props.showPercentage ?? true,
        showValues: props.showValues ?? true,
        stages: props.data,
      }),
    ],
    scales: horizontal
      ? { x: { scale: stage }, y: { scale: cross } }
      : { x: { scale: cross }, y: { scale: stage } },
  } satisfies DomChartDefinition<FunnelDatum, number, number>

  return defineChart(spec, { focus: spec.focus })
}
