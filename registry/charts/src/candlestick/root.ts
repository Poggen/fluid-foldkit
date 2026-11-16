import { candlestickDomains } from './domains'
import { patternResources, scopeCartesianPatternLayers } from '../kit/pattern/layers'
import type { ChartRowSchema } from '../cartesian/data-boundary'
import { defineCartesianBlock } from '../cartesian/block'
import { cartesianInputs, timeSeriesConfiguration } from '../cartesian/root'
import { Line } from '../cartesian/layers'
import type { OHLCValues } from './marks'
import type { CandlestickChartProps } from './options'
import { buildCandlestickDefinition } from './definition'

export function CandlestickChart<
  RowSchema extends ChartRowSchema & { readonly Type: OHLCValues },
>(options: { readonly name: string; readonly Row: RowSchema }) {
  const recipe = defineCartesianBlock({ ...options, startRevealing: true, restartOnMount: true })

  return {
    ...recipe,
    configuration: (props: CandlestickChartProps<RowSchema['Type']>) =>
      timeSeriesConfiguration({ ...props, yDomainTween: false }),
    inputs: (id: string, publicProps: CandlestickChartProps<RowSchema['Type']>) => {
      const patterns = patternResources(publicProps.children)

      const props = {
        ...publicProps,
        children: scopeCartesianPatternLayers(publicProps.children, id, patterns),
      }

      return cartesianInputs<RowSchema['Type']>(
        {
          kind: 'candlestick',
          domains: (data, domain) =>
            candlestickDomains(data, props.xDataKey ?? 'date', domain, props.xDomainSlotCount),
          candleWidth: props.candleWidth,
          candleGap: props.candleGap ?? 0.2,
        },
        id,
        {
          ...props,
          children: [
            ...props.children,
            Line({
              dataKey: 'close',
              stroke: 'var(--chart-line-primary)',
              strokeWidth: 2,
              showHighlight: false,
            }),
          ],
        },
        (data, state, onBuilt, clock, _domainFrame, _presentationProps, tooltipExtension) =>
          buildCandlestickDefinition(data, {
            id,
            ...(tooltipExtension === undefined ? {} : { tooltipExtension }),
            props,
            state,
            onBuilt,
            clock,
          }),
      )
    },
  }
}
