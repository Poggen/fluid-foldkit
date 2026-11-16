import { familyResourceElements, timeSeriesRoot } from './family-root'
import { createSvgChartRenderer } from '@tanstack/charts/svg/renderer'
import { sourceGridView } from './grid-mask'
import { scatterPaintView } from '../scatter/paint'
import { inertHtml } from 'foldkit/html'
import type { CartesianSnapshot, CartesianCompilationOptions } from './definition'
import type { TimeSeriesCompiler } from './time-series-domain-resource'
import { containerOptions } from './container-options'
import { constVoid } from 'effect/Function'
import type { CandlestickContext } from './chart-view-context'
import { referenceAreaResources } from './reference-area'
import type { ChartContainerRef, ChartContextRenderer } from './chart-context'
import { projectTimeSeriesViewContext } from './chart-view-context'
import { backgroundResources } from './background'
import { patternResources, scopeCartesianPatternLayers } from '../kit/pattern/layers'
import { patternResourceView } from '../kit/pattern/resources'
import { useChartConfig, useStaticChartPreview } from './chart-config'
import type { ChartRowSchema } from './data-boundary'
import { mergeTooltipCarriers } from './tooltip-carriers'
import { Predicate, Option, DateTime } from 'effect'
import { defineCartesianBlock } from './block'
import type { CartesianViewInputs } from './block'
import { buildTimeSeriesDefinition } from './definition'
import { timeSeriesChartPhase, loadingFlags, loadingWipe, initialInteraction } from './state'
import type { Configuration, Interaction } from './state'
import type { TimeSeriesProps } from './root-options'
import { mountTimeSeriesResource } from './time-series-resource'
import { toDate, resolveSeries } from './series'
import { cartesianServerView } from './server-view'
import { bklitSurfaceStyle, parseAspectRatio } from './style'
import { tooltipView } from './tooltip-view'
import { seriesValueOf } from './domains'

const defaultAriaLabels = {
  line: 'Line chart',
  area: 'Area chart',
  candlestick: 'Candlestick chart',
  scatter: 'Scatter chart',
}

function initialMotion(
  family: keyof typeof defaultAriaLabels,
): Pick<CartesianViewInputs<never>, 'motion'> {
  if (family === 'candlestick') {
    return { motion: { initial: 'always', duration: 'configuration' } }
  }

  if (family === 'scatter') {
    return { motion: { initial: 'always', duration: 500 } }
  }

  return {}
}

function baseCompilationOptions<Row>(
  props: TimeSeriesProps<Row>,
  id: string,
  x: (row: Row) => Date,
): CartesianCompilationOptions<Row> {
  let options: CartesianCompilationOptions<Row> = {
    id,
    x,
    children: props.children,
    tooltipSpring: useChartConfig(props.environment).tooltipSpring,
  }

  if (props.margin !== undefined) {
    options = { ...options, margin: props.margin }
  }

  if (props.yDomain !== undefined) {
    options = { ...options, yDomain: props.yDomain }
  }

  return options
}

function interactionCompilationOptions<Row>(
  options: CartesianCompilationOptions<Row>,
  props: TimeSeriesProps<Row>,
  state: Interaction,
): CartesianCompilationOptions<Row> {
  let compilation = options

  if (Option.isSome(state.brush)) {
    compilation = {
      ...compilation,
      xDomain: [
        DateTime.toDateUtc(DateTime.makeUnsafe(state.brush.value.start)),
        DateTime.toDateUtc(DateTime.makeUnsafe(state.brush.value.end)),
      ],
    }
  } else if (props.xDomain !== undefined) {
    compilation = { ...compilation, xDomain: props.xDomain }
  }

  if (state.updateStep !== 'none') {
    compilation = { ...compilation, updateStep: state.updateStep }
  }

  if (state.updateStep === 'snap') {
    compilation = { ...compilation, yDomainFrom: state.yDomainFrom }
  }

  return compilation
}

export function timeSeriesConfiguration<Row>(props: TimeSeriesProps<Row>): Configuration {
  return {
    status: props.status ?? 'ready',
    animationDuration: useStaticChartPreview(props.environment)
      ? 0
      : (props.animationDuration ?? 1100),
    yDomainTween: props.yDomainTween !== false,
    yDomainTweenDuration: props.yDomainTweenDuration ?? 500,
    revealSignature: props.revealSignature ?? '',
  }
}

export type TimeSeriesViewInputs<Row> = CartesianViewInputs<Row> & {
  readonly withRenderContext: (renderer: ChartContextRenderer<Row>) => CartesianViewInputs<Row>
}

