import type { createSpringDriver } from '../pie/private/spring-driver'
import type { Spring } from '../kit/motion/springs'

const readHoverIndex: (host: HTMLElement) => number | null = (host: HTMLElement) =>
  host.dataset.hover === undefined ? null : Number(host.dataset.hover)

const range: (n: number) => Array<number> = (n: number) => Array.from({ length: n }, (_, i) => i)

const DIM_PERCENT = 60

const LABEL_SPRING: Spring = { damping: 24, mass: 1, stiffness: 300 }

const ringSpring: (layer: number) => Spring = (layer: number) => ({
  damping: Math.max(6, 24 - layer * 3),
  mass: 1,
  stiffness: Math.max(60, 300 - layer * 60),
})

interface FunnelPopOptions {
  readonly horizontal: boolean
  readonly layers: number
  /** Rest-to-hot scale delta of a ring (marks.ts popExtra). */
  readonly popOf: (layer: number, layers: number) => number
}

interface FunnelPop {
  /** The hovered stage changed (null = none): every ring of the previous and the new stage springs to its new target from its live state. */
  readonly to: (stage: number | null) => void
  /** The stage's rings remount at rest in bklit (enterComplete): a hovered stage springs up from rest again. */
  readonly restart: (stage: number) => void
  readonly dispose: () => void
}

const stageGroup: (host: HTMLElement, stage: number) => Element | undefined = (
  host: HTMLElement,
  stage: number,
) => host.querySelector('.bkm-stages')?.children[stage]

const ringsOf: (
  host: HTMLElement,
  stage: number,
  layers: number,
) => Array<{ readonly el: SVGElement; readonly layer: number }> = (
  host: HTMLElement,
  stage: number,
  layers: number,
) => {
  const rings: Array<{ el: SVGElement; layer: number }> = []
  const group = stageGroup(host, stage)

  for (let layer = 0; layer < layers; layer += 1) {
    for (const el of group?.querySelectorAll<SVGElement>(`.bkm-l${layer}`) ?? []) {
      rings.push({ el, layer })
    }
  }

  return rings
}

const dimOf: (stage: number, hovered: number | null) => number = (
  stage: number,
  hovered: number | null,
) => (hovered !== null && hovered !== stage ? 1 : 0)

const createFunnelPop: (
  host: HTMLElement,
  options: Readonly<FunnelPopOptions>,
  driver: ReturnType<typeof createSpringDriver>,
) => FunnelPop = (
  host: HTMLElement,
  options: Readonly<FunnelPopOptions>,
  driver: ReturnType<typeof createSpringDriver>,
) => {
  let current = readHoverIndex(host)

  const targetOf: (stage: number, layer: number, hovered: number | null) => number = (
    stage: number,
    layer: number,
    hovered: number | null,
  ) => (stage === hovered ? options.popOf(layer, options.layers) : 0)

  const scaleOf: (value: number) => string = (value: number) =>
    options.horizontal ? `scale(1,${1 + value})` : `scale(${1 + value},1)`

  const play: (
    el: SVGElement,
    layer: number,
    rest: number,
    target: number,
    from?: number,
  ) => void = (el: SVGElement, layer: number, rest: number, target: number, from?: number) => {
    const job = {
      affine: true,
      el,
      frame: (value: number) => ({ transform: scaleOf(value) }),
      rest,
      spring: ringSpring(layer),
      target,
    }

    driver.play(from === undefined ? job : { ...job, from })
  }

  const playLabels: (stage: number, previous: number | null, next: number | null) => void = (
    stage: number,
    previous: number | null,
    next: number | null,
  ) => {
    const el = stageGroup(host, stage)?.querySelector<SVGElement>('.bkm-fl')

    if (el) {
      driver.play({
        affine: true,
        el,
        frame: (value) => ({ opacity: String(1 - (value * DIM_PERCENT) / 100) }),
        rest: dimOf(stage, previous),
        spring: LABEL_SPRING,
        target: dimOf(stage, next),
      })
    }
  }

  return {
    dispose: () => {
      current = null
    },
    restart: (stage) => {
      if (stage !== current) {
        return
      }

      for (const { el, layer } of ringsOf(host, stage, options.layers)) {
        play(el, layer, 0, targetOf(stage, layer, current), 0)
      }
    },
    to: (stage) => {
      const previous = current

      if (stage === previous) {
        return
      }

      current = stage

      const labelled =
        previous === null || stage === null
          ? range(host.querySelector('.bkm-stages')?.children.length ?? 0)
          : [previous, stage]

      for (const label of labelled) {
        playLabels(label, previous, stage)
      }

      for (const touched of new Set([previous, stage])) {
        if (touched !== null) {
          for (const { el, layer } of ringsOf(host, touched, options.layers)) {
            play(el, layer, targetOf(touched, layer, previous), targetOf(touched, layer, current))
          }
        }
      }
    },
  }
}

export { createFunnelPop }

export type { FunnelPop }
