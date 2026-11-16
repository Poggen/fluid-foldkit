import type { DomChartDefinition } from '@tanstack/charts'
import { defineChart } from '@tanstack/charts/scene'
import { polar, radialArc } from '@tanstack/charts/polar'
import { ringArcGenerator } from './arc'
import type { RingArcRow } from './arc'
import type { RingChartProps } from './options'
import { defaultRingColors } from './options'
import { ringGeometry } from './geometry'
import { createAnnularFocus } from '../pie/private/focus'
import { createRingLayer } from './layer'

export function buildRingDefinition(
  props: RingChartProps,
  size: number,
  runtime: {
    readonly layer?: ReturnType<typeof createRingLayer>
    readonly clock: () => number
    readonly renderStart: { readonly current: number | null }
    readonly claim: { current: object | null }
    readonly hovered: () => number | null
    readonly scaleOf: (index: number, hovered: number | null) => number
  },
) {
  const { rows, fit } = ringGeometry(props, size)
  const generator = ringArcGenerator(fit)

  const resource = runtime.layer ?? createRingLayer()
  resource.configure(props, size)
  const layer = resource.renderer

  const marks = rows.map((row) =>
    radialArc([row], {
      className: `bkm-rg-arc bkm-rg-${row.ringIndex} bkm-rg-${row.kind}`,
      fill: (d) => d.fill,
      generator,
      id: `ring:${row.key}`,
      key: (d) => `ring:${d.key}`,
      motion: false,
      renderer: layer,
    }),
  )

  const spec = {
    focus: createAnnularFocus<RingArcRow>({
      center: size / 2,
      indexOf: (d) => d.ringIndex,
      focusable: (p) => p.markId.startsWith('ring:ring-'),
      navigable: (p) => p.markId.endsWith('-track'),
      hovered: runtime.hovered,
      scaleOf: runtime.scaleOf,
      targets: rows.flatMap((r) =>
        r.kind === 'track'
          ? [
              {
                index: r.ringIndex,
                innerRadius: r.innerRadius * fit,
                outerRadius: r.outerRadius * fit,
                startAngle: r.startAngle,
                endAngle: r.endAngle,
              },
            ]
          : [],
      ),
    }),
    focusRing: false,
    guides: false,
    marks: [
      polar({ id: 'ring', inset: 8, marks, radiusRatio: 1, scales: { angle: null, radius: null } }),
    ],
    scales: { x: null, y: null },
    theme: { palette: defaultRingColors },
    tooltip: false,
  } satisfies DomChartDefinition<RingArcRow, number, number>

  return defineChart(spec, { focus: spec.focus })
}