export function cartesianInputs<Row extends Readonly<Record<string, unknown>>>(
  family: 'line' | 'area' | 'scatter' | CandlestickContext<Row>,
  id: string,
  publicProps: TimeSeriesProps<Row>,
  customCompile?: TimeSeriesCompiler<Row>,
  rootOwner: 'family' | 'drawing' = 'family',
): TimeSeriesViewInputs<Row> {
  const familyKind = Predicate.isString(family) ? family : family.kind

  const patterns = [
    ...patternResources(publicProps.children),
    ...backgroundResources(publicProps.children),
    ...(familyKind === 'scatter'
      ? []
      : referenceAreaResources(publicProps.children, {
          top: 40,
          right: 40,
          bottom: 40,
          left: 40,
          ...publicProps.margin,
        })),
  ]

  const props = {
    ...publicProps,
    children: scopeCartesianPatternLayers(publicProps.children, id, patterns),
  }

  const tooltip = mergeTooltipCarriers(props.children)

  const x =
    familyKind === 'candlestick' || familyKind === 'scatter'
      ? (row: Row) => toDate(row[props.xDataKey ?? 'date'])
      : (props.x ?? ((row: Row) => toDate(row[props.xDataKey ?? 'date'])))

  const compile: TimeSeriesCompiler<Row> =
    customCompile ??
    ((data, state, draw, clock, domainFrame, presentationProps = props, tooltipExtension) => {
      const sourceX =
        presentationProps.x ?? ((row: Row) => toDate(row[presentationProps.xDataKey ?? 'date']))

      const sourceTooltip = mergeTooltipCarriers(presentationProps.children)
      let options = baseCompilationOptions(presentationProps, id, sourceX)

      options = interactionCompilationOptions(options, presentationProps, state)
      options = {
        ...options,
        skeletonRows: loadingFlags(state.phase).skeletonRows,
        chartLoading: loadingFlags(state.phase).chartLoading,
        gridLoading: loadingFlags(state.phase).gridLoading,
        animationDuration: state.configuration.animationDuration,
        wipe: loadingWipe(
          state.phase,
          state.phase === 'ready' && state.revealReady ? 0 : state.configuration.animationDuration,
        ),
        clock,
        sourceHover: true,
        physicalReveal:
          domainFrame !== undefined && (familyKind === 'line' || familyKind === 'area'),
      }

      if (sourceTooltip !== undefined && tooltipExtension !== undefined) {
        options = { ...options, tooltipExtension }
      }

      if (domainFrame !== undefined) {
        options = { ...options, domainFrame }
      }

      return buildTimeSeriesDefinition(data, { ...options, onBuilt: draw })
    })

  const aspectRatio = parseAspectRatio(props.aspectRatio)
  const styleHeight = Predicate.isNumber(props.style?.height) ? props.style.height : undefined

  const definitionRevision = Symbol(id)
  const definition: CartesianViewInputs<Row>['definition'] = (data, tooltipExtension) =>
    customCompile === undefined
      ? buildTimeSeriesDefinition(data, {
          ...baseCompilationOptions(props, id, x),
          ...(tooltipExtension === undefined ? {} : { tooltipExtension }),
          sourceHover: true,
        })
      : customCompile(
          data,
          initialInteraction(timeSeriesConfiguration(props)),
          constVoid,
          () => 0,
          undefined,
          undefined,
          tooltipExtension,
        )

  const resourceDefinition: CartesianViewInputs<Row>['resourceDefinition'] = (
    data,
    state,
    draw,
    clock,
    tooltipExtension,
  ) => compile(data, state, draw, clock, undefined, undefined, tooltipExtension)

  const makeInputs = (
    renderer: TimeSeriesProps<Row>['renderContext'],
  ): CartesianViewInputs<Row> => {
    const effectiveProps = renderer === undefined ? props : { ...props, renderContext: renderer }
    const containerRef: ChartContainerRef = { current: null }
    const context = projectTimeSeriesViewContext(effectiveProps, x, containerRef, family)

    return {
      ...(rootOwner === 'family' ? { familyRoot: timeSeriesRoot(props) } : {}),
      fontMetricsCoverage:
        renderer === undefined && customCompile === undefined ? 'complete' : 'unknown',
      definitionRevision,
      tooltip: { id: `${id}-tooltip`, horizontalBars: false },
      resources: patternResourceView(
        id,
        patterns,
        [],
        rootOwner === 'family' ? {} : { ...bklitSurfaceStyle, ...props.style },
      ),
      observeContainer: (element) => {
        containerRef.current = element
      },
      renderContext: (h, data, index, state, capabilities, isClient) =>
        renderer?.(
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
      sourceOf: (row) => row,
      ...initialMotion(familyKind),
      rebuildOnClock: familyKind === 'scatter',
      renderContent: (data, index, state) =>
        tooltipView(
          `${id}-tooltip`,
          data,
          index,
          tooltip,
          (row) =>
            resolveSeries(props.children)
              .filter((series) => series.kind !== 'pattern')
              .flatMap((series) => {
                const value = seriesValueOf(series.kind)(row[series.dataKey])

                return series.kind !== 'line' && !Number.isFinite(value)
                  ? []
                  : [{ color: series.stroke, label: series.dataKey, value }]
              }),
          x,
          state.revealReady && state.phase === 'ready',
        ),
      serverContent: (data, state) => {
        let snapshot: CartesianSnapshot<Row> | undefined

        const definition = compile(
          data,
          state,
          (next) => {
            snapshot = next
          },
          () => 0,
        )

        const paint = cartesianServerView(
          definition,
          props.width ?? 640,
          props.height ?? styleHeight ?? (props.width ?? 640) / aspectRatio,
          id,
          props.ariaLabel ?? defaultAriaLabels[familyKind],
          () =>
            snapshot?.sourceGrid === undefined
              ? inertHtml.empty
              : inertHtml.div(
                  [inertHtml.Class('contents')],
                  [
                    sourceGridView(snapshot.sourceGrid),
                    scatterPaintView(snapshot.scatterPaint),
                    ...(snapshot.candleGeometry === undefined
                      ? []
                      : [inertHtml.style([], [snapshot.candleGeometry.css])]),
                  ],
                ),
          rootOwner === 'family' ? {} : { ...bklitSurfaceStyle, ...props.style },
          familyKind === 'scatter' ? createSvgChartRenderer<Row, Date, number>() : undefined,
        )

        return familyKind === 'candlestick'
          ? inertHtml.div(
              [
                inertHtml.Class(
                  String.raw`contents bkm-candle-server [&_.ts-chart\_\_marks]:[clip-path:inset(0)_view-box]`,
                ),
              ],
              [paint],
            )
          : paint
      },
      ariaLabel: props.ariaLabel ?? defaultAriaLabels[familyKind],
      ...containerOptions(props),
      aspectRatio,
      fillHeight: props.style?.aspectRatio === 'unset' || props.style?.height !== undefined,
      definition,
      resourceDefinition,
      configureResource: (resource) => {
        if (resource.configure === undefined) {
          return false
        }

        resource.configure(effectiveProps)

        return true
      },
      createResource: (element, observe, clock) => {
        if (familyKind === 'scatter') {
          return mountTimeSeriesResource(
            rootOwner === 'family'
              ? familyResourceElements(element, id)
              : { drawingHost: element, visualRoot: undefined },
            observe,
            effectiveProps,
            id,
            clock,
            {
              modelViewport: customCompile === undefined ? 'RenderContext' : 'Always',
              phaseOf: (state) => {
                if (!state.phaseClockReady) {
                  return null
                }

                return state.revealReady ? 'ready' : 'revealing'
              },
              notifyOnCallbackChange: false,
            },
          )
        }

        if (customCompile === undefined && (familyKind === 'area' || familyKind === 'line')) {
          return mountTimeSeriesResource(
            rootOwner === 'family'
              ? familyResourceElements(element, id)
              : { drawingHost: element, visualRoot: undefined },
            observe,
            effectiveProps,
            id,
            clock,
            {
              modelViewport: customCompile === undefined ? 'RenderContext' : 'Always',
              compile,
              phaseOf: timeSeriesChartPhase,
            },
          )
        }

        return mountTimeSeriesResource(
          rootOwner === 'family'
            ? familyResourceElements(element, id)
            : { drawingHost: element, visualRoot: undefined },
          observe,
          effectiveProps,
          id,
          clock,
          {
            modelViewport: customCompile === undefined ? 'RenderContext' : 'Always',
          },
        )
      },
    }
  }

  return {
    ...makeInputs(props.renderContext),
    withRenderContext: (renderer) => makeInputs(renderer),
  }
}

/** A native root descriptor keeps caller Row schemas on the actual checked Block and its Binding operations. */
function makeRoot<
  RowSchema extends ChartRowSchema & { readonly Type: Readonly<Record<string, unknown>> },
>(family: 'line' | 'area', options: { readonly name: string; readonly Row: RowSchema }) {
  const recipe = defineCartesianBlock({
    ...options,
    selectionHover: 'clear',
    pointerScheduling: 'host-frame',
    restartOnMount: true,
  })

  return {
    ...recipe,
    inputs: (id: string, props: TimeSeriesProps<RowSchema['Type']>) =>
      cartesianInputs(family, id, props),
    configuration: (props: TimeSeriesProps<RowSchema['Type']>) => timeSeriesConfiguration(props),
  }
}

export const LineChart = <
  RowSchema extends ChartRowSchema & { readonly Type: Readonly<Record<string, unknown>> },
>(options: {
  readonly name: string
  readonly Row: RowSchema
}) => makeRoot('line', options)

export const AreaChart = <
  RowSchema extends ChartRowSchema & { readonly Type: Readonly<Record<string, unknown>> },
>(options: {
  readonly name: string
  readonly Row: RowSchema
}) => makeRoot('area', options)
