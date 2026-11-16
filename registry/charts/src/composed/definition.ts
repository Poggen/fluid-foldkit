import { useChartConfig } from '../cartesian/chart-config'
import { Option } from 'effect'
import { composedBarHoverCss } from './hover'
import type { CartesianResourceInputs } from '../cartesian/native-resource'
import type { ComposedChartProps } from './options'
import { ComposedBarDatum, barYValues, buildBarMarks, buildBarDots, seriesBarWidth } from './bars'
import type { BarLayoutInput } from './bars'
import { buildTimeSeriesDefinition } from '../cartesian/definition'
import { toDate } from '../cartesian/series'
import { loadingFlags, loadingWipe } from '../cartesian/state'
import { mergeTooltipCarriers } from '../cartesian/tooltip-carriers'

export function composedDefinition<Row extends Readonly<Record<string, unknown>>>(
  id: string,
  props: ComposedChartProps<Row>,
): CartesianResourceInputs<Row, Row | ComposedBarDatum<Row>>['definition'] {
  const children = props.children.filter((child) => child.kind !== 'seriesBar')

  const bars = props.children
    .filter((child) => child.kind === 'seriesBar')
    .map(({ props: bar }) => ({
      dataKey: bar.dataKey,
      fill: bar.fill ?? 'var(--chart-line-primary)',
      dotColor: bar.stroke ?? bar.fill ?? 'var(--chart-line-primary)',
      radius: bar.radius ?? 0,
      animate: bar.animate !== false,
      fadedOpacity: bar.fadedOpacity ?? 0.3,
    }))

  const order = [
    ...new Set(
      props.children.flatMap((child) =>
        child.kind === 'line' || child.kind === 'area' || child.kind === 'seriesBar'
          ? [child.props.dataKey]
          : [],
      ),
    ),
  ]
  const tooltip = mergeTooltipCarriers(children)

  return (data, state, onBuilt, clock, tooltipExtension) => {
    const layout = (plot: {
      readonly innerWidth: number
      readonly innerHeight: number
      readonly xDomain: readonly [Date, Date]
      readonly yDomain: readonly [number, number]
    }): BarLayoutInput<Row> => ({
      data,
      bars,
      xKey: props.xDataKey ?? 'date',
      ...plot,
      xSpanMs: plot.xDomain[1].getTime() - plot.xDomain[0].getTime(),
      barGap: props.barGap ?? 4,
      stacked: props.stacked === true,
      stackGap: props.stackGap ?? 0,
      animationDuration: state.configuration.animationDuration,
      entered: state.phaseClockReady,
      glide: state.updateStep === 'glide',
      growingSince: () => Option.getOrNull(state.phaseClockAt),
      clock,
      ...(props.barSize === undefined ? {} : { barSize: props.barSize }),
      ...(props.maxBarSize === undefined ? {} : { maxBarSize: props.maxBarSize }),
      dots:
        tooltip === undefined || tooltip.showDots === false
          ? false
          : {
              radius: tooltip.dotSize ?? 5,
              strokeWidth: tooltip.dotStrokeWidth ?? 2,
              ...(typeof tooltip.dotColor === 'string' ? { color: tooltip.dotColor } : {}),
            },
    })

    return buildTimeSeriesDefinition<Row, ComposedBarDatum<Row>>(data, {
      id,
      x: props.x ?? ((row) => toDate(row[props.xDataKey ?? 'date'])),
      children,
      tooltipSpring: useChartConfig(props.environment).tooltipSpring,
      ...(props.margin === undefined ? {} : { margin: props.margin }),
      ...(props.xDomain === undefined ? {} : { xDomain: props.xDomain }),
      wipeArmedAt: Option.getOrNull(state.phaseClockAt),
      wipePadding: (innerWidth) => {
        const width = seriesBarWidth({
          innerWidth,
          dataLength: data.length,
          seriesCount: bars.length,
          gap: props.barGap ?? 4,
          stacked: props.stacked === true,
          ...(props.barSize === undefined ? {} : { barSize: props.barSize }),
          ...(props.maxBarSize === undefined ? {} : { maxBarSize: props.maxBarSize }),
        })

        return bars.length === 0
          ? 0
          : Math.ceil(
              (props.stacked === true || bars.length <= 1
                ? width
                : bars.length * width + (bars.length - 1) * (props.barGap ?? 4)) / 2,
            )
      },
      extraYValues: barYValues(
        data,
        bars.map((bar) => bar.dataKey),
        props.stacked === true,
      ),
      extraMarks: (plot) => buildBarMarks(layout(plot)),
      extraDots: (plot) => buildBarDots(layout(plot)),
      skeletonRows: loadingFlags(state.phase).skeletonRows,
      chartLoading: loadingFlags(state.phase).chartLoading,
      gridLoading: loadingFlags(state.phase).gridLoading,
      animationDuration: state.configuration.animationDuration,
      wipe:
        state.configuration.status === 'ready'
          ? {
              progress: state.configuration.animationDuration > 0 && !state.phaseClockReady ? 0 : 1,
              duration: state.configuration.animationDuration,
            }
          : loadingWipe(state.phase, state.configuration.animationDuration),
      clock,
      sourceHover: true,
      ...(tooltip === undefined || tooltipExtension === undefined ? {} : { tooltipExtension }),
      ...(state.updateStep === 'none' ? {} : { updateStep: state.updateStep }),
      ...(state.updateStep === 'snap' ? { yDomainFrom: state.yDomainFrom } : {}),
      onBuilt: (snapshot) =>
        onBuilt({
          ...snapshot,
          resourceCss: (snapshot.resourceCss ?? '') + composedBarHoverCss(id, bars, order),
          hover: {
            ...snapshot.hover,
            dim: snapshot.hover.dim.map((rule) => {
              if (rule.series === undefined) return rule
              const key = snapshot.series.find((series) => series.index === rule.series)?.dataKey
              const at = key === undefined ? -1 : order.indexOf(key)
              return at < 0 ? rule : { ...rule, series: at }
            }),
          },
        }),
    })
  }
}
