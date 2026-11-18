import { DateTime } from 'effect'

const pad2: (n: number) => string = (n: number) => String(n).padStart(2, '0')

export const defaultFormatTime: (ms: number) => string = (ms: number) => {
  const d = DateTime.toDateUtc(DateTime.makeUnsafe(ms))

  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`
}

export const defaultFormatValue: (v: number) => string = (v: number) => v.toFixed(2)
