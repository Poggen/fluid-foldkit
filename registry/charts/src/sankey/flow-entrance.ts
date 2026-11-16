import { constUndefined } from 'effect/Function'
import { animateSingleValue, motionValue } from 'motion-dom'
import type { MotionNodeOptions } from 'motion-dom'
import type { SankeyChartProps } from './props'
import { mountProgressOptions } from '../kit/motion/transition-options'
import { mountElementMotion } from './element-motion'
import { sankeyHoverSets } from './hover-css'
import type { SankeyHoverFocus } from './hover-css'
import type { SankeyPaintFeed } from './paint-feed'

interface FlowEntrance {
  readonly delay: number
  readonly progress: ReturnType<typeof motionValue<number>>
  readonly stop: () => void
  readonly draw: () => void
  path: SVGPathElement
  length: number
  readonly index: number
  visual: ReturnType<typeof mountElementMotion>
  normalOpacity: number
  fadedOpacity: number
}

/** Source AnimatedLink draws distance along the curve, rather than clipping across its bounding box. */
export function createFlowEntrance(publish: () => void) {
  const flows = new Map<string, FlowEntrance>()
  let active: ReadonlySet<number> | null = null
  let current: SankeyChartProps | undefined
  let focus: SankeyHoverFocus | null = null

  const target = (flow: FlowEntrance): MotionNodeOptions => {
    let opacity = flow.normalOpacity

    if (active !== null) {
      opacity = active.has(flow.index) ? Math.min(1, flow.normalOpacity * 1.3) : flow.fadedOpacity
    }

    return { animate: { opacity }, transition: { duration: 0.18, ease: 'easeOut' } }
  }

  return {
    clear() {
      for (const flow of flows.values()) {
        flow.stop()
      }

      flows.clear()
      current = undefined
      active = null
      focus = null
    },
    hover(next: SankeyHoverFocus | null) {
      focus = next
      active =
        focus === null || current === undefined
          ? null
          : new Set(sankeyHoverSets(current.data.links, focus).links)

      for (const flow of flows.values()) {
        flow.visual.update(target(flow))
      }
    },
    sync(root: HTMLElement, props: SankeyChartProps, feed: SankeyPaintFeed) {
      current = props
      active = focus === null ? null : new Set(sankeyHoverSets(props.data.links, focus).links)
      const groups = root.querySelectorAll<SVGGElement>("g[data-ts-key^='sankey:flow']")

      const paths = [...groups].flatMap((group) =>
        [...group.querySelectorAll<SVGPathElement>(':scope > path')].map(
          (path, index, groupPaths) => {
            const occurrence = Number(
              /-role-(?<occurrence>\d+)$/u.exec(group.dataset.tsKey ?? '')?.groups?.occurrence,
            )

            return {
              path,
              index,
              count: groupPaths.length,
              occurrence,
              key: `${group.dataset.tsKey}:${index}:${feed.linkKeys.get(`${occurrence}:${index}`) ?? path.getAttribute('stroke-width')}`,
            }
          },
        ),
      )

      const seen = new Set<string>()
      const duration = props.animationDuration ?? 1100

      for (const { index, path, key, count, occurrence } of paths) {
        seen.add(key)
        const delay = ((0.2 + (index / Math.max(1, count)) * 0.32) * duration) / 1000
        path.classList.add('[animation:none]')
        path.classList.add('[clip-path:none]')
        path.classList.add('[transition:none]')
        path.classList.add('[stroke-opacity:1]')
        const role = props.children?.at(occurrence)
        const normalOpacity = role?.role === 'link' ? (role.props.strokeOpacity ?? 0.5) : 0.5
        const fadedOpacity = role?.role === 'link' ? (role.props.fadedOpacity ?? 0.1) : 0.1
        const length = path.getTotalLength()
        const existing = flows.get(key)

        // React keeps the keyed link's progress during data/geometry changes, but replays when its delay changes.
        if (existing !== undefined && existing.delay === delay) {
          existing.path = path
          existing.length = length
          existing.normalOpacity = normalOpacity
          existing.fadedOpacity = fadedOpacity
          existing.visual.update(target(existing))
          existing.draw()
          continue
        }

        existing?.stop()
        const progress = motionValue(0)

        const visual = mountElementMotion(
          path,
          { opacity: normalOpacity },
          {
            animate: { opacity: normalOpacity },
            transition: { duration: 0.18, ease: 'easeOut' },
          },
          publish,
        )

        const flow = {
          index,
          normalOpacity,
          fadedOpacity,
          visual,
          path,
          length,
          progress,
          delay,
          stop: constUndefined,
          draw: () => {
            const value = Math.max(0, Math.min(1, progress.get()))
            flow.path.style.strokeDasharray =
              flow.length > 0 ? `${flow.length} ${flow.length}` : 'none'
            flow.path.style.strokeDashoffset = String(flow.length * (1 - value))
          },
        }

        const release = progress.on('change', () => {
          flow.draw()
          publish()
        })

        animateSingleValue(progress, 1, {
          ...mountProgressOptions(props.enterTransition),
          delay,
        })
        flow.stop = () => {
          release()
          progress.destroy()
          flow.visual.destroy()
        }

        flows.set(key, flow)
        flow.visual.update(target(flow))
        flow.draw()
      }

      for (const [index, flow] of flows) {
        if (!seen.has(index)) {
          flow.stop()
          flows.delete(index)
        }
      }
    },
  }
}
