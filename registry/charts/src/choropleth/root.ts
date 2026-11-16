import { inertHtml as h } from 'foldkit/html'
import type { Html } from 'foldkit/html'
import { contentChildren } from './content'
import { createChartRuntime } from '@tanstack/charts/runtime'
import { renderChartSvg } from '@tanstack/charts/svg'
import { choroplethRecipe } from './block'
import type { State, Inputs } from './block'
import { ChoroplethHost, choroplethPlan } from './host'
import { createGeoGeometry } from './focus'
import type { ProjectionHolder } from './focus'
import { createDefinition } from './definition'
import { choroplethContext } from './context'
import type { ChoroplethActions } from './context'
import type { ChoroplethChartProps, ChoroplethContextValue, ChoroplethFeature } from './types'
import { identityMatrix } from './zoom'
import type { ChoroplethZoomInstance, TransformMatrix } from './zoom'
import { resourceHtml, scopePatterns } from './resources'
import { TooltipPanel } from '../cartesian/tooltip-primitives'
import { TooltipContent } from '../cartesian/tooltip-view'
import { ratio } from '../sankey/host'

export function choroplethZoom<Action>(
  props: ChoroplethChartProps,
  state: State,
  actions: ChoroplethActions<Action>,
) {
  if (props.zoomEnabled !== true) {
    return { zoom: null }
  }

  const initial = props.initialZoom ?? identityMatrix()
  const k = state.scale
  const x = state.translateX
  const y = state.translateY

  const set = (matrix: TransformMatrix) =>
    actions.transform(matrix.scaleX, matrix.translateX, matrix.translateY)

  const center = { x: state.width / 2, y: state.height / 2 }

  const zoom: ChoroplethZoomInstance<Action> = {
    transformMatrix: { scaleX: k, scaleY: k, translateX: x, translateY: y, skewX: 0, skewY: 0 },
    initialTransformMatrix: initial,
    isDragging: state.dragging,
    scale: ({ scaleX, point = center }) => {
      const next = Math.max(props.zoomMin ?? 0.5, Math.min(props.zoomMax ?? 4, k * scaleX))

      return actions.transform(
        next,
        point.x - ((point.x - x) / k) * next,
        point.y - ((point.y - y) / k) * next,
      )
    },
    translate: ({ translateX, translateY }) => actions.transform(k, x + translateX, y + translateY),
    translateTo: (point) => actions.transform(k, center.x - point.x * k, center.y - point.y * k),
    setTransformMatrix: set,
    reset: () => set(initial),
    center: () => set(identityMatrix()),
    clear: () => set(identityMatrix()),
    applyToPoint: (point) => ({ x: point.x * k + x, y: point.y * k + y }),
    applyInverseToPoint: (point) => ({ x: (point.x - x) / k, y: (point.y - y) / k }),
    toString: () => `matrix(${k}, 0, 0, ${k}, ${x}, ${y})`,
  }

  return { zoom }
}

export const useChoroplethZoom = <Action>(context: {
  readonly zoom: ChoroplethZoomInstance<Action> | null
}) => context

export function choroplethTooltip(props: ChoroplethChartProps, state: State): Html {
  const config = choroplethPlan(props).tooltip
  const index = state.hoveredIndex
  const feature = index === null ? undefined : props.data.features.at(index)

  if (config === undefined || feature === undefined || index === null) {
    return h.empty
  }

  const value = config.getFeatureValue?.(feature, index)

  const format =
    config.formatValue ??
    ((reading: number) =>
      new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(reading))

  const panel: Parameters<typeof TooltipPanel>[0] = {
    children:
      config.content === undefined
        ? TooltipContent({
            title:
              config.getFeatureName?.(feature, index) ??
              feature.properties?.name ??
              `Feature ${index}`,
            rows:
              value === undefined
                ? []
                : [
                    {
                      color: 'var(--chart-1)',
                      label: config.valueLabel ?? 'Value',
                      value: format(value),
                    },
                  ],
          })
        : contentChildren(config.content({ feature, index })),
  }

  const background =
    config.backgroundColor === undefined
      ? panel
      : { ...panel, backgroundColor: config.backgroundColor }

  const styled =
    config.panelStyle === undefined ? background : { ...background, panelStyle: config.panelStyle }

  return TooltipPanel(
    config.className === undefined ? styled : { ...styled, className: config.className },
  )
}

