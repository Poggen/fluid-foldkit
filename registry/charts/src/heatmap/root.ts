import { HeatmapHost } from './host'
import { HeatmapCells, HeatmapXAxis, HeatmapYAxis } from './carriers'
import { heatmapContext } from './context-value'
import { Option } from 'effect'
import { inertHtml as h } from 'foldkit/html'
import { defineHeatmapRecipe } from './block'
import type { HeatmapInputs } from './block'
import type { HeatmapChartProps } from './options'
import type { HeatmapColumn } from './columns'

export const HeatmapChartLoading: (props: HeatmapChartLoadingProps) => HeatmapChartProps =
  function HeatmapChartLoading(props: HeatmapChartLoadingProps) {
    const loading: HeatmapChartProps = {
      data: generateHeatmapSkeletonFromTarget([...props.data]),
      gap: props.gap ?? 2,
      className: props.className ?? '',
      status: 'loading',
      loadingLabel: props.label ?? 'Loading',
      children: [
        HeatmapCells({ cornerRadius: props.cornerRadius ?? 2, interactive: false }),
        HeatmapXAxis(),
        HeatmapYAxis(),
      ],
    }

    const withDomain: HeatmapChartProps =
      props.xDomain === undefined
        ? loading
        : { ...loading, xDomain: [props.xDomain[0], props.xDomain[1]] }

    return props.margin === undefined ? withDomain : { ...withDomain, margin: props.margin }
  }

const generateHeatmapSkeletonFromTarget: (
  data: ReadonlyArray<HeatmapColumn>,
) => Array<HeatmapColumn> = (data: ReadonlyArray<HeatmapColumn>) =>
  data.map((column) => ({
    bin: column.bin,
    bins: column.bins.map((bin) => ({ ...bin, count: 0 })),
  }))

export function HeatmapChart({ name }: { readonly name: string }) {
  const recipe = defineHeatmapRecipe(name)
  const inputs: (
    id: string,
    props: HeatmapChartProps,
  ) => HeatmapInputs<HeatmapChartProps['data'][number]> = (id: string, props: HeatmapChartProps) =>
    ({
      layout: 'contents',
      mount: (
        element,
        data,
        focus,
        level,
        observe,
        clock,
        observeSize,
        currentDate,
        entered,
        observeEntered,
        observeReplay,
      ) =>
        new HeatmapHost(
          element,
          props,
          id,
          data,
          focus,
          level,
          observe,
          clock,
          observeSize,
          currentDate,
          entered,
          observeEntered,
          observeReplay,
        ),
      configure: (host) => {
        if (!(host instanceof HeatmapHost)) {
          throw new TypeError('Heatmap requires its native host')
        }

        host.configure(props)
      },
      customContent: () => h.empty,
      serverContent: () => {
        return h.div([
          h.DataAttribute('bkm-chart', 'heatmap'),
          h.Class(
            [
              'relative w-full',
              props.aspectRatio === undefined ? '' : '[aspect-ratio:var(--bkm-heatmap-aspect)]!',
              props.className ?? '',
            ]
              .filter(Boolean)
              .join(' '),
          ),
          h.Style(
            props.aspectRatio === undefined
              ? {}
              : { '--bkm-heatmap-aspect': String(props.aspectRatio) },
          ),
        ])
      },
    }) satisfies HeatmapInputs<HeatmapChartProps['data'][number]>

  return {
    ...recipe,
    context: heatmapContext,
    configuration: () => ({ controlled: false, index: Option.none<number>() }),
    inputs,
  }
}

export interface HeatmapChartLoadingProps {
  readonly data: ReadonlyArray<HeatmapColumn>
  readonly xDomain?: readonly [Date, Date]
  readonly margin?: HeatmapChartProps['margin']
  readonly gap?: number
  readonly cornerRadius?: number
  readonly label?: string
  readonly className?: string
}
