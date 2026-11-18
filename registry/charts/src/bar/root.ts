import { cartesianCssScope } from '../cartesian/css-scope'
import { barCategoryXAxisView } from './category-x-axis'
import { pulseClipView } from './pulse-clips'
import { inertHtml } from 'foldkit/html'
import { containerOptions } from '../cartesian/container-options'
import { barViewport, projectBarViewContext } from './view-context'
import type { ChartContainerRef } from '../cartesian/chart-context'
import { Option } from 'effect'
import { patternResources, scopeBarPatternLayers } from '../kit/pattern/layers'
import { patternResourceView } from '../kit/pattern/resources'
import type { ChartRowSchema } from '../cartesian/data-boundary'
import { defineCartesianBlock } from '../cartesian/block'
import type { CartesianViewInputs } from '../cartesian/block'
import { initialInteraction } from '../cartesian/state'
import type { Configuration, Interaction } from '../cartesian/state'
import { cartesianServerView } from '../cartesian/server-view'
import { bklitSurfaceStyle, parseAspectRatio } from '../cartesian/style'
import { buildBarDefinition } from './definition'
import type { BarSnapshot, BarValue } from './definition'
import { resolveBarSeries, flattenBarLayers } from './model'
import type { BarDatum } from './model'
import type { BarChartProps } from './options'
import { mergeTooltipCarriers } from '../cartesian/tooltip-carriers'
import { tooltipView } from '../cartesian/tooltip-view'
import { toNumber } from '../cartesian/domains'
import { mountBarResource } from './resource'
import { barServerSize } from './plot'
import { hasSquarePaints, squarePaintResources } from './square-paints'

export const barConfiguration: <Row>(props: BarChartProps<Row>) => Configuration =
  function barConfiguration<Row>(props: BarChartProps<Row>) {
    return {
      status: props.status ?? 'ready',
      animationDuration: props.animationDuration ?? 1100,
      yDomainTween: false,
      yDomainTweenDuration: 500,
      revealSignature: props.revealSignature ?? '',
    } satisfies Configuration
  }

export function BarChart<
  RowSchema extends ChartRowSchema & { readonly Type: Readonly<Record<string, unknown>> },
