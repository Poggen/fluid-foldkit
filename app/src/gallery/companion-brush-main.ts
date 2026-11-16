import type { TimeSeriesProps } from '@foldkit-visuals/charts/line'
import { ChartTooltip, Grid, Line, LineChart, XAxis } from '@foldkit-visuals/charts/line'
import { Block } from 'foldkit'
import { Row } from './cartesian-definitions'

export const brushMain = LineChart({ name: 'showcase-brush-main', Row })
const brushMainKey = Symbol('ShowcaseBrushMain')
export const BrushMainBlock = Block.make(brushMain.namespace, {
  ...brushMain.contract,
  key: brushMainKey,
})
export const BrushMainLayer = BrushMainBlock.makeLayer(brushMain.plans(BrushMainBlock))
export const brushMainProps = {
  height: 210,
  xDataKey: 'date',
  children: [
    Grid(),
    Line({ dataKey: 'revenue', stroke: 'var(--fluid-accent)', fadeEdges: false }),
    XAxis(),
    ChartTooltip(),
  ],
} satisfies TimeSeriesProps<typeof Row.Type>
