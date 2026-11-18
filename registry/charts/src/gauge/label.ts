import { gaugeLabelClasses } from './host-layout'
import NumberFlowLite, { define, formatToData } from 'number-flow/lite'
import type { Data } from 'number-flow/lite'
import type { GaugeProps } from './props'
import { defaultGaugeStatFormat } from './props'

export const createGaugeLabel: () => GaugeLabel = function createGaugeLabel() {
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

  const paint: (reading: number) => void = (reading: number) => {
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
          const finishIntro: () => void = () => {
            introDone = true
            paint(latest.centerValue ?? 0)
          }

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

      flow.data = currentData
    },
    destroy() {
      cancelAnimationFrame(outerFrame)
      cancelAnimationFrame(innerFrame)

      flow.animated = false
      node.remove()
    },
  }
}

class NativeNumberFlow extends NumberFlowLite {}

export interface GaugeLabel {
  readonly node: HTMLDivElement
  update(props: GaugeProps, arc: boolean): void
  commit(): void
  destroy(): void
}
