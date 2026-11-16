// Scoped CSS for the per-series loading pulse overlay (`Line` / `Area` `loading`); keyframes live in styles.css.
import type { ResolvedSeries } from './series'
import { keyStarts } from '../kit/renderer-dom'

const FADE_MASK = 'linear-gradient(90deg, transparent, #000 15%, #000 85%, transparent)'

const EASE = 'cubic-bezier(0.85, 0, 0.15, 1)'

/** The loop / exit clip drawn from `--bkm-p` (styles.css `bkm-loading-pulse`): right inset closes as it grows to .5, the left inset opens as it shrinks past .5. */
const PULSE_CLIP =
  'inset(-10px calc(100% * (1 - min(var(--bkm-p) * 2, 1))) -10px calc(100% * max(var(--bkm-p) * 2 - 1, 0)))'

/** Exit while the phase machine waits (loading-phase.ts): the grow half, then the shrink half after it. */
const EXIT_ANIMATION = `bkm-loading-grow var(--bkm-x-grow) ${EASE} forwards, bkm-loading-shrink var(--bkm-x-shrink) ${EASE} var(--bkm-x-grow) forwards`

const escapeAttr = (value: string): string => value.replaceAll(/["\\\n]/g, String.raw`\$&`)

type Loading = NonNullable<ResolvedSeries['loading']>

const animationOf = ({ mode }: Loading): string => {
  // bklit line-loading-timing.ts: 2.2s cycle + 280ms pause (loop); one 1.1s half-cycle per enter/exit.
  if (mode === 'enter') {
    return `--bkm-loading-animation: bkm-loading-enter 1.1s ${EASE} forwards;`
  }

  if (mode === 'exit') {
    return `--bkm-loading-animation: bkm-loading-exit 1.1s ${EASE} forwards;`
  }

  return `--bkm-loading-animation: bkm-loading-pulse 2.48s linear infinite;--bkm-loading-clip-path: ${PULSE_CLIP};`
}

export const loadingCss = (scope: string, series: ReadonlyArray<ResolvedSeries>): string =>
  series
    // The sweep style draws its own silhouette (loading-sweep-overlays.tsx), so it has no overlay mark to style.
    .flatMap((s) =>
      s.loading === undefined || s.loading.style === 'sweep'
        ? []
        : [{ id: s.id, loading: s.loading }],
    )
    .map(({ id, loading }) => {
      const key = escapeAttr(`${id}:loading`)
      const sel = `${scope} g${keyStarts(key)}`
      const mask = `--bkm-loading-mask-image: ${FADE_MASK}; --bkm-loading-mask-image: ${FADE_MASK};`

      // The exit rule is for the loop only: an explicit enter / exit mode carries its own animation.
      const exit =
        loading.mode === 'loop'
          ? `${scope}[data-bkm-exit] g${keyStarts(key)}{--bkm-loading-animation:${EXIT_ANIMATION}}`
          : ''

      return `${sel}{--bkm-loading-opacity:${loading.strokeOpacity};--bkm-loading-pointer-events:none;${mask}${animationOf(loading)}}${exit}@media (prefers-reduced-motion: reduce){${sel}{--bkm-loading-animation:none;--bkm-loading-clip-path:none}}`
    })
    .join('')
