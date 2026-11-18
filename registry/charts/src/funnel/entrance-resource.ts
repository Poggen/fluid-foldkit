import { animateSingleValue, motionValue } from 'motion-dom'
import { constUndefined } from 'effect/Function'
import { mountProgressOptions } from '../kit/motion/transition-options'
import type { FunnelChartProps, FunnelStage } from './options'

interface StageEntrance {
  readonly label: string
  readonly index: number
  readonly delay: number
  readonly horizontal: boolean
  readonly progress: ReturnType<typeof motionValue<number>>
  readonly stop: () => void
  readonly draw: () => void
  element: SVGElement
  complete: boolean
}

/** Original's keyed HSegment/VSegment mount progress; completion follows the actual value, not a duration guess. */
export function createFunnelEntrance(onComplete: (index: number) => void) {
  const stages = new Map<string, StageEntrance>()

  const clear = () => {
    for (const stage of stages.values()) {
      stage.stop()
    }

    stages.clear()
  }

  return {
    clear,
    sync(root: HTMLElement, data: ReadonlyArray<FunnelStage>, props: FunnelChartProps) {
      const horizontal = props.orientation !== 'vertical'
      const groups = root.querySelector('.bkm-stages')?.children
      const seen = new Set<string>()
      const occurrences = new Map<string, number>()

      for (const [index, datum] of data.entries()) {
        const element = groups?.[index]?.querySelector<SVGElement>('.bkm-fr')

        if (element === null || element === undefined) {
          continue
        }

        const occurrence = occurrences.get(datum.label) ?? 0
        occurrences.set(datum.label, occurrence + 1)
        const key = `${datum.label}\u0000${occurrence}`
        seen.add(key)
        const delay = index * (props.staggerDelay ?? 0.12)
        const existing = stages.get(key)
        element.classList.add('[animation:none]')

        if (
          existing !== undefined &&
          existing.index === index &&
          existing.delay === delay &&
          existing.horizontal === horizontal
        ) {
          existing.element = element
          existing.draw()
          continue
        }

        existing?.stop()
        const progress = motionValue(0)

        const stage = {
          label: datum.label,
          index,
          delay,
          horizontal,
          progress,
          element,
          complete: existing?.horizontal === horizontal && existing.complete,
          stop: constUndefined,
          draw: () => {
            if (stage.complete) {
              stage.element.style.removeProperty('scale')
            } else {
              stage.element.style.scale = String(Math.max(0, Math.min(1, progress.get())))
            }
          },
        }

        const release = progress.on('change', (value) => {
          const completed = !stage.complete && value >= 1

          if (completed) {
            stage.complete = true
          }

          stage.draw()

          if (completed) {
            onComplete(index)
          }
        })

        animateSingleValue(progress, 1, {
          ...mountProgressOptions(props.enterTransition),
          delay,
        })

        stage.stop = () => {
          release()
          progress.destroy()
        }

        stages.set(key, stage)
        stage.draw()
      }

      for (const [key, stage] of stages) {
        if (!seen.has(key)) {
          stage.stop()
          stages.delete(key)
        }
      }
    },
  }
}
