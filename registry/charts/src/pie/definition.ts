import { pie as d3Pie } from 'd3-shape'
import { defineChart } from '@tanstack/charts/scene'
import { polar, radialArc } from '@tanstack/charts/polar'
import type { DomChartDefinition } from '@tanstack/charts'
import { pieArcGenerator, pieArcPath } from './arc'
import type { PieArcRow } from './arc'
import { createAnnularFocus } from './private/focus'
import type { PieChartProps, PieArcData, PieSliceProps } from './options'
import { defaultPieColors } from './options'

export const DEFAULT_HOVER_OFFSET = 10

export const scopePaint: (paint: string, id: string) => string = (paint: string, id: string) =>
  paint.replace(/url\(#([^)]*)\)/g, `url(#${id}-$1)`)

export function pieGeometry(props: PieChartProps, size: number, id: string) {
  const hoverOffset = props.hoverOffset ?? 10
  const innerRadius = props.innerRadius ?? 0
  const cornerRadius = props.cornerRadius ?? 0

  const arcs: ReadonlyArray<PieArcData> = d3Pie<(typeof props.data)[number]>()
    .value((d) => d.value)
    .startAngle(props.startAngle ?? -Math.PI / 2)
    .endAngle(props.endAngle ?? (3 * Math.PI) / 2)
    .padAngle(props.padAngle ?? 0)
    .sort(null)([...props.data])
    .map((a, index) => ({
      data: a.data,
      index,
      startAngle: a.startAngle,
      endAngle: a.endAngle,
      padAngle: a.padAngle,
      value: a.value,
    }))

  const configByIndex = new Map<number, PieSliceProps>(
    props.geometryScrubbing
      ? []
      : props.children.flatMap((child) =>
          child.kind === 'slice' ? [[child.props.index, child.props] as const] : [],
        ),
  )

  const configs: ReadonlyArray<PieSliceProps> = arcs.map((arc) =>
    props.geometryScrubbing
      ? { index: arc.index, animate: false, showGlow: false, hoverEffect: 'none' }
      : (configByIndex.get(arc.index) ?? { index: arc.index }),
  )

  const color: (index: number) => string = (index: number) =>
    props.data[index]?.color || defaultPieColors[index % 5] || 'var(--chart-1)'

  const fill: (index: number) => string = (index: number) => {
    const paint = props.data[index]?.fill

    return paint ? scopePaint(paint, id) : color(index)
  }

  const rows: ReadonlyArray<PieArcRow> = configs.flatMap((config, roleIndex) => {
    const arc = arcs[config.index]
    if (arc === undefined) return []
    const effect = config.hoverEffect ?? 'translate'
    return [
      {
        roleIndex,
        sliceIndex: arc.index,
        startAngle: arc.startAngle,
        endAngle: arc.endAngle,
        padAngle: arc.padAngle,
        fill: config.fill ? scopePaint(config.fill, id) : fill(arc.index),
        effect,
        offset: effect === 'none' ? 0 : (config.hoverOffset ?? hoverOffset),
        animate: config.animate !== false,
        glowColor: config.color || color(arc.index),
        showGlow: config.showGlow !== false,
        className: config.className ?? '',
      },
    ]
  })

  return {
    rows,
    arcs,
    hoverOffset,
    innerRadius,
    cornerRadius,
    outerRadius: size / 2 - hoverOffset,
    color,
    fill,
    totalValue: props.data.reduce((a, d) => a + d.value, 0),
    pathAt: (row: PieArcRow, radius: number) =>
      pieArcPath({ innerRadius, cornerRadius }, radius, row),
  }
}

export function buildPieDefinition(props: PieChartProps, size: number, id: string) {
  const geometry = pieGeometry(props, size, id)
  const { rows, innerRadius, cornerRadius, hoverOffset } = geometry

  const slices = rows.map((row) =>
    radialArc([row], {
      className:
        `bkm-pie-arc bkm-pie-s${row.sliceIndex} bkm-pie-role${row.roleIndex} ${row.className}`.trim(),
      fill: (d) => d.fill,
      generator: pieArcGenerator({ innerRadius, cornerRadius }),
      id: `pie:slice-${row.sliceIndex}:role-${row.roleIndex}`,
      key: (d) => `pie:slice-${d.sliceIndex}`,
      motion: false,
    }),
  )

  const spec = {
    focus: createAnnularFocus<PieArcRow>({
      center: size / 2,
      indexOf: (d) => d.sliceIndex,
      focusable: (p) => p.markId.startsWith('pie:slice-'),
      navigable: (p) => p.markId.startsWith('pie:slice-'),
      targets: rows.map((r) => ({
        index: r.sliceIndex,
        innerRadius,
        outerRadius: size / 2 - hoverOffset,
        startAngle: r.startAngle,
        endAngle: r.endAngle,
      })),
    }),
    focusRing: false,
    guides: false,
    marks: [
      polar({
        id: 'pie',
        inset: hoverOffset,
        marks: slices,
        radiusRatio: 1,
        scales: { angle: null, radius: null },
      }),
    ],
    scales: { x: null, y: null },
    theme: { palette: defaultPieColors },
    tooltip: false,
  } satisfies DomChartDefinition<PieArcRow, number, number>

  return defineChart(spec, { focus: spec.focus })
}
