import type { ResolvedSeries } from './series'
import { keyStarts } from '../kit/renderer-dom'

const FADE_MASK = 'linear-gradient(90deg, transparent, #000 15%, #000 85%, transparent)'

const EASE = 'cubic-bezier(0.85, 0, 0.15, 1)'

const PULSE_CLIP =
  'inset(-10px calc(100% * (1 - min(var(--bkm-p) * 2, 1))) -10px calc(100% * max(var(--bkm-p) * 2 - 1, 0)))'

const EXIT_ANIMATION = `bkm-loading-grow var(--bkm-x-grow) ${EASE} forwards, bkm-loading-shrink var(--bkm-x-shrink) ${EASE} var(--bkm-x-grow) forwards`

const escapeAttr: (value: string) => string = (value: string) =>
  value.replaceAll(/["\\\n]/g, String.raw`\$&`)

type Loading = NonNullable<ResolvedSeries['loading']>

const animationOf: (argument0: Loading) => string = ({ mode }: Loading) => {
  if (mode === 'enter') {
    return `--bkm-loading-animation: bkm-loading-enter 1.1s ${EASE} forwards;` satisfies string
  }

  if (mode === 'exit') {
    return `--bkm-loading-animation: bkm-loading-exit 1.1s ${EASE} forwards;` satisfies string
  }

  return `--bkm-loading-animation: bkm-loading-pulse 2.48s linear infinite;--bkm-loading-clip-path: ${PULSE_CLIP};` satisfies string
}

export const loadingCss: (scope: string, series: ReadonlyArray<ResolvedSeries>) => string = (
  scope: string,
  series: ReadonlyArray<ResolvedSeries>,
) =>
  series

    .flatMap((s) =>
      s.loading === undefined || s.loading.style === 'sweep'
        ? []
        : [{ id: s.id, loading: s.loading }],
    )
    .map(({ id, loading }) => {
      const key = escapeAttr(`${id}:loading`)
      const sel = `${scope} g${keyStarts(key)}`
      const mask = `--bkm-loading-mask-image: ${FADE_MASK}; --bkm-loading-mask-image: ${FADE_MASK};`

      const exit =
        loading.mode === 'loop'
          ? `${scope}[data-bkm-exit] g${keyStarts(key)}{--bkm-loading-animation:${EXIT_ANIMATION}}`
          : ''

      return `${sel}{--bkm-loading-opacity:${loading.strokeOpacity};--bkm-loading-pointer-events:none;${mask}${animationOf(loading)}}${exit}@media (prefers-reduced-motion: reduce){${sel}{--bkm-loading-animation:none;--bkm-loading-clip-path:none}}`
    })
    .join('')
