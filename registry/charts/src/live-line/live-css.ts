import { LABEL_POOL, headEasing, settleFrames, FRAME_MS, stairEasing } from './head-ease'

export const liveCss: (lerp: number) => string = function liveCss(lerp: number) {
  const headEase = stairEasing(headEasing(lerp), settleMs(lerp))
  const scope = '[data-bkm-chart="liveline"]'
  const indices = Array.from(
    { length: LABEL_POOL + 1 },
    (_, index) =>
      `${scope} .bkm-s${index}{--bkm-s:${index}}${scope} .bkm-e${index}{--bkm-e:${index}}`,
  ).join('')
  return `${scope}{--bkm-live-head-ease:${headEase}}${indices}`
}

export const settleMs: (lerp: number) => number = (lerp: number) =>
  Math.round(settleFrames(lerp) * FRAME_MS)
