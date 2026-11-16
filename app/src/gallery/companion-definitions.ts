import { ChartBrush } from '@foldkit-visuals/charts/brush'
import { ChartLegend } from '@foldkit-visuals/charts/legend'
import type { TimeSeriesProps } from '@foldkit-visuals/charts/line'
import { Line } from '@foldkit-visuals/charts/line'
import { Schema } from 'effect'
import { Block } from 'foldkit'
import { Row, data } from './cartesian-definitions'
export const brush = ChartBrush({ name: 'showcase-brush', Row })
const brushKey = Symbol('ShowcaseBrush')
export const BrushBlock = Block.make(brush.namespace, { ...brush.contract, key: brushKey })
export const brushProps = {
  ariaLabel: 'Brush range preview',
  margin: { top: 4, right: 40, bottom: 4, left: 40 },
  xDataKey: 'date',
  animationDuration: 0,
  children: [
    Line({
      dataKey: 'revenue',
      stroke: 'var(--fluid-accent)',
      strokeWidth: 2,
      animate: false,
      fadeEdges: true,
      showHighlight: false,
    }),
  ],
} satisfies TimeSeriesProps<typeof Row.Type>
export const brushConfiguration = brush.configuration({ enabled: true }, brushProps)
export const brushStrip = { ...brush.plot('preview-brush-plot', brushProps), fillHeight: true }
export const brushInputs = brush.inputs(brushStrip, 80)
export const BrushLayer = BrushBlock.makeLayer(brush.plans(BrushBlock))
export const LegendItem = Schema.Struct({
  label: Schema.String,
  value: Schema.Finite,
  color: Schema.String,
  maxValue: Schema.optionalKey(Schema.Finite),
})
export const legend = ChartLegend({ Item: LegendItem })
const legendKey = Symbol('ShowcaseLegend')
export const LegendBlock = Block.make(legend.namespace, { ...legend.contract, key: legendKey })
export const LegendLayer = LegendBlock.makeLayer(legend.plans(LegendBlock))
export const legendData = [
  { label: 'Design', value: 42000, maxValue: 50000, color: '#A088BF' },
  { label: 'Product', value: 28000, maxValue: 50000, color: '#C6B3D8' },
  { label: 'Engineering', value: 19000, maxValue: 50000, color: '#DDD2E6' },
]
export { data }
