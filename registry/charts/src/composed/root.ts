import { containerOptions } from '../cartesian/container-options'
import { constVoid } from 'effect/Function'
import { Option, Predicate } from 'effect'
import { projectTimeSeriesViewContext } from '../cartesian/chart-view-context'
import type { ChartContainerRef } from '../cartesian/chart-context'
import { referenceAreaResources } from '../cartesian/reference-area'
import { scopeCartesianPatternLayer } from '../kit/pattern/layers'
import { patternResourceView, scopePatternPaint } from '../kit/pattern/resources'
import { backgroundResources } from '../cartesian/background'
import type { ChartRowSchema } from '../cartesian/data-boundary'
import { defineCartesianBlock } from '../cartesian/block'
import type { CartesianViewInputs } from '../cartesian/block'
import { initialInteraction } from '../cartesian/state'
import { timeSeriesConfiguration } from '../cartesian/root'
import { cartesianServerView } from '../cartesian/server-view'
import { bklitSurfaceStyle, parseAspectRatio } from '../cartesian/style'
import { mountTimeSeriesResource } from '../cartesian/time-series-resource'
import { tooltipView } from '../cartesian/tooltip-view'
import { mergeTooltipCarriers } from '../cartesian/tooltip-carriers'
import { toDate } from '../cartesian/series'
import { composedTooltipRows } from './tooltip'
import type { TimeSeriesProps } from '../cartesian/root-options'
import { composedDefinition } from './definition'
import { ComposedBarDatum } from './bars'
import type { ComposedChartProps } from './options'

export function ComposedChart<
  RowSchema extends ChartRowSchema & { readonly Type: Readonly<Record<string, unknown>> },
>(options: { readonly name: string; readonly Row: RowSchema }) {
  type Row = RowSchema['Type']

  type SceneDatum = Row | ComposedBarDatum<Row>

  const recipe = defineCartesianBlock<RowSchema, SceneDatum>({ ...options, restartOnMount: true })

  const presentation: (props: ComposedChartProps<Row>) => TimeSeriesProps<Row> = (
    props: ComposedChartProps<Row>,
  ) => ({
    ...props,
    children: props.children.filter((child) => child.kind !== 'seriesBar'),
    animationDuration:
      props.enterTransition?.duration === undefined
        ? (props.animationDuration ?? 1100)
        : props.enterTransition.duration * 1000,
  })
  const inputs: (
    id: string,
    publicProps: ComposedChartProps<Row>,
  ) => CartesianViewInputs<Row, SceneDatum> = (
    id: string,
    publicProps: ComposedChartProps<Row>,
  ) => {
    const patterns = [
      ...publicProps.children.flatMap((child) => (child.kind === 'pattern' ? [child.props] : [])),
      ...backgroundResources(publicProps.children.filter((child) => child.kind !== 'seriesBar')),
      ...referenceAreaResources(
        publicProps.children.filter((child) => child.kind !== 'seriesBar'),
        { top: 40, right: 40, bottom: 40, left: 40, ...publicProps.margin },
      ),
    ]

    const props = {
      ...publicProps,
      children: publicProps.children.map((child) => {
        if (child.kind !== 'seriesBar') {
          return scopeCartesianPatternLayer(child, id, patterns)
        }

        const scoped = { ...child, props: { ...child.props } }

        if (scoped.props.fill !== undefined) {
          scoped.props.fill = scopePatternPaint(scoped.props.fill, id, patterns)
        }

        if (scoped.props.stroke !== undefined) {
          scoped.props.stroke = scopePatternPaint(scoped.props.stroke, id, patterns)
        }

        return scoped
      }),
    }

    const view = presentation(props)
    const compile = composedDefinition(id, props)
    const tooltip = mergeTooltipCarriers(view.children)
    const x = props.x ?? ((row: Row) => toDate(row[props.xDataKey ?? 'date']))
    const containerRef: ChartContainerRef = { current: null }

    const barLines = props.children
      .filter((child) => child.kind === 'seriesBar')
      .map(({ props: bar }) => ({
        dataKey: bar.dataKey,
        stroke: bar.stroke ?? bar.fill ?? 'var(--chart-line-primary)',
        strokeWidth: 0,
        yAxisId: 'left',
      }))

    const context = projectTimeSeriesViewContext(view, x, containerRef, {
      kind: 'composed',
      lines: barLines,
      extras: {
        composedBarDataKeys: barLines.map((line) => line.dataKey),
        composedBarSize: props.barSize,
        composedMaxBarSize: props.maxBarSize,
        composedBarGap: props.barGap ?? 4,
        composedStacked: props.stacked === true,
        composedStackGap: props.stackGap ?? 0,
      },
    })

    const aspectRatio = parseAspectRatio(props.aspectRatio)
    const ariaLabel = props.ariaLabel ?? 'Composed chart'

    return {
      definitionRevision: Symbol(id),
      resources: patternResourceView(id, patterns, [], { ...bklitSurfaceStyle, ...props.style }),
      observeContainer: (element) => {
        containerRef.current = element
      },
      renderContext: (h, data, index, state, capabilities, isClient) =>
        props.renderContext?.(
          context(
            data,
            index,
            state,
            isClient && containerRef.current !== null
              ? Option.getOrUndefined(state.viewport)
              : undefined,
            capabilities,
          ),
          h,
        ) ?? h.empty,
      sourceOf: (datum) => (datum instanceof ComposedBarDatum ? datum.source : datum),
      rebuildOnClock: true,
      tooltip: { id: `${id}-tooltip`, horizontalBars: false },
      definition: (data, tooltipExtension) =>
        compile(
          data,
          initialInteraction(timeSeriesConfiguration(view)),
          constVoid,
          () => 0,
          tooltipExtension,
        ),
      resourceDefinition: compile,
      configureResource: (resource) => {
        if (resource.configure === undefined) {
          return false
        }

        resource.configure(view)

        return true
      },
      createResource: (element, observe, clock) =>
        mountTimeSeriesResource<Row, SceneDatum>(
          { drawingHost: element, visualRoot: undefined },
          observe,
          view,
          id,
          clock,
          {
            modelViewport: 'RenderContext',
          },
        ),
      renderContent: (data, index, state) =>
        tooltipView(
          `${id}-tooltip`,
          data,
          index,
          tooltip,
          composedTooltipRows(props.children),
          x,
          state.revealReady && state.phase === 'ready',
        ),
      serverContent: (data, state) =>
        cartesianServerView(
          compile(data, state, constVoid, () => 0),
          props.width ?? 640,
          props.height ??
            (Predicate.isNumber(props.style?.height)
              ? props.style.height
              : (props.width ?? 640) / aspectRatio),
          id,
          ariaLabel,
          undefined,
          { ...bklitSurfaceStyle, ...props.style },
        ),
      ariaLabel,
      ...containerOptions(props),
      aspectRatio,
      fillHeight: props.style?.aspectRatio === 'unset' || props.style?.height !== undefined,
    } satisfies CartesianViewInputs<Row, SceneDatum>
  }

  return {
    ...recipe,
    configuration: (props: ComposedChartProps<Row>) => timeSeriesConfiguration(presentation(props)),
    inputs,
  }
}
