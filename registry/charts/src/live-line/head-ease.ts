/** Progress of bklit's per-frame lerp, as an easing over `settleFrames(lerp)` frames (progress 0..1). */
export const headEasing: (lerp: number) => (progress: number) => number = function headEasing(
  lerp: number,
) {
  const frames = settleFrames(lerp)
  const end = 1 - (1 - lerp) ** frames

  return (p: number) => ((1 - (1 - lerp) ** (p * frames)) / end) satisfies number
}

/** The badge text over one tick. bklit commits `format(display)` about every 32ms while display chases the target at `lerp` per frame; that walk is computed once per tick
 * (display at the first step is `from`) and the distinct texts become the label stack: pure data, no timers. */
export const headLabels: (
  from: number,
  target: number,
  lerp: number,
  format: (v: number) => string,
) => Array<HeadLabel> = function headLabels(
  from: number,
  target: number,
  lerp: number,
  format: (v: number) => string,
) {
  const final = format(target)
  const out: Array<HeadLabel> = []
  let step = 0

  for (; step < LABEL_STEPS; step += 1) {
    const text = format(target + (from - target) * (1 - lerp) ** ((step * COMMIT_MS) / FRAME_MS))

    if (text === final) {
      break
    }

    if (out.at(-1)?.text !== text) {
      out.push({ text, step })
    }
  }

  out.push({ text: final, step })

  return out
}

export const FRAME_MS = 1000 / 60

/** bklit's React commit interval for the live loop (LIVE_FRAME_COMMIT_MS, live-line-chart.tsx:80); also when its axis re-picks the label step. */
export const COMMIT_MS = 32

const SETTLE = 1e-3

/** Frames the lerp needs to settle within SETTLE of its target. */
export const settleFrames: (lerp: number) => number = (lerp: number) =>
  Math.min(600, Math.max(36, Math.log(SETTLE) / Math.log(1 - lerp)))

const EASE_POINTS = 24

/** An easing (progress 0..1) as a CSS `linear()` timing function. */
export const sampledEasing: (ease: (progress: number) => number) => string = (
  ease: (progress: number) => number,
) =>
  `linear(${Array.from({ length: EASE_POINTS + 1 }, (_, i) => Number(ease(i / EASE_POINTS).toFixed(4))).join(',')})`

/** Steps of a CSS clock quantised to bklit's commit interval. On this grid: the roll (path easing, tail, label slides), the head settle. bklit repaints those only on its COMMIT_MS commits,
 * so a smoother clock buys style and paint passes it never does; with them all stepped the page makes fewer frames (idle share, METRICS.md). Not on it: the pulse ring, which is SMIL
 * in bklit (live-line.tsx `<animate>`) and runs at the display rate, so it stays a continuous linear animation (live-pulse.tsx). */
export const commitSteps: (ms: number) => number = (ms: number) =>
  Math.max(1, Math.round(ms / COMMIT_MS))

/** `steps()` over `ms`: a linear clock held for each commit interval. */
export const stepEase: (ms: number) => string = (ms: number) => `steps(${commitSteps(ms)},jump-end)`

/** An easing held for each commit interval, as a `linear()` (plateaus are repeated positions). */
export const stairEasing: (ease: (progress: number) => number, ms: number) => string = (
  ease: (progress: number) => number,
  ms: number,
) => {
  const n = commitSteps(ms)
  const stops: Array<string> = []

  for (let i = 0; i < n; i += 1) {
    const v = Number(ease(i / n).toFixed(4))
    stops.push(`${v} ${((i / n) * 100).toFixed(3)}%`, `${v} ${(((i + 1) / n) * 100).toFixed(3)}%`)
  }

  stops.push('1 100%')

  return `linear(${stops.join(',')})`
}

const LABEL_STEPS = 44

/** Label nodes in the tip's stack: one per distinct text, plus the final one. */
export const LABEL_POOL = LABEL_STEPS + 1

export interface HeadLabel {
  readonly text: string
  /** The commit step (COMMIT_MS each) this text first shows at. */
  readonly step: number
}

const INTRO_Y_WEIGHT = 0.4

export const introEasing = (lerp: number, durationMs: number) => {
  const k = durationMs / FRAME_MS
  const end = 1 - (1 - lerp) ** k

  return (p: number) =>
    (INTRO_Y_WEIGHT * ((1 - (1 - lerp) ** (p * k)) / end) +
      (1 - INTRO_Y_WEIGHT) * p) satisfies number
}

/** Classes of a pooled label shown from commit step `step` until `next` (liveline.css): a pool's one stepped animation of `--bkm-st` (live-css.ts) switches them; a resting label runs none. */
export const labelWindow: (step: number, next: number | undefined) => string = (
  step: number,
  next: number | undefined,
) => `bkm-s${step}${next === undefined ? '' : ` bkm-e${next}`}`
