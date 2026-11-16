import { gaugeLabelClasses } from './host-layout'
import NumberFlowLite, { define, formatToData } from 'number-flow/lite'
import type { Data } from 'number-flow/lite'
import type { GaugeProps } from './props'
import { defaultGaugeStatFormat } from './props'

class NativeNumberFlow extends NumberFlowLite {}

export interface GaugeLabel {
  readonly node: HTMLDivElement
  update(props: GaugeProps, arc: boolean): void
  commit(): void
  destroy(): void
}

export function createGaugeLabel(): GaugeLabel {
  // Same framework-neutral class/data API as upstream's React 19 wrapper.
  define('fk-bklit-number', NativeNumberFlow)
  const node = document.createElement('div')
  const inner = document.createElement('div')
  inner.className = 'ts-bkm-center-stat'
  const value = document.createElement('span')
  const flow = new NativeNumberFlow()
  flow.batched = false
  flow.setAttribute('data-will-change', '')
  value.append(flow)
  const caption = document.createElement('span')
  inner.append(value, caption)
  node.append(inner)
  let outerFrame = 0
  let innerFrame = 0
  let introScheduled = false
  let introDone = false
  let latest: GaugeProps = { value: 0 }
  let painted = ''
  let committed = false
  let currentData: Data | undefined

  const paint = (reading: number): void => {
    const format = latest.formatOptions ?? defaultGaugeStatFormat
    const signature = JSON.stringify([reading, format, latest.prefix, latest.suffix])

    if (signature === painted) return
    painted = signature
    currentData = formatToData(
      reading,
      new Intl.NumberFormat(undefined, format),
      latest.prefix,
      latest.suffix,
    )
    flow.data = currentData
  }

  return {
    node,
    update(props, arc) {
      const centerChanged = !Object.is(latest.centerValue, props.centerValue)
      const valueUpdateAfterCommit = committed && introDone && centerChanged
      latest = props
      if (arc && centerChanged) {
        // Original PieCenterShell restarts its two-frame zero intro on value changes.
        // Cancel an interrupted intro; unrelated configuration updates keep its identity.
        cancelAnimationFrame(outerFrame)
        cancelAnimationFrame(innerFrame)
        introScheduled = false
        introDone = false
      }
      const classes = gaugeLabelClasses(props, arc)
      node.className = classes.outer
      inner.className = classes.inner
      value.className = arc
        ? 'ts-bkm-center-stat-value ts-bkm-gauge-arc-value'
        : 'ts-bkm-gauge-linear-stat-value'
      caption.className = arc ? 'ts-bkm-center-stat-label' : 'ts-bkm-gauge-linear-stat-label'
      caption.textContent = props.defaultLabel ?? 'Total'

      if (arc && !introDone) {
        paint(0)

        if (!introScheduled) {
          introScheduled = true
          const finishIntro = (): void => {
            introDone = true
            paint(latest.centerValue ?? 0)
          }
          // Original's value-change effect schedules two frames, but React commits its
          // zero state after the first. Here zero is already committed: only one remains.
          // Initial insertion still needs both frames to prime NumberFlow's layout.
          outerFrame = requestAnimationFrame(() => {
            if (valueUpdateAfterCommit) finishIntro()
            else innerFrame = requestAnimationFrame(finishIntro)
          })
        }
      } else paint(props.centerValue ?? 0)
    },
    commit() {
      if (committed) return
      committed = true
      // Upstream React 19 assigns the public data property during creation and again in componentDidMount.
      // Reapply after insertion so NumberFlow primes its measured state on the same lifecycle boundary.
      flow.data = currentData
    },
    destroy() {
      cancelAnimationFrame(outerFrame)
      cancelAnimationFrame(innerFrame)

      // NumberFlow awaits its animations; its public setter finishes them without rejection.
      flow.animated = false
      node.remove()
    },
  }
}
