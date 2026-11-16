import type { EntranceOrigin } from '../kit/entrance/entrance-origin'
import { toCssEase } from '../kit/motion/enter-transition'
import { springCurve } from '../kit/motion/spring-curve'
import type { SpringCurve } from '../kit/motion/spring-curve'
import { RADAR_ENTER_SPRING } from './transition'
import type { RadarEnterTransition } from './transition'

// Radar entrance pieces native text and dot motion cannot express, as fixed-text CSS driven by host custom properties (`radarEntranceVars`).
// Each rule is a CSS animation on a classed group (reference/marks/polar.md): it plays once on mount, a var change only retargets values.
type CSSProperties = Readonly<Record<string, string | number>>

const SAMPLES = 48

const SPRING_STEP_MS = 8

const SPRING_LIMIT_MS = 4000

// motion's rest thresholds scaled to a unit span (about 160px of travel).
const UNIT_REST = { delta: 0.5 / 160, speed: 2 / 160 }

const MAX_SERIES = 12

const LEVEL_LABEL_STEP_MS = 60

const round = (n: number): number => Math.round(n * 1e4) / 1e4

/** A spring as a CSS `linear()` easing over its settle time (overshoots). */
const springEase = (stiffness: number, damping: number, mass: number): SpringCurve =>
  springCurve(
    { damping, mass, stiffness },
    {
      decimals: 4,
      limitMs: SPRING_LIMIT_MS,
      rest: UNIT_REST,
      samples: SAMPLES,
      stepMs: SPRING_STEP_MS,
    },
  )

/** bklit's enter transition (default 1.1s bezier tween, or a spring) as a CSS duration + easing. */
const enterCurve = (transition: RadarEnterTransition | undefined): SpringCurve => {
  if (transition?.type === 'spring') {
    return springEase(
      transition.stiffness ?? RADAR_ENTER_SPRING.stiffness,
      transition.damping ?? RADAR_ENTER_SPRING.damping,
      transition.mass ?? RADAR_ENTER_SPRING.mass,
    )
  }

  return { durationMs: (transition?.duration ?? 1.1) * 1000, ease: toCssEase(transition?.ease) }
}

const radarEntranceKey = (id: string): string => {
  const codepoints = Array.from(id, (character) => (character.codePointAt(0) ?? 0).toString(16))

  return codepoints.length === 0 ? 'empty' : codepoints.join('_')
}

const radarEntranceResource = (id: string, levels: number) => {
  const key = radarEntranceKey(id)
  const root = `[data-bkm-radar-scope="${key}"][data-bkm-enter]`
  const progress = `bk-radar-p-${key}`
  const fade = `bk-radar-fade-${key}`

  // --bkm-rp is the dot travel progress: the group scales by max(.001,p) (hover-css.ts) and the circle by its exact reciprocal, so the dot
  // keeps its size while it travels (two separate keyframes would not cancel: .001 + .999p != p).
  // `--bkm-rp` is registered once in styles.css: a registration in this per-mount <style> would restyle the whole document at every mount.
  let css = `@keyframes ${progress}{from{--bkm-rp:0}to{--bkm-rp:1}}`
  css += `@keyframes ${fade}{from{opacity:0}}`

  // bklit RadarGrid: opacity 0 -> 1 on the enter transition, delayed levels*gridStagger*0.5 + i*0.06*df.
  for (let i = 0; i < levels; i += 1) {
    css += `${root} g.bkm-radar-levels text:nth-child(${i + 1}){--bkm-r-label-animation:${fade} var(--bkm-r-dur) var(--bkm-r-ease) calc(var(--bkm-r-lvl0) + ${i} * var(--bkm-r-lvlstep)) backwards}`
  }

  // bklit series dots sit at the centre at full size from mount (the series group fades in over 0.15s) and travel out with the
  // polygon.
  for (let i = 0; i < MAX_SERIES; i += 1) {
    const delay = `calc(var(--bkm-r-sbase) + ${i} * var(--bkm-r-sstep))`
    css += `${root} g.bkm-radar-dot.bkm-radar-s${i}{--bkm-r-dot-animation:${progress} var(--bkm-r-dur) var(--bkm-r-ease) ${delay} backwards,${fade} 150ms ease-out backwards}`
  }

  // Grid and series fades retain Source's frame origin.
  const origins = { [fade]: 'frame', [progress]: 'frame' } satisfies Readonly<
    Record<string, EntranceOrigin>
  >

  return { css, origins }
}

interface RadarEntranceVarsInput {
  readonly levels: number
  readonly staggerScale: number
  readonly enterDurationMs: number
  readonly enterTransition: RadarEnterTransition | undefined
  readonly seriesBaseMs: number
  readonly seriesStepMs: number
}

/** Prop/size-derived entrance numbers as host custom properties. */
const radarEntranceVars = (o: Readonly<RadarEntranceVarsInput>): CSSProperties => {
  const df = o.enterDurationMs / 1100
  const gridStagger = 0.08 * o.staggerScale * df * 1000
  const curve = enterCurve(o.enterTransition)

  return Object.fromEntries<string>([
    ['--bkm-r-dur', `${round(curve.durationMs)}ms`],
    ['--bkm-r-ease', curve.ease],
    ['--bkm-r-lvl0', `${round(o.levels * gridStagger * 0.5)}ms`],
    ['--bkm-r-lvlstep', `${round(LEVEL_LABEL_STEP_MS * df)}ms`],
    ['--bkm-r-sbase', `${round(o.seriesBaseMs)}ms`],
    ['--bkm-r-sstep', `${round(o.seriesStepMs)}ms`],
  ])
}

export { radarEntranceKey, radarEntranceResource, radarEntranceVars }
