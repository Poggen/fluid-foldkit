import type { LiveRow } from './definition'
import { createMark } from '@tanstack/charts'
import type { ChartGradient } from '@tanstack/charts'

export const crosshairGradient: (id: string, color: string) => ChartGradient =
  function crosshairGradient(id: string, color: string) {
    return {
      id,
      x1: 0,
      y1: 0,
      x2: 0,
      y2: 1,
      stops: [0, 0.1, 0.9, 1].map((offset) => ({
        offset,
        color,
        opacity: offset === 0 || offset === 1 ? 0 : 1,
      })),
    }
  }

export function crosshairRuleMark(options: {
  readonly id: string
  readonly paint: string
  readonly width: number
  readonly motion: false
  readonly className: string
}) {
  return createMark<LiveRow, Date, number>(() => ({
    id: options.id,
    focusGuideOnly: true,
    channels: { x: { scale: 'x', values: [] }, y: { scale: 'y', values: [] } },
    render: ({ chart, surface, layout }) => ({
      nodes: [],
      focusGuides: [
        {
          key: options.id,
          markId: options.id,
          chart,
          surface,
          motion: options.motion,
          ...(layout.measureText === undefined ? {} : { measureText: layout.measureText }),
          ...(layout.typography?.direction === undefined
            ? {}
            : { direction: layout.typography.direction }),
          resolve: ({ focus, cursor }) => {
            const x = focus?.primary.x ?? cursor?.x?.position

            if (x === undefined || !Number.isFinite(x)) {
              return undefined
            }

            return {
              kind: 'group',
              key: options.id,
              className: `bkm-crosshair ${options.className}`,
              ariaHidden: true,
              translateX: x,
              children: [
                {
                  kind: 'rect',
                  key: `${options.id}:rule`,
                  x: -options.width / 2,
                  y: chart.y,
                  width: options.width,
                  height: chart.height,
                  style: { fill: options.paint },
                },
              ],
            }
          },
        },
      ],
    }),
  }))
}
