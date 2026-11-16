import { buildExtraMarks } from './marks'
import type { ExtraMarkInput } from './marks'
import { buildDepthMarks } from './depth'
import { keyStarts, keyEnds } from '../kit/renderer-dom'
import { cssAttr } from './hover'
import type { HoverTarget } from './hover'
import type { BarSeries } from './model'

interface BarDecorationInputs<Row> {
  readonly common: Omit<ExtraMarkInput<Row>, 'live'>
  readonly bars: ReadonlyArray<BarSeries>
  readonly horizontal: boolean
  readonly loading: boolean
  readonly innerHeight: number
}

function barHoverTargets(bars: ReadonlyArray<BarSeries>): Array<HoverTarget> {
  return [
    ...bars.map((item) => ({
      select: `${keyStarts('bars:')}${keyEnds(`:${cssAttr(item.key)}`)}:not(g)`,
      keep: null,
      dim: bars[0]?.bar?.fadedOpacity ?? 0.3,
      seriesIndex: item.index,
      legendOnly: true,
    })),
    {
      select: `${keyStarts('bars:')}:not(g)`,
      keep: (index) =>
        `:is(${bars.map((item) => keyEnds(`:${index}:${cssAttr(item.key)}`)).join(',')})`,
      dim: bars[0]?.bar?.fadedOpacity ?? 0.3,
    },
  ]
}

export function buildBarDecorations<Row>({
  common,
  bars,
  horizontal,
  loading,
  innerHeight,
}: BarDecorationInputs<Row>) {
  const extra =
    horizontal || loading ? undefined : buildExtraMarks({ ...common, live: { innerHeight } })

  const depth = horizontal || loading ? undefined : buildDepthMarks(common)

  const marks = [...(extra?.marks ?? []), ...(depth?.marks ?? [])]

  const hover: Array<HoverTarget> = [
    ...barHoverTargets(bars),
    ...(extra?.hover ?? []),
    ...(depth?.hover ?? []),
  ]

  return {
    marks,
    hover,
    gradients: depth?.gradients ?? [],
    pulseClips: depth?.clips ?? [],
    depthTargets: depth?.targets ?? [],
  }
}
