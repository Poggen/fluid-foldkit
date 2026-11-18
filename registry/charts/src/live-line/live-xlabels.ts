import { DateTime } from 'effect'

import type { SceneNode, ChartControl } from '@tanstack/charts'
import { COMMIT_MS, LABEL_POOL, labelWindow } from './head-ease'

export const liveXLabels: (options: LiveXLabelsOptions) => ChartControl<Date, number> =
  function liveXLabels(options: LiveXLabelsOptions) {
    const { id, times, rollMs, parity, padding, fontSize, format } = options

    return {
      id,
      resolve: ({ scales, chart }) => {
        const { x } = scales

        const children = times.flatMap((time, i) => {
          const at = x?.map(DateTime.toDateUtc(DateTime.makeUnsafe(time + rollMs))) ?? Number.NaN

          if (!Number.isFinite(at)) {
            return []
          }

          const texts: Array<{ text: string; step: number }> = []

          for (let step = 0; step < LABEL_POOL; step += 1) {
            const text = format(time + step * COMMIT_MS)

            if (texts.at(-1)?.text !== text) {
              texts.push({ text, step })
            }
          }

          const shown = texts.slice(0, X_POOL)

          return Array.from({ length: X_POOL }, (_, n) => {
            const entry = shown.at(n)

            const window =
              entry === undefined ? '' : ` ${labelWindow(entry.step, shown.at(n + 1)?.step)}`

            return {
              kind: 'label' satisfies 'label',
              key: `x-tick-label:slot:${i}:${n}`,
              className: `bkm-live-xlabel bkm-lbl${window}`,
              x: at,
              y: chart.y + chart.height + padding + fontSize * 0.8,
              text: entry?.text ?? '',
              anchor: 'middle' satisfies 'middle',
              fontSize,
              style: { fill: 'var(--chart-label)', fillOpacity: 1 },
            } satisfies SceneNode
          })
        })

        return {
          nodes: [
            {
              kind: 'group',
              key: id,
              className: `bkm-live-xlabels bkm-sp${parity}`,
              ariaHidden: true,
              children,
            },
          ],
        }
      },
    }
  }

const X_POOL = 3

export interface LiveXLabelsOptions {
  readonly id: string
  /** Slot times (ms) at the start of the roll: slot i sits at the scale position of its end-of-roll time (times[i] + rollMs), which never moves. */
  readonly times: ReadonlyArray<number>
  /** The roll's length: the labels' clock advances this far over it. */
  readonly rollMs: number
  /** The frame's tick parity: restarts the stack's animations each tick (live-css.ts). */
  readonly parity: number
  /** Gap between the plot bottom and the label box (the axis padding it replaces). */
  readonly padding: number
  readonly fontSize: number
  readonly format: (time: number) => string
}
