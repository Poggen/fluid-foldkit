import { scaleBand, scaleLinear } from 'd3-scale'
import { Predicate } from 'effect'
import type { BarChartProps } from './options'
import type { Domains } from '../cartesian/state'
import { parseAspectRatio } from '../cartesian/style'

/** The scene and its sibling paint resources share the same categorical and value space. */
export function barPlot(
  categories: ReadonlyArray<string>,
  domain: readonly [number, number],
  innerWidth: number,
  innerHeight: number,
  props: Pick<BarChartProps<never>, 'orientation' | 'barGap' | 'barWidth'>,
) {
  const horizontal = props.orientation === 'horizontal'

  const categoryBand = scaleBand()
    .domain(categories)
    .range([0, horizontal ? innerHeight : innerWidth])
    .padding(props.barGap ?? 0.2)
  return {
    categoryBand,
    bandWidth: props.barWidth ?? categoryBand.bandwidth(),
    valueScale: scaleLinear()
      .domain([...domain])
      .range(horizontal ? [0, innerWidth] : [innerHeight, 0]),
  }
}

export function barServerSize(
  props: Pick<BarChartProps<never>, 'width' | 'height' | 'style' | 'aspectRatio'>,
) {
  const width = props.width ?? 640

  return {
    width,
    height:
      props.height ??
      (Predicate.isNumber(props.style?.height)
        ? props.style.height
        : width / parseAspectRatio(props.aspectRatio)),
  }
}

export const barValueScales = (
  domains: Domains,
  innerWidth: number,
  innerHeight: number,
  horizontal: boolean,
) =>
  Object.fromEntries(
    Object.entries(domains).map(([id, domain]) => [
      id,
      scaleLinear()
        .domain([...domain])
        .range(horizontal ? [0, innerWidth] : [innerHeight, 0]),
    ]),
  )
