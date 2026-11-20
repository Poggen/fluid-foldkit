/** @license
 * Adapted from Ramka, Copyright (c) 2026 Artur Bień, MIT licensed.
 * Source: bf58a38a92f8905a7014f23da38db06f41479c34.
 * See the distribution LICENSE and NOTICE for the full upstream notice.
 */
/**
 * Morph-group border-radius sampling.
 *
 * `resolveMorphBorderRadius` writes used px on each endpoint. Interpolating
 * those px directly is a no-op when both ends share a pixel value — stories'
 * `1.75rem` stage and a 56px `rounded-full` avatar are both 28px — so a
 * shrinking 9:16 stays a rounded rectangle until the box itself is tiny.
 *
 * Roundness (`r / min(w, h)`) is the shape the user sees: slightly rounded
 * rect → circle. Endpoints still match the measured px; only the mid-morph
 * path changes.
 *
 * The composited morph freezes the group at the destination box `(w1, h1)`
 * and scales it, so the sampled value is re-expressed as elliptical
 * `rx / ry` in that local space (same compensation as before).
 */

export type MorphRadiusCorners = [number, number, number, number]

const fmt = (n: number) => Number(n.toFixed(4))

const lerp = (a: number, b: number, q: number) => a + (b - a) * q

/** Expand a `12px` / four-corner px list into `[tl, tr, br, bl]`. */
export function parseMorphRadiusList(value: string) {
  const tokens = value
    .trim()
    .split(/\s+/)
    .map((t) => Number.parseFloat(t))
    .filter((n) => Number.isFinite(n) && n >= 0)
  const [a = 0, b = a, c = a, d = b] = tokens
  const corners: MorphRadiusCorners = [a, b, c, d]
  return corners
}

function roundness(r: number, minSide: number) {
  return minSide > 0 ? r / minSide : 0
}

/**
 * Compensated `border-radius` for the frozen destination group at eased
 * progress `q`. `w`/`h` are the UA-interpolated box at `q`.
 */
export function compensatedMorphRadiusAt(
  rFrom: MorphRadiusCorners,
  rTo: MorphRadiusCorners,
  q: number,
  box: { w0: number; h0: number; w: number; h: number; w1: number; h1: number },
) {
  const { w0, h0, w, h, w1, h1 } = box
  const min0 = Math.min(w0, h0)
  const min1 = Math.min(w1, h1)
  const minQ = Math.min(w, h)
  const divW = w > 0 ? w : 1
  const divH = h > 0 ? h : 1

  const rUa = ([0, 1, 2, 3] as const).map((corner) => {
    const n = lerp(roundness(rFrom[corner], min0), roundness(rTo[corner], min1), q)
    return n * minQ
  })

  const rH = rUa.map((r) => fmt((r * w1) / divW))
  const rV = rUa.map((r) => fmt((r * h1) / divH))
  return `${rH.map((px) => `${px}px`).join(' ')} / ${rV.map((px) => `${px}px`).join(' ')}`
}
