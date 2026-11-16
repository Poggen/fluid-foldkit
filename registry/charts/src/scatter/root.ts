import { emptyScatterPointer } from './pointer'
import { createScatterPaintLayer } from './paint-layer'
import type { ChartPoint } from '@tanstack/charts'
import { Struct } from 'effect'
import { patternResources, scopeCartesianPatternLayers } from '../kit/pattern/layers'
import type { ChartRowSchema } from '../cartesian/data-boundary'
import { defineCartesianBlock } from '../cartesian/block'
import { cartesianInputs, timeSeriesConfiguration } from '../cartesian/root'
import type { TimeSeriesProps } from '../cartesian/root-options'
import { Line } from '../cartesian/layers'
import { resolveScatterSeries } from './series'
import { buildScatterDefinition } from './definition'
import type { ScatterChartProps } from './options'

function presentation<Row>(props: ScatterChartProps<Row>): TimeSeriesProps<Row> {
  const { onPhaseChange } = props
  const rest = Struct.omit(props, ['enterTransition', 'onPhaseChange'])

  return {
    ...rest,
    animationDuration: props.animationDuration ?? 1100,
    yDomainTween: false,
    children: [
      ...props.children,
      ...resolveScatterSeries(props.children).map((series) =>
        Line({
          dataKey: series.dataKey,
          stroke: series.tooltipColor,
          yAxisId: series.yAxisId,
          showHighlight: false,
        }),
      ),
    ],
    onPhaseChange: (phase) => {
      if (phase === 'loading' || phase === 'revealing' || phase === 'ready') {
        onPhaseChange?.(phase)
      }
    },
  }
}

export function ScatterChart<
  RowSchema extends ChartRowSchema & { readonly Type: Readonly<Record<string, unknown>> },
>(options: { readonly name: string; readonly Row: RowSchema }) {
  const paintLayer = createScatterPaintLayer<RowSchema['Type']>()
  const recipe = defineCartesianBlock({ ...options, startRevealing: true, restartOnMount: true })

  return {
    ...recipe,
    configuration: (props: ScatterChartProps<RowSchema['Type']>) =>
      timeSeriesConfiguration(presentation(props)),
    inputs: (id: string, publicProps: ScatterChartProps<RowSchema['Type']>) => {
      const patterns = patternResources(publicProps.children)

      const props = {
        ...publicProps,
        children: scopeCartesianPatternLayers(publicProps.children, id, patterns),
      }

      const occurrences = new WeakMap<ChartPoint, number>()

      let pointerIndexAt: (point: { readonly x: number; readonly y: number }) => number | null =
        emptyScatterPointer

      return {
        ...cartesianInputs(
          'scatter',
          id,
          presentation(props),
          (data, state, onBuilt, clock, _domainFrame, _presentationProps, tooltipExtension) =>
            buildScatterDefinition(data, {
              id,
              ...(tooltipExtension === undefined ? {} : { tooltipExtension }),
              props,
              state,
              onBuilt,
              clock,
              renderer: paintLayer,
              occurrences,
              onPointerResolver: (resolve) => {
                pointerIndexAt = resolve
              },
            }),
        ),
        pointerIndexAt: (point: { readonly x: number; readonly y: number }) =>
          pointerIndexAt(point),
        pointIndexOf: (point: ChartPoint) => occurrences.get(point),
      }
    },
  }
}
