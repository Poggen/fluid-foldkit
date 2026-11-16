import { animateSingleValue } from 'motion-dom'
import { growTargets } from './push'
import type { PushInput } from './push'
import type { SectorFeed } from './sunburst-layer'
import { prefersReducedMotion } from './private/reduced-motion'

/** One original growControls tween, retargeted from current radii when hover is interrupted. */
export function createHoverGrowth(feed: SectorFeed) {
  let targets = new Map<string, number>()
  let controls: ReturnType<typeof animateSingleValue> | undefined

  return {
    clear() {
      controls?.stop()
      controls = undefined
      targets = new Map()
      feed.growth.clear()
      feed.paintHover?.()
    },
    sync(input: Readonly<PushInput>) {
      const next =
        input.hovered === null
          ? new Map<string, number>()
          : growTargets({ ...input, hovered: input.hovered })
      if (next.size === targets.size && [...next].every(([id, value]) => targets.get(id) === value))
        return
      controls?.stop()
      targets = next
      const starts = new Map(feed.growth)
      const ids = new Set([...starts.keys(), ...targets.keys()])
      const paint = (progress: number) => {
        feed.growth.clear()
        for (const id of ids) {
          const start = starts.get(id) ?? 0
          const value = start + ((targets.get(id) ?? 0) - start) * progress
          if (value > 0.01) feed.growth.set(id, value)
        }
        feed.paintHover?.()
      }
      if (prefersReducedMotion()) paint(1)
      else
        controls = animateSingleValue(0, 1, {
          duration: 0.42,
          ease: [0.22, 1, 0.36, 1],
          onUpdate: paint,
        })
    },
  }
}
