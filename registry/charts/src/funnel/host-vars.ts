import { toCssEase } from '../kit/motion/enter-transition'

type CSSProperties = Readonly<Record<string, string | number>>

const range: (n: number) => Array<number> = (n: number) => Array.from({ length: n }, (_, i) => i)

/** Per-layer resting transform of a hot ring (`--bkm-hot<layer>`): the scale on the pop axis, precomputed so no hover rule evaluates a calc. */
const funnelHoverVars: (
  layers: number,
  horizontal: boolean,
  pop: (layer: number, layers: number) => number,
) => CSSProperties = (
  layers: number,
  horizontal: boolean,
  pop: (layer: number, layers: number) => number,
) => {
  const vars: Array<[string, string]> = []

  for (const layer of range(layers)) {
    const scale = 1 + pop(layer, layers)
    vars.push([`--bkm-hot${layer}`, horizontal ? `scale(1, ${scale})` : `scale(${scale}, 1)`])
  }

  return Object.fromEntries<string>(vars)
}

interface FunnelEntranceInput {
  readonly horizontal: boolean
  readonly staggerDelaySec: number
  readonly durationSec: number
  readonly ease: ReadonlyArray<number> | undefined
}

/** Entrance duration, easing, grow origin and stage stagger (the stage index is `--bkm-fi` in funnel.css). */
const funnelEntranceVars: (input: Readonly<FunnelEntranceInput>) => CSSProperties = (
  input: Readonly<FunnelEntranceInput>,
) =>
  Object.fromEntries<string>([
    ['--bkm-e-dur', `${Math.round(input.durationSec * 1000)}ms`],
    ['--bkm-e-ease', toCssEase(input.ease)],
    ['--bkm-e-origin', input.horizontal ? '0% 50%' : '50% 0%'],
    ['--bkm-e-stagger', `${Math.round(input.staggerDelaySec * 1000)}ms`],
  ])

/** Instance-owned index and resting hover paint for every stage emitted by the real mark. */
const funnelStageCss: (id: string, stages: number, layers: number) => string = (
  id: string,
  stages: number,
  layers: number,
) => {
  const host = `[data-bkm-funnel-id="${encodeURIComponent(id)}"]`

  const stageRules = range(stages).map((index) => {
    const stage = `.bkm-fs:nth-child(${index + 1})`
    const active = `${host}[data-hover="${index}"] ${stage}`

    return `${host} ${stage}{--bkm-fi:${index}}${active}>.bkm-fr,${active}>.bkm-fl{--bkm-funnel-opacity:1}${active} .bkm-ring{--bkm-funnel-transform:var(--bkm-ring-hot)}`
  })

  const layerRules = range(layers).map(
    (layer) => `${host} .bkm-l${layer}{--bkm-ring-hot:var(--bkm-hot${layer})}`,
  )

  return [...stageRules, ...layerRules].join('')
}

export { funnelEntranceVars, funnelHoverVars, funnelStageCss }