export function choroplethServer(props: ChoroplethChartProps, state: State): Html {
  const { feature, tooltip, graticule, margin } = choroplethPlan(props)
  const width = state.width || 630
  const height = state.height || width / ratio(props.aspectRatio ?? '16 / 9')
  const initial = props.initialZoom ?? identityMatrix()

  const holder: ProjectionHolder = {
    projection: undefined,
    transform: { k: initial.scaleX, x: initial.translateX, y: initial.translateY },
  }

  const geometry = createGeoGeometry(holder)
  const runtime = createChartRuntime<ChoroplethFeature, number, number>()

  let svg = ''

  try {
    const definition = createDefinition({
      tooltipId: `${state.id}-tooltip`,
      data: props.data,
      margin,
      center: props.center ?? [0, 20],
      scale: props.scale,
      translate: props.translate,
      holder,
      geometry,
      patternPrefix: `${state.id}-`,
      featureConfig: feature,
      graticuleConfig: graticule,
      tooltipConfig: tooltip,
    })

    svg = renderChartSvg(runtime.render(definition, { width, height }), {
      idPrefix: state.id,
      ariaLabel: props.ariaLabel ?? 'Choropleth chart',
    })
  } finally {
    runtime.destroy()
  }

  return h.div(
    [
      h.DataAttribute('bkm-chart', 'choropleth'),
      h.Class([props.className ?? ''].filter(Boolean).join(' ')),
      h.Attribute(
        'style',
        `--bkm-zk:${initial.scaleX};--bkm-zx:${initial.translateX}px;--bkm-zy:${initial.translateY}px;position:relative;width:100%;overflow:hidden;aspect-ratio:${props.aspectRatio ?? '16 / 9'}`,
      ),
    ],
    [
      h.div([h.InnerHTML(svg)]),
      ...(feature?.patterns === undefined
        ? []
        : [
            h.svg(
              [h.Class('[width:0] [height:0] absolute'), h.AriaHidden(true)],
              [h.defs([], scopePatterns(feature.patterns, `${state.id}-`).map(resourceHtml))],
            ),
          ]),
    ],
  )
}

export interface ChoroplethChartRecipe extends ReturnType<typeof choroplethRecipe> {
  readonly configuration: (props: ChoroplethChartProps) => {
    readonly scale: number
    readonly translateX: number
    readonly translateY: number
  }
  readonly context: typeof choroplethContext
  readonly zoom: typeof choroplethZoom
  readonly inputs: <Action>(
    id: string,
    props: ChoroplethChartProps,
    actions: ChoroplethActions<Action>,
    render?: (
      context: ChoroplethContextValue<Action>,
      zoom: { readonly zoom: ChoroplethZoomInstance<Action> | null },
    ) => Html,
  ) => Inputs
}

export function ChoroplethChart({ name }: { readonly name: string }): ChoroplethChartRecipe {
  const { namespace, contract, plans } = choroplethRecipe(name)

  return {
    namespace,
    contract,
    plans,
    configuration: (props: ChoroplethChartProps) => ({
      scale: props.initialZoom?.scaleX ?? 1,
      translateX: props.initialZoom?.translateX ?? 0,
      translateY: props.initialZoom?.translateY ?? 0,
    }),
    context: choroplethContext,
    zoom: choroplethZoom,
    inputs: <Action>(
      id: string,
      props: ChoroplethChartProps,
      actions: ChoroplethActions<Action>,
      render?: (
        context: ChoroplethContextValue<Action>,
        zoom: { readonly zoom: ChoroplethZoomInstance<Action> | null },
      ) => Html,
    ): Inputs => {
      let root: HTMLDivElement | null = null

      return {
        mount: (element, state, observe) => {
          const host = new ChoroplethHost(element, state, props, observe)
          const { root: hostRoot } = host
          root = hostRoot

          return host
        },
        configure: (host) => {
          if (!(host instanceof ChoroplethHost)) {
            throw new TypeError('Choropleth native host required')
          }

          host.configure(props)
        },
        server: (state) => choroplethServer(props, state),
        content: (state) => [
          h.div(
            [
              h.Id(`${id}-tooltip`),
              h.Class('ts-chart-tooltip'),
              h.Hidden(choroplethPlan(props).tooltip === undefined),
            ],
            [
              h.div(
                [
                  h.Class(
                    'ts-chart-tooltip__body min-w-[140px] overflow-hidden rounded-lg text-chart-tooltip-foreground shadow-lg bg-chart-tooltip-background backdrop-blur-md',
                  ),
                  h.DataAttribute(
                    'bkm-tooltip-body-key',
                    choroplethPlan(props).tooltip === undefined || state.hoveredIndex === null
                      ? 'none'
                      : `feature:${state.hoveredIndex}`,
                  ),
                ],
                [choroplethTooltip(props, state)],
              ),
            ],
          ),
          render?.(
            choroplethContext(props, state, actions, root),
            choroplethZoom(props, state, actions),
          ) ?? h.empty,
        ],
      }
    },
  }
}
