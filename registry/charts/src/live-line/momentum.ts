export const detectMomentum: (
  data: ReadonlyArray<Record<string, unknown>>,
  dataKey: string,
  lookback?: number,
) => Momentum = function (
  data: ReadonlyArray<Record<string, unknown>>,
  dataKey: string,
  lookback = DEFAULT_LOOKBACK,
) {
  if (data.length < MIN_SAMPLES) {
    return 'flat' satisfies Momentum
  }

  const start = Math.max(0, data.length - lookback)
  let min = Number.POSITIVE_INFINITY
  let max = Number.NEGATIVE_INFINITY

  for (let i = start; i < data.length; i += 1) {
    const v = data[i]?.[dataKey]

    if (typeof v === 'number') {
      min = Math.min(min, v)
      max = Math.max(max, v)
    }
  }

  const range = max - min

  if (range === 0) {
    return 'flat' satisfies Momentum
  }

  const tailStart = Math.max(start, data.length - TAIL_SAMPLES)
  const first = data[tailStart]?.[dataKey]
  const last = data.at(-1)?.[dataKey]
  const delta = (typeof last === 'number' ? last : 0) - (typeof first === 'number' ? first : 0)
  const threshold = range * THRESHOLD_FACTOR

  if (delta > threshold) {
    return 'up' satisfies Momentum
  }

  if (delta < -threshold) {
    return 'down' satisfies Momentum
  }

  return 'flat' satisfies Momentum
}

export type Momentum = 'up' | 'down' | 'flat'

const MIN_SAMPLES = 5

const TAIL_SAMPLES = 5

const THRESHOLD_FACTOR = 0.12

const DEFAULT_LOOKBACK = 20
