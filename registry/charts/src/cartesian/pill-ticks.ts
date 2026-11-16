import { keyStarts, NOT_MOTION } from '../kit/renderer-dom'

const date = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' })

export function writePillSameLabel(
  host: HTMLElement,
  times: ReadonlyArray<number>,
  time: number,
  px: (value: number) => number,
): void {
  const label = date.format(time)
  let index = 0

  for (const value of times)
    if (index < 4 && value !== time && date.format(value) === label) {
      host.style.setProperty(`--bkm-same${index}`, px(value).toFixed(2))
      index++
    }

  for (; index < 4; index++) host.style.removeProperty(`--bkm-same${index}`)
}

export function pillTickStaticCss(
  scope: string,
  tickerHalfWidth: number,
  position: 'pill' | 'focus' = 'pill',
): string {
  const sel = `${scope} text${keyStarts('x-tick-label:')}`

  const same = Array.from(
    { length: 4 },
    (_, index) => `calc((abs(attr(x type(<number>)) - var(--bkm-same${index},-9999)) - .5) * 1000)`,
  ).join(', ')

  const x = position === 'focus' ? 'var(--bkm-hx,-9999)' : 'var(--bkm-pill-x, var(--bkm-hx,-9999))'
  const held = position === 'focus' ? ':not([data-bkm-press],[data-bkm-drag])' : ''

  return `${sel}${NOT_MOTION}{--bkm-pill-transition:opacity .4s ease-in-out}@supports (opacity: attr(opacity type(<number>), 1)){${scope}[data-bkm-hover]${held} text${keyStarts('x-tick-label:')}{--bkm-pill-opacity:clamp(0, min(calc((abs(attr(x type(<number>)) - ${x}) - ${tickerHalfWidth}) / 20), ${same}), 1)!important}}`
}
