import { animateSingleValue, motionValue, SVGVisualElement, transformValue } from 'motion-dom'
import type { AnimationPlaybackControlsWithThen, MotionNodeOptions, MotionValue } from 'motion-dom'
import type { LineLoadingPulseMode } from '../motion/phase'

const EASE = [0.85, 0, 0.15, 1] as const

const CYCLE_SECONDS = 2.2

export function pulseClipGeometry(innerWidth: number, progress: number) {
  const full = innerWidth + 20

  return progress <= 0.5
    ? { width: progress * 2 * full, x: -10 }
    : { width: (2 - progress * 2) * full, x: innerWidth + 10 - (2 - progress * 2) * full }
}

interface PulseClipFrame {
  readonly width: number
  readonly height: number
  readonly left: number
  readonly top: number
  readonly mode: LineLoadingPulseMode
  readonly epoch: number
  readonly callbackKey: (() => void) | undefined
}

/** Original's numeric MotionValue and SVG renderer, without a second clock or CSS inset tween. */
export function createPulseClipMotion(rect: SVGRectElement, completed: () => void) {
  const progress = motionValue(0)
  const plotWidth = motionValue(0)
  const left = motionValue(0)
  const width = transformValue(() => pulseClipGeometry(plotWidth.get(), progress.get()).width)
  const x = transformValue(() => left.get() + pulseClipGeometry(plotWidth.get(), progress.get()).x)

  const props: MotionNodeOptions & {
    readonly style: { readonly width: MotionValue<number>; readonly x: MotionValue<number> }
  } = { style: { width, x } }

  const visual = new SVGVisualElement({
    visualState: {
      latestValues: { width: width.get(), x: x.get() },
      renderState: { style: {}, transform: {}, transformOrigin: {}, vars: {}, attrs: {} },
    },
    props,
    presenceContext: null,
    reducedMotionConfig: 'never',
  })

  visual.mount(rect)
  visual.render()

  let previous: PulseClipFrame | undefined
  let controls: AnimationPlaybackControlsWithThen | undefined
  let generation = 0

  const stop = () => {
    generation += 1
    controls?.stop()
    controls = undefined
  }

  const run = (mode: LineLoadingPulseMode) => {
    stop()
    const active = generation

    const finish = () => {
      if (generation === active) {
        completed()
      }
    }

    const animate = (to: number, seconds: number, onComplete: () => void) => {
      controls = animateSingleValue(progress, to, {
        duration: Math.max(seconds, 0.01),
        ease: [...EASE],
        onComplete: () => {
          if (generation === active) {
            onComplete()
          }
        },
      })
    }

    const shrink = (from: number) => {
      animate(1, (CYCLE_SECONDS / 2) * ((1 - from) / 0.5), finish)
    }

    if (mode === 'loop') {
      progress.set(0)
      animate(1, CYCLE_SECONDS, finish)
    } else if (mode === 'enter') {
      progress.set(0)
      animate(0.5, CYCLE_SECONDS / 2, finish)
    } else if (progress.get() < 0.5) {
      animate(0.5, (CYCLE_SECONDS / 2) * ((0.5 - progress.get()) / 0.5), () => {
        shrink(0.5)
      })
    } else {
      shrink(progress.get())
    }
  }

  return {
    update(frame: PulseClipFrame) {
      rect.style.display = frame.width > 0 ? '' : 'none'
      rect.setAttribute('height', String(frame.height + 20))
      rect.setAttribute('y', String(frame.top - 10))
      plotWidth.set(frame.width)
      left.set(frame.left)

      const restart =
        previous === undefined ||
        !Object.is(previous.width, frame.width) ||
        previous.mode !== frame.mode ||
        !Object.is(previous.epoch, frame.epoch) ||
        previous.callbackKey !== frame.callbackKey

      previous = frame

      if (restart) {
        if (frame.width > 0) {
          run(frame.mode)
        } else {
          stop()
        }
      }
    },
    pause() {
      controls?.pause()
    },
    play() {
      controls?.play()
    },
    destroy() {
      stop()
      visual.unmount()
      width.destroy()
      x.destroy()
      plotWidth.destroy()
      left.destroy()
      progress.destroy()
    },
  }
}
