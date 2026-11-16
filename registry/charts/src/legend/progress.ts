/** Source Base UI Progress uses a finite value, a clamped percentage, and a separate clamped value. */
export type LegendProgressState =
  | {
      readonly status: 'indeterminate'
      readonly percentage: null
      readonly value: null
      readonly ariaValueText: string
    }
  | {
      readonly status: 'progressing' | 'complete'
      readonly percentage: number
      readonly value: number
      readonly ariaValueText: string
    }

const percent = new Intl.NumberFormat(undefined, { style: 'percent' })

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.max(minimum, Math.min(value, maximum))

export function legendProgressState(value: number, maximum = 100): LegendProgressState {
  if (!Number.isFinite(value)) {
    return {
      status: 'indeterminate',
      percentage: null,
      value: null,
      ariaValueText: 'indeterminate progress',
    }
  }

  const raw = ((value - 0) * 100) / (maximum - 0)
  const percentage = clamp(Number.isNaN(raw) ? 0 : raw, 0, 100)
  const clamped = clamp(value, 0, maximum)

  return {
    status: clamped === maximum ? 'complete' : 'progressing',
    percentage,
    value: clamped,
    ariaValueText: percent.format(percentage / 100),
  }
}

export const hasLegendMaximum = (maximum: number | undefined): maximum is number =>
  maximum !== undefined && maximum !== 0 && !Number.isNaN(maximum)
