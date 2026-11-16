import type { ChartControl, SceneLabel } from '@tanstack/charts'
import { scaleLinear } from 'd3-scale'
import type { YAxisConfig } from './axis-options'
import type { ReferenceAreaConfig } from './context-types'
import { axisId, DEFAULT_Y_AXIS_ID } from './series'

interface SourceYAxisControlOptions {
  readonly id: string
  readonly axes: ReadonlyArray<YAxisConfig>
  readonly referenceAreas: ReadonlyArray<ReferenceAreaConfig>
  readonly horizontalBarDomains?: Readonly<Record<string, readonly [number, number]>>
}

export function sourceYAxisControl({
  id,
  axes,
  referenceAreas,
  horizontalBarDomains,
}: SourceYAxisControlOptions): ChartControl<never, never> {
  const controlId = `${id}:source-y-axes`

  return {
    id: controlId,
    resolve: ({ chart, scales, theme }) => {
      const occurrences = new Map<string, number>()
      const labels: Array<SceneLabel> = []

      for (const axis of axes) {
        const canonicalId = axisId(axis.yAxisId)
        const occurrence = occurrences.get(canonicalId) ?? 0
        occurrences.set(canonicalId, occurrence + 1)
        const scaleId = canonicalId === DEFAULT_Y_AXIS_ID ? 'y' : `y:${canonicalId}`
        const scale = horizontalBarDomains === undefined ? (scales[scaleId] ?? scales.y) : scales.x
        if (scale === undefined) continue

        const domain =
          horizontalBarDomains === undefined
            ? scale.domain.filter((value): value is number => typeof value === 'number')
            : (horizontalBarDomains[canonicalId] ?? horizontalBarDomains.left ?? [0, 100])
        if (domain.length === 0) continue

        // D3 enumerates raw count hints; resolved engine maps own every coordinate.
        const ticks = scaleLinear()
          .domain(domain)
          .ticks(axis.numTicks === undefined || !Number.isFinite(axis.numTicks) ? 5 : axis.numTicks)
        const low = Math.min(domain[0] ?? 0, domain.at(-1) ?? 100)
        const high = Math.max(domain[0] ?? 0, domain.at(-1) ?? 100)
        const side = axis.orientation ?? (canonicalId === DEFAULT_Y_AXIS_ID ? 'left' : 'right')
        const map = scale.map

        for (const value of ticks) {
          const reference = referenceAreas.find((area) => {
            if (
              area.yAxisId !== canonicalId ||
              area.axisLabelColor === null ||
              area.axisLabelColor === ''
            )
              return false
            const start = area.y1 ?? low
            const end = area.y2 ?? high
            return value >= Math.min(start, end) && value <= Math.max(start, end)
          })
          labels.push({
            kind: 'label',
            key: `${scale.id}-tick-label:${JSON.stringify([controlId, canonicalId, occurrence, value])}`,
            x: side === 'left' ? chart.x - 4 : chart.x + chart.width + 4,
            // The existing horizontal Bar extension reads primary x displacement as top.
            y: horizontalBarDomains === undefined ? map(value) : map(value) - chart.x + chart.y,
            text:
              axis.formatValue?.(value) ??
              (axis.formatLargeNumbers !== false && Math.abs(value) >= 1000
                ? `${(value / 1000).toFixed(0)}k`
                : String(value)),
            anchor: side === 'left' ? 'end' : 'start',
            baseline: 'middle',
            fontSize: 12,
            style: { fill: reference?.axisLabelColor ?? theme.muted, opacity: 1 },
          })
        }
      }

      return {
        nodes:
          axes.length === 0
            ? []
            : [
                {
                  kind: 'group',
                  key: controlId,
                  className: 'ts-chart__axes',
                  ariaHidden: true,
                  children: labels,
                },
              ],
      }
    },
  }
}
