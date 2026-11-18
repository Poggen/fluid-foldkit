import type { EntranceOrigin } from '../kit/entrance/entrance-origin'
import { toCssEase } from '../kit/motion/enter-transition'
import { springCurve } from '../kit/motion/spring-curve'
import type { SpringCurve } from '../kit/motion/spring-curve'
import { RADAR_ENTER_SPRING } from './transition'
import type { RadarEnterTransition } from './transition'

type CSSProperties = Readonly<Record<string, string | number>>

const SAMPLES = 48

const SPRING_STEP_MS = 8

const SPRING_LIMIT_MS = 4000

const UNIT_REST = { delta: 0.5 / 160, speed: 2 / 160 }

const MAX_SERIES = 12

const LEVEL_LABEL_STEP_MS = 60

const round: (n: number) => number = (n: number) => Math.round(n * 1e4) / 1e4

const springEase: (stiffness: number, damping: number, mass: number) => SpringCurve = (
  stiffness: number,
  damping: number,
  mass: number,
) =>
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

const enterCurve: (transition: RadarEnterTransition | undefined) => SpringCurve = (
  transition: RadarEnterTransition | undefined,
) => {
  if (transition?.type === 'spring') {
    return springEase(
      transition.stiffness ?? RADAR_ENTER_SPRING.stiffness,
      transition.damping ?? RADAR_ENTER_SPRING.damping,
      transition.mass ?? RADAR_ENTER_SPRING.mass,
    )
  }

  return { durationMs: (transition?.duration ?? 1.1) * 1000, ease: toCssEase(transition?.ease) }
}

const radarEntranceKey: (id: string) => string = (id: string) => {
  const codepoints = Array.from(id, (character) => (character.codePointAt(0) ?? 0).toString(16))

  return codepoints.length === 0 ? 'empty' : codepoints.join('_')
}

const radarEntranceResource = (id: string, levels: number) => {
  const key = radarEntranceKey(id)
  const root = `[data-bkm-radar-scope="${key}"][data-bkm-enter]`
  const progress = `bk-radar-p-${key}`
  const fade = `bk-radar-fade-${key}`

  let css = `@keyframes ${progress}{from{--bkm-rp:0}to{--bkm-rp:1}}`
  css += `@keyframes ${fade}{from{opacity:0}}`

  for (let i = 0; i < levels; i += 1) {
    css += `${root} g.bkm-radar-levels text:nth-child(${i + 1}){--bkm-r-label-animation:${fade} var(--bkm-r-dur) var(--bkm-r-ease) calc(var(--bkm-r-lvl0) + ${i} * var(--bkm-r-lvlstep)) backwards}`
  }

  for (let i = 0; i < MAX_SERIES; i += 1) {
    const delay = `calc(var(--bkm-r-sbase) + ${i} * var(--bkm-r-sstep))`
    css += `${root} g.bkm-radar-dot.bkm-radar-s${i}{--bkm-r-dot-animation:${progress} var(--bkm-r-dur) var(--bkm-r-ease) ${delay} backwards,${fade} 150ms ease-out backwards}`
  }

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
const radarEntranceVars: (o: Readonly<RadarEntranceVarsInput>) => CSSProperties = (
  o: Readonly<RadarEntranceVarsInput>,
) => {
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
