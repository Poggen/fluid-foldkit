// Derived from Bklit migration 9bdabac665e6a77d0529dedac2db0267f649e806; MIT.
const HEIGHT_MIN_PCT = 20

const HEIGHT_MAX_PCT = 80

const hashFract = (value: number): number => {
  const x = Math.sin(value) * 43_758.5453

  return x - Math.floor(x)
}

/** Deterministic Source skeleton heights; count and nonfinite values retain Array.from/math behavior. */
export const getSkeletonHeights = (
  count: number,
  seed = 0,
  min = HEIGHT_MIN_PCT,
  max = HEIGHT_MAX_PCT,
): Array<number> =>
  Array.from(
    { length: count },
    (_, index) => min + Math.floor(hashFract((index + 1) * 12.9898 + seed) * (max - min)),
  )
