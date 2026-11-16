import type { RingChartProps, RingProps, RingData } from './options'
import { defaultRingColors } from './options'
import type { RingArcRow } from './arc'

export function ringColor(data: ReadonlyArray<RingData>, config: RingProps): string {
  if (config.color !== undefined && config.color !== '') {
    return config.color
  }

  const color = data[config.index]?.color

  if (color !== undefined && color !== '') {
    return color
  }

  return defaultRingColors[config.index % 5] ?? 'var(--chart-1)'
}

export function ringGeometry(props: RingChartProps, size: number) {
  const strokeWidth = props.strokeWidth ?? 12
  const ringGap = props.ringGap ?? 6
  const baseInnerRadius = props.baseInnerRadius ?? 60

  const designOuter =
    baseInnerRadius + props.data.length * strokeWidth + Math.max(0, props.data.length - 1) * ringGap

  const fit = designOuter > 0 ? Math.min(1, (size / 2 - 8) / designOuter) : 1

  const startAngle = props.startAngle ?? -Math.PI / 2
  const endAngle = props.endAngle ?? (3 * Math.PI) / 2

  const configByIndex = new Map<number, RingProps>(
    props.geometryScrubbing === true
      ? []
      : props.children.flatMap((child) =>
          child.kind === 'ring' ? [[child.props.index, child.props] as const] : [],
        ),
  )

  const rings: ReadonlyArray<RingProps> = props.data.map((_, index) =>
    props.geometryScrubbing === true
      ? { index, animate: false }
      : (configByIndex.get(index) ?? { index }),
  )

  const color = (index: number): string => ringColor(props.data, { index })

  const rows: ReadonlyArray<RingArcRow> = rings.flatMap((config, roleIndex) => {
    const { index } = config
    const d = props.data[index]

    if (d === undefined) {
      return []
    }

    const innerRadius = baseInnerRadius + index * (strokeWidth + ringGap)

    const progress = d.value / d.maxValue
    const progressEndAngle = startAngle + (endAngle - startAngle) * progress

    const common = {
      animate: config.animate !== false,
      cornerRadius: config.lineCap === 'butt' ? 0 : strokeWidth / 2,
      innerRadius,
      outerRadius: innerRadius + strokeWidth,
      roleIndex,
      ringIndex: index,
      startAngle,
    }

    const track: RingArcRow = {
      ...common,
      endAngle,
      fill: 'var(--bkm-border)',
      key: `ring-${index}-role-${roleIndex}-track`,
      kind: 'track',
    }

    return progressEndAngle <= startAngle + 0.01
      ? [track]
      : [
          track,
          {
            ...common,
            endAngle: progressEndAngle,
            fill: ringColor(props.data, config),
            key: `ring-${index}-role-${roleIndex}-progress`,
            kind: 'progress',
          },
        ]
  })

  return {
    rings,
    rows,
    fit,
    startAngle,
    endAngle,
    strokeWidth: strokeWidth * fit,
    ringGap: ringGap * fit,
    baseInnerRadius: baseInnerRadius * fit,
    totalValue: props.data.reduce((a, d) => a + d.value, 0),
    color,
    getRingRadii: (index: number) => ({
      innerRadius: (baseInnerRadius + index * (strokeWidth + ringGap)) * fit,
      outerRadius: (baseInnerRadius + index * (strokeWidth + ringGap) + strokeWidth) * fit,
    }),
  }
}
