import type { NotchEnter } from './transition'

const SCALE_LAG_MS = 1000 / 60

const PERCENT = 100

const PERCENT_DECIMALS = 4

const percent: (ratio: number) => string = (ratio: number) =>
  `${(ratio * PERCENT).toFixed(PERCENT_DECIMALS)}%`

const keyframes: (name: string, durationMs: number, easing: string) => string = (
  name: string,
  durationMs: number,
  easing: string,
) => {
  const total = durationMs + SCALE_LAG_MS
  const ease = `animation-timing-function:${easing}`

  return `@keyframes ${name}{0%{opacity:0;scale:0;${ease}}${percent(SCALE_LAG_MS / total)}{scale:0;${ease}}${percent(durationMs / total)}{opacity:1}100%{scale:1}}`
}

const HASH_RADIX = 36

const HASH_MUL = 31

const HASH_MOD = 2 ** 31

const nameOf: (durationMs: number, easing: string) => string = (
  durationMs: number,
  easing: string,
) => {
  let hash = 0

  for (const ch of easing) {
    hash = (hash * HASH_MUL + (ch.codePointAt(0) ?? 0)) % HASH_MOD
  }

  const durationKey = String(durationMs).replaceAll('.', '_').replaceAll('+', '_')
  return `bkm-gn-${durationKey}-${hash.toString(HASH_RADIX)}`
}

/** Scope by the actual entrance contract so one Gauge cannot retime another. */
export const gaugeEntranceKey: (argument0: NotchEnter, reduced?: boolean) => string = (
  { durationMs, easing }: NotchEnter,
  reduced = false,
) => (reduced ? 'bkm-gn-reduced' : nameOf(durationMs, easing)) satisfies string

/** Only the data-dependent keyframe definition stays in CSS; each reserve notch owns its utilities. */
export const buildEnterCss: (argument0: NotchEnter, reduced?: boolean) => string = (
  { durationMs, easing }: NotchEnter,
  reduced = false,
) =>
  (reduced
    ? '@keyframes bkm-gn-reduced-opacity{from{opacity:0}to{opacity:1}}@keyframes bkm-gn-reduced-scale{from{scale:0}to{scale:1}}'
    : keyframes(nameOf(durationMs, easing), durationMs, easing)) satisfies string

export const notchEntranceClass =
  '[transform-box:fill-box] [transform-origin:50%_50%] [animation-name:var(--bkm-gauge-animation-name)] [animation-duration:calc(var(--bkm-gn-dur)_+_16.666666666666668ms)] [animation-timing-function:linear] [animation-fill-mode:backwards] [animation-delay:var(--bkm-gauge-animation-delay)]'

export const notchEntranceStyle: (enter: NotchEnter, index: number, active: boolean) => string = (
  enter: NotchEnter,
  index: number,
  active: boolean,
) =>
  `--bkm-gauge-animation-name:${nameOf(enter.durationMs, enter.easing)};--bkm-gauge-animation-delay:calc((${active ? 300 : 0}ms + ${index} * ${active ? 20 : 15}ms) * var(--bkm-gn-s) - var(--bkm-gn-lag,0ms))`
