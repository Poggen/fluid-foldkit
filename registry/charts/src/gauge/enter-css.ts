import type { NotchEnter } from './transition'

/** motion-dom `frameloop/batcher.mjs`: bklit's JS-driven scale starts one 60 Hz frame after its WAAPI opacity. */
const SCALE_LAG_MS = 1000 / 60

const PERCENT = 100

const PERCENT_DECIMALS = 4

const percent = (ratio: number): string => `${(ratio * PERCENT).toFixed(PERCENT_DECIMALS)}%`

/** Opacity eases over [0, D] and scale over [lag, D + lag], both with the notch easing: the one animation spans D + lag. */
const keyframes = (name: string, durationMs: number, easing: string): string => {
  const total = durationMs + SCALE_LAG_MS
  const ease = `animation-timing-function:${easing}`

  return `@keyframes ${name}{0%{opacity:0;scale:0;${ease}}${percent(SCALE_LAG_MS / total)}{scale:0;${ease}}${percent(durationMs / total)}{opacity:1}100%{scale:1}}`
}

const HASH_RADIX = 36

const HASH_MUL = 31

const HASH_MOD = 2 ** 31

/** The keyframe name carries a hash of the notch enter, so galleries with several durations or easings do not collide. */
const nameOf = (durationMs: number, easing: string): string => {
  let hash = 0

  for (const ch of easing) {
    hash = (hash * HASH_MUL + (ch.codePointAt(0) ?? 0)) % HASH_MOD
  }

  // Fractional millisecond durations must remain a CSS identifier, not a decimal token.
  const durationKey = String(durationMs).replaceAll('.', '_').replaceAll('+', '_')
  return `bkm-gn-${durationKey}-${hash.toString(HASH_RADIX)}`
}

/** Scope by the actual entrance contract so one Gauge cannot retime another. */
export const gaugeEntranceKey = ({ durationMs, easing }: NotchEnter, reduced = false): string =>
  reduced ? 'bkm-gn-reduced' : nameOf(durationMs, easing)

/** Only the data-dependent keyframe definition stays in CSS; each reserve notch owns its utilities. */
export const buildEnterCss = ({ durationMs, easing }: NotchEnter, reduced = false): string =>
  reduced
    ? '@keyframes bkm-gn-reduced-opacity{from{opacity:0}to{opacity:1}}@keyframes bkm-gn-reduced-scale{from{scale:0}to{scale:1}}'
    : keyframes(nameOf(durationMs, easing), durationMs, easing)

export const notchEntranceClass =
  '[transform-box:fill-box] [transform-origin:50%_50%] [animation-name:var(--bkm-gauge-animation-name)] [animation-duration:calc(var(--bkm-gn-dur)_+_16.666666666666668ms)] [animation-timing-function:linear] [animation-fill-mode:backwards] [animation-delay:var(--bkm-gauge-animation-delay)]'

export const notchEntranceStyle = (enter: NotchEnter, index: number, active: boolean): string =>
  `--bkm-gauge-animation-name:${nameOf(enter.durationMs, enter.easing)};--bkm-gauge-animation-delay:calc((${active ? 300 : 0}ms + ${index} * ${active ? 20 : 15}ms) * var(--bkm-gn-s) - var(--bkm-gn-lag,0ms))`
