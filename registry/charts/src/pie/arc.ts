import { arc as d3Arc } from 'd3-shape'
import type { Arc } from 'd3-shape'

/**
 * How a hovered slice reacts: `"translate"` moves it outward, `"grow"` extends its outer radius, `"none"` leaves it in place.
 */
type PieHoverEffect = 'translate' | 'grow' | 'none'

interface PieArcRow {
  readonly roleIndex: number
  readonly sliceIndex: number
  readonly startAngle: number
  readonly endAngle: number
  readonly padAngle: number
  readonly fill: string
  readonly effect: PieHoverEffect
  readonly offset: number
  readonly animate: boolean
  readonly glowColor: string
  readonly showGlow: boolean
  readonly className: string
}

interface PieArcGeneratorOptions {
  readonly innerRadius: number
  readonly cornerRadius: number
}

const buildBaseArc: (
  row: PieArcGeneratorOptions,
  outerRadius: number,
) => Arc<unknown, PieArcRow> = (row: PieArcGeneratorOptions, outerRadius: number) =>
  d3Arc<PieArcRow>()
    .startAngle((datum: Readonly<PieArcRow>) => datum.startAngle)
    .endAngle((datum: Readonly<PieArcRow>) => datum.endAngle)
    .padAngle((datum: Readonly<PieArcRow>) => datum.padAngle)
    .innerRadius(row.innerRadius)
    .outerRadius(outerRadius)
    .cornerRadius(row.cornerRadius)

const pieArcGenerator =
  (options: Readonly<PieArcGeneratorOptions>) => (layout: Readonly<{ radius: number }>) =>
    buildBaseArc(options, layout.radius) satisfies Arc<unknown, PieArcRow>

/** Slice outline at an explicit outer radius (the grown variant for donuts, built once per slice on the host, not on hover). */
const pieArcPath: (
  options: Readonly<PieArcGeneratorOptions>,
  outerRadius: number,
  row: Readonly<PieArcRow>,
) => string = (
  options: Readonly<PieArcGeneratorOptions>,
  outerRadius: number,
  row: Readonly<PieArcRow>,
) => buildBaseArc(options, outerRadius)(row) ?? ''

export { pieArcGenerator, pieArcPath }

export type { PieArcRow, PieHoverEffect }
