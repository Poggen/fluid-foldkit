import { constant } from 'effect/Function'
/* @license Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud. */
import { Effect, FiberSet, Layer } from 'effect'
import type { Html, VNode } from 'foldkit/html'
import {
  animateSingleValue,
  GroupAnimationWithThen,
  frame,
  cancelFrame,
  motionValue,
} from 'motion-dom'
import type {
  MotionValue,
  AnimationPlaybackControlsWithThen,
  ValueAnimationTransition,
} from 'motion-dom'
import { spring } from './lib/springs.js'

export interface BannerMotionConfig {
  readonly appear: {
    readonly row: ValueAnimationTransition<number>
    readonly banner: ValueAnimationTransition<number>
    readonly fromScale: number
  }
  readonly dismiss: {
    readonly row: ValueAnimationTransition<number>
    readonly shrinkTo: number
  }
}

export const bannerMotion: BannerMotionConfig = {
  appear: {
    row: { type: 'spring', duration: spring.moderate.duration * 2, bounce: 0 },
    banner: {
      type: 'spring',
      duration: spring.slow.duration,
      bounce: spring.slow.bounce,
      delay: spring.fast.duration,
    },
    fromScale: 0.4,
  },
  dismiss: {
    row: { duration: spring.moderate.exit.duration * 2, ease: 'easeInOut' },
    shrinkTo: 0.6,
  },
}

export const BANNER_EXIT_EVENT = 'fluid-banner-exit-complete'

export interface BannerAnimation {
  readonly present: boolean
  readonly initial: boolean
  readonly generation: number
  readonly fixed: boolean
  readonly reduceMotion: boolean
  readonly config: BannerMotionConfig
}

type FollowCompletion = (settled: Promise<unknown>, complete: () => void) => void

function animate(
  value: MotionValue<number>,
  target: number,
  transition: ValueAnimationTransition<number>,
  follow: FollowCompletion,
) {
  const { onComplete, ...options } = transition
  const animation = new GroupAnimationWithThen([animateSingleValue(value, target, options)])

  if (onComplete !== undefined) {
    follow(animation.finished, onComplete)
  }

  return animation
}

const focusable =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

function focusNeighbour(root: HTMLElement) {
  const candidates = [...root.ownerDocument.querySelectorAll<HTMLElement>(focusable)].filter(
    (element) => !root.contains(element) && (element.checkVisibility?.() ?? true),
  )

  const range = root.ownerDocument.createRange()
  range.selectNode(root)
  const after = candidates.find((element) => range.comparePoint(element, 0) === 1)

  const before = candidates.findLast((element) => range.comparePoint(element, 0) === -1)

  ;(after ?? before)?.focus({ preventScroll: true })
}

function remainingRow(value: number, origin: number) {
  return origin > 0 ? value / origin : 0
}

