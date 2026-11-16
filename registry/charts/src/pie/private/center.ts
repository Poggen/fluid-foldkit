import type { Data } from 'number-flow/lite'
import NumberFlowLite, { define, formatToData } from 'number-flow/lite'

export type CenterStatFormat = Pick<
  Intl.NumberFormatOptions,
  | 'notation'
  | 'compactDisplay'
  | 'minimumFractionDigits'
  | 'maximumFractionDigits'
  | 'minimumIntegerDigits'
  | 'minimumSignificantDigits'
  | 'maximumSignificantDigits'
  | 'style'
  | 'currency'
  | 'currencyDisplay'
  | 'unit'
  | 'unitDisplay'
>

export interface CenterOptions {
  readonly defaultLabel?: string
  readonly formatOptions?: CenterStatFormat
  readonly className?: string
  readonly valueClassName?: string
  readonly labelClassName?: string
  readonly prefix?: string
  readonly suffix?: string
}

export const defaultCenterStatFormat: CenterStatFormat = {
  maximumFractionDigits: 0,
  notation: 'standard',
}

class PolarNumber extends NumberFlowLite {}

export function createPolarCenter() {
  define('fk-polar-number', PolarNumber)
  const node = document.createElement('div')
  const flow = new PolarNumber()
  flow.batched = false
  flow.dataset.willChange = ''
  const value = document.createElement('span')
  value.append(flow)
  const label = document.createElement('span')
  node.dataset.slot = 'center-stat'
  let signature = ''
  let committed = false
  let currentData: Data | undefined

  return {
    node,
    update(
      options: CenterOptions,
      radius: number,
      reading: number,
      caption: string,
      custom = false,
    ) {
      const side = radius * 2 - 16
      node.className = [
        'ts-bkm-center-stat [[data-bkm-chart]_&]:[width:var(--bkm-center-side,100%)] [[data-bkm-chart]_&]:[height:var(--bkm-center-side,100%)]',
        'items-center justify-center',
        custom ? 'hidden' : 'flex flex-col text-center',
        options.className ?? '',
      ]
        .filter(Boolean)
        .join(' ')
      node.style.cssText = `--bkm-center-side:${Number.isFinite(side) && side >= 0 ? `${side}px` : '100%'}`

      if (value.parentElement !== node) {
        node.replaceChildren(value, label)
      }

      value.className = options.valueClassName ?? 'ts-bkm-center-stat-value'
      label.className = options.labelClassName ?? 'ts-bkm-center-stat-label'
      label.textContent = caption
      const next = JSON.stringify([reading, options.formatOptions, options.prefix, options.suffix])

      if (next !== signature) {
        signature = next
        currentData = formatToData(
          reading,
          new Intl.NumberFormat(undefined, options.formatOptions ?? defaultCenterStatFormat),
          options.prefix,
          options.suffix,
        )
        flow.data = currentData
      }
    },
    commit() {
      if (!committed) {
        committed = true
        flow.data = currentData
      }
    },
    destroy() {
      // NumberFlow awaits its animations' finished promises; use its public cleanup setter.
      flow.animated = false
      node.remove()
    },
  }
}
