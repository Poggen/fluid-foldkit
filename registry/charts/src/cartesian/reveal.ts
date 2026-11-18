import type {
  ChartMark,
  ChartMotionContext,
  ChartMotionDefinition,
  ChartMotionTiming,
  ChartValue,
  MarkScene,
} from '@tanstack/charts'
import { REVEAL_EASING } from '../kit/motion/easing'
import { resumeEnter } from '../kit/motion/resume-enter'

/** Preserve every datum, point and scale type while transposing the original two-group reveal. */
export const wipeWrap: <
  Datum,
  X extends ChartValue,
  Y extends ChartValue,
  ScaleX extends ChartValue,
  ScaleY extends ChartValue,
  XId extends string,
  YId extends string,
>(
  mark: ChartMark<Datum, X, Y, ScaleX, ScaleY, XId, YId>,
  tag: string,
  wipe: WipeConfig,
  margin: { readonly left: number; readonly top: number; readonly bottom: number },
) => ChartMark<Datum, X, Y, ScaleX, ScaleY, XId, YId> = function wipeWrap<
  Datum,
  X extends ChartValue,
  Y extends ChartValue,
  ScaleX extends ChartValue,
  ScaleY extends ChartValue,
  XId extends string,
  YId extends string,
>(
  mark: ChartMark<Datum, X, Y, ScaleX, ScaleY, XId, YId>,
  tag: string,
  wipe: WipeConfig,
  margin: { readonly left: number; readonly top: number; readonly bottom: number },
) {
  const padding = wipe.padding ?? 0
  const shift = (1 - wipe.progress) * (wipe.width + 2 * padding)

  const wrap: (scene: MarkScene<Datum, X, Y>) => MarkScene<Datum, X, Y> = (
    scene: MarkScene<Datum, X, Y>,
  ) => ({
    ...scene,
    nodes: [
      {
        kind: 'group',
        key: `${WIPE_KEY}o:${tag}`,
        className: 'bkm-wipe-o',
        translateX: -shift,
        clip: {
          x: 0,
          y: 0,
          width: margin.left + wipe.width + padding,
          height: wipe.height + margin.top + margin.bottom,
        },
        children: [
          {
            kind: 'group',
            key: `${WIPE_KEY}i:${tag}`,
            className: 'bkm-wipe-i',
            translateX: shift,
            children: scene.nodes,
          },
        ],
      },
    ],
  })

  const route: (
    own: ChartMotionDefinition<Datum> | undefined,
  ) => ChartMotionDefinition<Datum> | undefined = (
    own: ChartMotionDefinition<Datum> | undefined,
  ) =>
    own === undefined
      ? undefined
      : (context: ChartMotionContext<Datum>) =>
          context.key.startsWith(WIPE_KEY)
            ? wipe.physical === true
              ? false
              : wipeMotion(wipe.duration, wipe.armedAt, wipe.clock())
            : typeof own === 'function'
              ? own(context)
              : own

  const motion = route(mark.motion)

  return {
    ...mark,
    ...(motion === undefined ? {} : { motion }),
    initialize(context) {
      const initialized = mark.initialize(context)
      const localMotion = route(initialized.motion ?? mark.motion)
      const resolveLayout = initialized.resolveLayout

      return {
        ...initialized,
        ...(localMotion === undefined ? {} : { motion: localMotion }),
        render: (renderContext) => wrap(initialized.render(renderContext)),
        ...(resolveLayout === undefined
          ? {}
          : {
              resolveLayout: (layoutContext) => {
                const layout = resolveLayout(layoutContext)

                return { ...layout, render: (renderContext) => wrap(layout.render(renderContext)) }
              },
            }),
      }
    },
  } satisfies ChartMark<Datum, X, Y, ScaleX, ScaleY, XId, YId>
}

export const wipeMotion: (
  duration: number,
  armedAt: WipeConfig['armedAt'],
  now: number,
) => ChartMotionTiming = function wipeMotion(
  duration: number,
  armedAt: WipeConfig['armedAt'],
  now: number,
) {
  const resumed =
    armedAt?.current == null
      ? false
      : resumeEnter({ delay: 0, duration, easing: REVEAL_EASING }, armedAt.current, now)

  return resumed === false
    ? { transition: { type: 'tween', duration, easing: REVEAL_EASING } }
    : resumed
}

export interface WipeConfig {
  readonly progress: number
  readonly width: number
  readonly height: number
  readonly padding?: number
  readonly duration: number
  readonly clock: () => number
  readonly armedAt?: { readonly current: number | null }
  readonly physical?: boolean
}

export const WIPE_KEY = 'wipe-'
