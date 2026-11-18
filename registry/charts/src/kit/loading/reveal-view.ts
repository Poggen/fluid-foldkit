import { Predicate } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { REVEAL_CSS_EASE } from '../motion/easing'
import { DEFAULT_ANIMATION_DURATION_MS } from '../motion/phase'
import type { EnterTransition } from '../motion/phase'

/** Uses SVG x/width keyframes. Callback effects remain the parent's declared Layer responsibility. */
export const ChartRevealClip: <Message, Mounts>(
  h: HtmlBuilder<Message, Mounts>,
  argument1: ChartRevealClipProps<Message>,
) => Html = function ChartRevealClip<Message, Mounts>(
  h: HtmlBuilder<Message, Mounts>,
  {
    clipPathId,
    height,
    targetWidth,
    enterTransition,
    revealEpoch,
    padding = 0,
    animating = true,
    mode = 'reveal',
    onComplete,
  }: ChartRevealClipProps<Message>,
) {
  const { duration, ease } = timingOf(enterTransition)
  const paddedWidth = Math.max(0, targetWidth + padding * 2)
  const paddedHeight = height + padding * 2

  return h.clipPath(
    [h.Id(clipPathId)],
    [
      animating
        ? h.keyed('rect')(`${mode}-${revealEpoch}`, [
            h.Height(String(paddedHeight)),
            h.Y(String(-padding)),
            h.Class(
              mode === 'conceal'
                ? '[animation:bkm-clip-conceal_var(--bkm-clip-duration)_var(--bkm-clip-ease)_forwards]'
                : '[animation:bkm-clip-reveal_var(--bkm-clip-duration)_var(--bkm-clip-ease)_forwards]',
            ),
            h.Attribute(
              'style',
              `--bkm-clip-w:${paddedWidth}px;--bkm-clip-x0:${-padding}px;--bkm-clip-x1:${-padding + paddedWidth}px;--bkm-clip-duration:${duration}s;--bkm-clip-ease:${ease}`,
            ),
            ...(mode === 'conceal' && onComplete !== undefined
              ? [h.OnAnimationEnd(onComplete)]
              : []),
          ])
        : h.rect([
            h.Height(String(paddedHeight)),
            h.Width(String(paddedWidth)),
            h.X(String(-padding)),
            h.Y(String(-padding)),
          ]),
    ],
  ) satisfies Html
}

const cssEase: (ease: EnterTransition['ease']) => string | undefined = function cssEase(
  ease: EnterTransition['ease'],
) {
  if (Predicate.isString(ease)) {
    return ease
  }

  return Array.isArray(ease) && ease.length > 0 ? `cubic-bezier(${ease.join(',')})` : undefined
}

export interface ChartRevealClipProps<Message> {
  readonly clipPathId: string
  readonly height: number
  readonly targetWidth: number
  readonly enterTransition?: EnterTransition
  readonly revealEpoch: number
  readonly padding?: number
  readonly animating?: boolean
  readonly mode?: 'reveal' | 'conceal'
  /** A genuine parent Message, emitted only when conceal ends. */
  readonly onComplete?: Message
}

function timingOf(enter: EnterTransition | undefined) {
  if (enter?.type === 'tween') {
    return { duration: enter.duration ?? 0.3, ease: cssEase(enter.ease) ?? REVEAL_CSS_EASE }
  }

  return {
    duration: Predicate.isNumber(enter?.duration)
      ? enter.duration
      : DEFAULT_ANIMATION_DURATION_MS / 1000,
    ease: REVEAL_CSS_EASE,
  }
}
