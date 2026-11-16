// Derived from Bklit migration 9bdabac665e6a77d0529dedac2db0267f649e806; MIT.
// d3's bump-x curve for the flow ribbons, written out so the sankey bundle needs neither d3-shape nor d3-path.
import type { ChartCurve } from '@tanstack/charts'

type Point = readonly [number, number]

export const bumpPath = (points: ReadonlyArray<Point>): string => {
  let d = ''

  for (let i = 0; i < points.length; i++) {
    const [x, y] = points[i] ?? [0, 0]

    if (i === 0) {
      d = `M${x},${y}`
      continue
    }

    const [px, py] = points[i - 1] ?? [0, 0]
    const mid = (px + x) / 2
    d += `C${mid},${py},${mid},${y},${x},${y}`
  }

  return d
}

// Flow ribbons are stroked lines, so the area form is never drawn; the contract still asks for one.
export const BUMP_CURVE: ChartCurve = { line: bumpPath, area: (top) => bumpPath(top) }