function mount(root: HTMLElement, initial: BannerAnimation, follow: FollowCompletion) {
  const content = root.firstElementChild?.firstElementChild

  if (!(content instanceof HTMLElement)) {
    throw new Error('Banner motion requires its content')
  }

  const row = motionValue(initial.initial ? 0 : 1)
  const shown = motionValue(initial.initial ? 0 : 1)

  const scale = motionValue(
    initial.initial && !initial.fixed && !initial.reduceMotion
      ? initial.config.appear.fromScale
      : 1,
  )

  const parent = root.parentElement
  const style = parent === null ? undefined : getComputedStyle(parent)

  const column =
    parent !== null &&
    parent.children.length > 1 &&
    style?.display.endsWith('flex') === true &&
    style.flexDirection.startsWith('column')

  const rowGap = style?.rowGap.replace(/px$/u, '') ?? ''
  const parsedGap = rowGap === '' ? Number.NaN : Number(rowGap)
  const gap = column && Number.isFinite(parsedGap) ? parsedGap : 0
  let overflow = initial.fixed ? 'hidden' : 'visible'
  let observed: BannerAnimation | undefined
  let controls: Array<AnimationPlaybackControlsWithThen> = []
  let unfollow: (() => void) | undefined

  let disposed = false

  const render = () => {
    if (disposed || observed === undefined) {
      return
    }

    const r = row.get()
    const s = scale.get()
    const y = observed.fixed && !observed.reduceMotion ? `${(r - 1) * 100}%` : '0%'
    root.style.overflow = overflow
    root.style.gridTemplateRows = `${r}fr`
    root.style.marginBottom = `${(r - 1) * gap}px`
    content.style.opacity = String(shown.get())
    const transforms = []

    if (y !== '0%') {
      transforms.push(`translateY(${y})`)
    }

    if (s !== 1) {
      transforms.push(`scale(${s})`)
    }

    content.style.transform = transforms.join(' ') || 'none'
    content.style.pointerEvents = shown.get() > 0.5 ? 'auto' : 'none'
  }

  const schedule = () => {
    frame.render(render)
  }

  const subscriptions = [
    row.on('change', schedule),
    shown.on('change', schedule),
    scale.on('change', schedule),
  ]

  const stop = () => {
    unfollow?.()

    for (const control of controls) {
      control.stop()
    }

    controls = []
  }

  const synchronize = (next: BannerAnimation) => {
    const previous = observed
    observed = next

    if (
      previous !== undefined &&
      previous.present === next.present &&
      previous.fixed === next.fixed &&
      previous.reduceMotion === next.reduceMotion
    ) {
      return
    }

    stop()
    const { appear: enter, dismiss: leave } = next.config
    const scaled = !next.fixed && !next.reduceMotion
    const slides = next.fixed && !next.reduceMotion

    if (next.present) {
      overflow = next.fixed ? 'hidden' : 'visible'
      controls.push(animate(row, 1, next.reduceMotion ? { duration: 0 } : enter.row, follow))

      if (slides) {
        unfollow = row.on('change', (value) => {
          shown.set(value)
        })
      } else {
        controls.push(animate(shown, 1, next.reduceMotion ? spring.fast : enter.banner, follow))

        if (scaled) {
          controls.push(animate(scale, 1, enter.banner, follow))
        }
      }
    } else {
      if (root.contains(root.ownerDocument.activeElement)) {
        focusNeighbour(root)
      }

      const complete = () => {
        if (!disposed && observed?.present === false && observed.generation === next.generation) {
          root.dispatchEvent(new CustomEvent(BANNER_EXIT_EVENT, { detail: next.generation }))
        }
      }

      if (next.reduceMotion) {
        const hide = animate(shown, 0, spring.fast.exit, follow)
        controls.push(hide)
        follow(hide.finished, complete)
      } else {
        overflow = 'hidden'
        const end = next.fixed ? 0 : Math.min(leave.shrinkTo, 0.99)
        const rowFrom = row.get()
        const shownFrom = shown.get()
        const scaleFrom = scale.get()
        unfollow = row.on('change', (value) => {
          const left =
            rowFrom > end ? (value - end) / (rowFrom - end) : remainingRow(value, rowFrom)

          shown.set(shownFrom * Math.min(1, Math.max(0, left)))

          if (scaled) {
            scale.set(Math.min(scaleFrom, Math.max(value, end)))
          }
        })
        const close = animate(row, 0, leave.row, follow)
        controls.push(close)
        follow(close.finished, complete)
      }
    }

    render()
  }

  synchronize(initial)

  return {
    synchronize,
    dispose() {
      disposed = true
      stop()
      cancelFrame(render)

      for (const unsubscribe of subscriptions) {
        unsubscribe()
      }

      row.destroy()
      shown.destroy()
      scale.destroy()
    },
  }
}

/** A scoped adapter owns engine resources; the Block owns all visibility decisions. */
export function createBannerMotionScope() {
  const nodes = new Map<HTMLElement, ReturnType<typeof mount>>()
  let active = false
  let followCompletion: FollowCompletion | undefined

  const synchronize = (vnode: VNode, animation: BannerAnimation) => {
    if (!active) {
      throw new Error('Banner scope requires its owning Layer')
    }

    if (!(vnode.elm instanceof HTMLElement)) {
      return
    }

    const existing = nodes.get(vnode.elm)

    if (existing) {
      existing.synchronize(animation)
    } else {
      if (followCompletion === undefined) {
        throw new Error('Banner completion requires its owning Layer')
      }

      nodes.set(vnode.elm, mount(vnode.elm, animation, followCompletion))
    }
  }
  const node: (vnode: Html, animation: BannerAnimation) => Html = (
    vnode: Html,
    animation: BannerAnimation,
  ) => {
    if (vnode === null) {
      return null satisfies Html
    }

    const previous = vnode.data?.hook

    return {
      ...vnode,
      data: {
        ...vnode.data,
        hook: {
          ...previous,
          insert(node) {
            previous?.insert?.(node)
            synchronize(node, animation)
          },
          postpatch(oldNode, node) {
            previous?.postpatch?.(oldNode, node)
            synchronize(node, animation)
          },
          destroy(node) {
            if (node.elm instanceof HTMLElement) {
              nodes.get(node.elm)?.dispose()
              nodes.delete(node.elm)
            }

            previous?.destroy?.(node)
          },
        },
      },
    } satisfies Html
  }

  return {
    layer: Layer.effectDiscard(
      Effect.gen(function* bannerLifetime() {
        const run = yield* FiberSet.makeRuntime()
        yield* Effect.acquireRelease(
          Effect.sync(() => {
            if (active) {
              throw new Error('Banner scope already acquired')
            }

            followCompletion = (settled, complete) => {
              run(
                Effect.promise(constant(settled)).pipe(Effect.andThen(() => Effect.sync(complete))),
              )
            }

            active = true
          }),
          () =>
            Effect.sync(() => {
              active = false

              for (const node of nodes.values()) {
                node.dispose()
              }

              nodes.clear()
              followCompletion = undefined
            }),
        )
      }),
    ),
    node,
  }
}

export type BannerMotionScope = ReturnType<typeof createBannerMotionScope>