>(options: { readonly name: string; readonly Row: RowSchema }) {
  type Row = RowSchema['Type']

  const recipe = defineCartesianBlock<
    RowSchema,
    BarDatum<Row>,
    BarValue,
    BarValue,
    BarSnapshot<Row>,
    BarChartProps<Row>
  >({
    ...options,
    statusTransition: 'instant',
    restartOnMount: true,
  })
  const inputs: (
    id: string,
    publicProps: BarChartProps<Row>,
  ) => CartesianViewInputs<
    Row,
    BarDatum<Row>,
    BarValue,
    BarValue,
    BarSnapshot<Row>,
    BarChartProps<Row>
  > = (id: string, publicProps: BarChartProps<Row>) => {
    const patterns = patternResources(publicProps.children)

    const props = {
      ...publicProps,
      children: flattenBarLayers(scopeBarPatternLayers(publicProps.children, id, patterns)),
    }

    const tooltip = mergeTooltipCarriers(
      props.children.filter(
        (child) =>
          child.kind === 'tooltip' ||
          child.kind === 'tooltipDot' ||
          child.kind === 'tooltipIndicator',
      ),
    )

    const containerRef: ChartContainerRef = { current: null }

    const context =
      props.renderContext === undefined ? undefined : projectBarViewContext(props, containerRef)

    const ariaLabel = props.ariaLabel ?? 'Bar chart'
    const aspectRatio = parseAspectRatio(props.aspectRatio)
    const squarePaints = hasSquarePaints(props)

    const fallbackViewport = (data: ReadonlyArray<Row>) =>
      barViewport({
        ...barServerSize(props),
        data,
        margin: { top: 40, right: 40, bottom: 40, left: 40, ...props.margin },
      })

    const viewportFor = (data: ReadonlyArray<Row>, state: Interaction) =>
      Option.getOrElse(state.viewport, () => fallbackViewport(data))

    return {
      fontMetricsCoverage: props.renderContext === undefined ? 'complete' : 'unknown',
      definitionRevision: Symbol(id),
      resources: patternResourceView(id, patterns, [], { ...bklitSurfaceStyle, ...props.style }),
      observeContainer: (element) => {
        containerRef.current = element
      },
      renderContext: (h, data, index, state, capabilities, isClient) => {
        const custom =
          context === undefined
            ? h.empty
            : (props.renderContext?.(
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
              ) ?? h.empty)

        if (!squarePaints) {
          return custom
        }

        const resources = squarePaintResources(id, data, props, viewportFor(data, state))

        return context === undefined ? resources : h.div([h.Class('contents')], [resources, custom])
      },
      renderContent: (data, index, state) =>
        tooltipView(
          `${id}-tooltip`,
          data,
          index,
          tooltip,
          (row) =>
            resolveBarSeries(props.children)
              .filter(
                (item) =>
                  props.missingValues !== 'gap' ||
                  (row[item.key] !== null && row[item.key] !== undefined),
              )
              .map((item) => {
                const stroke = (item.bar ?? item.squares)?.stroke
                const color = stroke === undefined || stroke === '' ? item.fill : stroke

                return {
                  color: color === '' ? 'var(--chart-line-primary)' : color,
                  label: item.key,
                  value: toNumber(row[item.key]),
                }
              })
              .filter(
                (tooltipRow) => props.missingValues !== 'gap' || Number.isFinite(tooltipRow.value),
              ),
          (row) => String(row[props.xDataKey ?? 'name']),
          state.revealReady && state.configuration.status === 'ready',
        ),
      sourceOf: (datum) => datum.source,
      seriesIndexOf: (datum) => datum.seriesIndex,
      rebuildOnClock: true,
      motion: { initial: 'always', duration: 'configuration' },
      tooltip: { id: `${id}-tooltip`, horizontalBars: props.orientation === 'horizontal' },
      definition: (data, tooltipExtension) =>
        buildBarDefinition(data, {
          id,
          ...(tooltipExtension === undefined ? {} : { tooltipExtension }),
          props,
          state: initialInteraction(barConfiguration(props)),
        }),
      resourceDefinition: (data, state, onBuilt, clock, tooltipExtension) =>
        buildBarDefinition(data, {
          id,
          ...(tooltipExtension === undefined ? {} : { tooltipExtension }),
          props,
          state,
          onBuilt,
          clock,
        }),
      configureResource: (resource) => {
        if (resource.configure === undefined) {
          return false
        }

        resource.configure(props)

        return true
      },
      createResource: (element, observe, clock) =>
        mountBarResource(element, observe, props, id, clock),
      serverContent: (data, state, focusedIndex = null) => {
        const viewport = squarePaints ? viewportFor(data, state) : fallbackViewport(data)

        let snapshot: BarSnapshot<Row> | undefined

        const definition = buildBarDefinition(data, {
          id,
          props,
          state,
          onBuilt: (next) => {
            snapshot = next
          },
        })

        const paint = cartesianServerView(
          definition,
          viewport.width,
          viewport.height,
          id,
          ariaLabel,
          () =>
            inertHtml.div(
              [inertHtml.Class('contents')],
              [
                inertHtml.style([], [snapshot?.frontCss ?? '']),
                barCategoryXAxisView(
                  snapshot,
                  props,
                  state.revealReady && state.configuration.status === 'ready' ? focusedIndex : null,
                ),
                pulseClipView(id, snapshot?.pulseClips ?? []),
              ],
            ),
          { ...bklitSurfaceStyle, ...props.style },
        )

        return inertHtml.div(
          [
            inertHtml.Class(
              [
                'contents',
                [`bkm-bar-server ${cartesianCssScope(id).className}`].filter(Boolean).join(' '),
              ]
                .filter(Boolean)
                .join(' '),
            ),
            inertHtml.DataAttribute('bkm-kit', id),
            inertHtml.DataAttribute('bkm-bar', ''),
          ],
          [paint],
        )
      },
      ariaLabel,
      ...containerOptions(props),
      aspectRatio,
      fillHeight: props.style?.aspectRatio === 'unset' || props.style?.height !== undefined,
    } satisfies CartesianViewInputs<
      Row,
      BarDatum<Row>,
      BarValue,
      BarValue,
      BarSnapshot<Row>,
      BarChartProps<Row>
    >
  }

  return {
    ...recipe,
    configuration: barConfiguration<Row>,
    inputs,
  }
}
