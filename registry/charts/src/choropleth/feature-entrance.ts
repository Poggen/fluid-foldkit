import { animateSingleValue, motionValue } from 'motion-dom'
import { mountProgressOptions } from '../kit/motion/transition-options'
import type { ChoroplethChartProps } from './types'

/** Original EnterFeatureLayer progress, cut by isLoaded or its first completed progress. Graticules are always static. */
export function createFeatureEntrance(onStatic: (value: boolean) => void) {
  let root: HTMLElement | undefined
  let controls: ReturnType<typeof animateSingleValue> | undefined
  let release: (() => void) | undefined
  let progress: ReturnType<typeof motionValue<number>> | undefined
  let complete = true

  const paint = () => {
    for (const group of root?.querySelectorAll<SVGElement>('.bkm-choro-graticule') ?? [])
      group.classList.add('[animation:none]')
    for (const group of root?.querySelectorAll<SVGElement>('.bkm-choro-features') ?? []) {
      group.classList.add('[animation:none]')
      if (complete) group.style.removeProperty('opacity')
      else group.style.opacity = String((progress?.get() ?? 0) * 0.85)
    }
  }
  const stop = () => {
    controls?.stop()
    release?.()
    progress?.destroy()
    controls = undefined
    release = undefined
    progress = undefined
  }
  return {
    sync(element: HTMLElement) {
      root = element
      paint()
    },
    start(props: ChoroplethChartProps) {
      stop()
      complete = false
      onStatic(false)
      progress = motionValue(0)
      release = progress.on('change', (value) => {
        if (value >= 1 && !complete) {
          complete = true
          onStatic(true)
        }
        paint()
      })
      controls = animateSingleValue(progress, 1, mountProgressOptions(props.enterTransition))
      paint()
    },
    finish() {
      complete = true
      onStatic(true)
      stop()
      paint()
    },
    clear() {
      stop()
      root = undefined
    },
  }
}
