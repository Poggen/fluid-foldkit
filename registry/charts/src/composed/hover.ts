import { keyStarts, NOT_MOTION } from '../kit/renderer-dom'
import { cssAttr } from '../bar/hover'
import type { SeriesBarSpec } from './bars'

/** The existing accepted Cartesian focus supplies --bkm-hx and data-bkm-hover. */
export function composedBarHoverCss(
  id: string,
  bars: ReadonlyArray<SeriesBarSpec>,
  order: ReadonlyArray<string>,
): string {
  const scope = `[data-bkm-kit="${id}"]`
  const outside =
    'clamp(0,calc((abs(attr(x type(<number>)) + attr(width type(<number>)) / 2 - var(--bkm-hx,-9999)) - attr(width type(<number>)) / 2) * 1000),1)'

  return bars
    .map((bar) => {
      const select = `${keyStarts(`bar:${cssAttr(bar.dataKey)}:string:`)}:not(g)`
      return [
        `${scope} ${select}${NOT_MOTION}{--bkm-composed-transition:opacity .12s ease-out}`,
        `@supports (opacity:attr(opacity type(<number>), 1)){${scope}[data-bkm-hover] ${select}{--bkm-composed-opacity:calc(1 - ${outside} * ${1 - bar.fadedOpacity})!important;--bkm-composed-transition-delay:calc(${outside} * .02s)}}`,
        `${scope}[data-bkm-legend]:not([data-bkm-legend="${order.indexOf(bar.dataKey)}"]) ${select}{--bkm-composed-opacity:${bar.fadedOpacity}}`,
      ].join('')
    })
    .join('')
}
